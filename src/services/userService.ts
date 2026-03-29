import { User } from '../models/User';
import { User as IUser, SignupRequest, UpdateUserRequest } from '../types';
import { passwordUtil } from '../utils/password';
import { solanaUtil } from '../utils/solana';
import { otpUtil } from '../utils/otp';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  /**
   * 새로운 사용자 생성
   */
  async createUser(req: SignupRequest): Promise<IUser> {
    const sanitizedUserId = req.user_id.replace(/\s+/g, '');

    // 사용자 ID 중복 확인
    const existingUser = await User.findOne({ user_id: sanitizedUserId });

    if (existingUser) {
      const error = new Error('User ID already exists');
      (error as any).statusCode = 409;
      throw error;
    }

    // 지갑 주소가 제공된 경우 중복 확인
    let normalizedWallet: string | null = null;
    if (req.wallet_address) {
      if (!solanaUtil.isValidAddress(req.wallet_address)) {
        const error = new Error('Invalid wallet address');
        (error as any).statusCode = 422;
        throw error;
      }

      normalizedWallet = solanaUtil.normalizeAddress(req.wallet_address);

      const existingWallet = await User.findOne({ wallet_address: normalizedWallet });

      if (existingWallet) {
        const error = new Error('Wallet address already in use');
        (error as any).statusCode = 409;
        throw error;
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await passwordUtil.hash(req.password);

    // 사용자 생성
    const user_uuid = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const user = await User.create({
      user_uuid,
      user_id: sanitizedUserId,
      nickname: req.nickname,
      password: hashedPassword,
      profile_bio: '',
      capabilities: [],
      wallet_address: normalizedWallet,
      otp_enabled: false,
      otp_secret: null,
      otp_pending_secret: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return this.formatUser(user);
  }

  /**
   * 사용자 ID와 비밀번호로 사용자 조회
   */
  async authenticateUser(user_id: string, password: string): Promise<IUser | null> {
    const sanitizedUserId = user_id.replace(/\s+/g, '');

    const user = await User.findOne({
      user_id: sanitizedUserId,
      deleted_at: null,
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await passwordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return this.formatUser(user);
  }

  /**
   * UUID로 사용자 조회
   */
  async getUserByUuid(user_uuid: string): Promise<IUser | null> {
    const user = await User.findOne({
      user_uuid,
      deleted_at: null,
    });

    return user ? this.formatUser(user) : null;
  }

  /**
   * 사용자 정보 수정
   */
  async updateUser(user_uuid: string, req: UpdateUserRequest): Promise<IUser> {
    if (
      req.nickname === undefined
      && req.password === undefined
      && req.profile_bio === undefined
      && req.capabilities === undefined
    ) {
      const error = new Error('No fields to update');
      (error as any).statusCode = 400;
      throw error;
    }

    const update: any = {
      updated_at: Math.floor(Date.now() / 1000),
    };

    if (req.nickname) {
      update.nickname = req.nickname;
    }

    if (req.password) {
      update.password = await passwordUtil.hash(req.password);
    }

    if (req.profile_bio !== undefined) {
      const normalizedBio = req.profile_bio.trim();
      if (normalizedBio.length > 500) {
        const error = new Error('Profile bio must be 500 characters or less');
        (error as any).statusCode = 422;
        throw error;
      }
      update.profile_bio = normalizedBio;
    }

    if (req.capabilities !== undefined) {
      if (!Array.isArray(req.capabilities)) {
        const error = new Error('Capabilities must be an array of strings');
        (error as any).statusCode = 422;
        throw error;
      }

      const dedupe = new Set<string>();
      const normalizedCapabilities = req.capabilities
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
        .filter((item) => {
          const key = item.toLowerCase();
          if (dedupe.has(key)) return false;
          dedupe.add(key);
          return true;
        });

      if (normalizedCapabilities.length > 20) {
        const error = new Error('You can set up to 20 capabilities');
        (error as any).statusCode = 422;
        throw error;
      }

      if (normalizedCapabilities.some((item) => item.length > 30)) {
        const error = new Error('Each capability must be 30 characters or less');
        (error as any).statusCode = 422;
        throw error;
      }

      update.capabilities = normalizedCapabilities;
    }

    const user = await User.findOneAndUpdate(
      { user_uuid },
      update,
      { new: true }
    );

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return this.formatUser(user);
  }

  /**
   * 사용자 프로필 이미지 업데이트
   */
  async updateProfileImage(user_uuid: string, profile_image_url: string): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { user_uuid },
      { 
        $set: { 
          profile_image_url: profile_image_url,
          updated_at: Math.floor(Date.now() / 1000)
        } 
      },
      { new: true }
    );

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return this.formatUser(user);
  }

  /**
   * 사용자 삭제 (Soft Delete)
   */
  async deleteUser(user_uuid: string): Promise<void> {
    // 사용자가 실제로 존재하는지 확인
    const user = await User.findOne({ user_uuid });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // 이미 삭제된 사용자인지 확인
    if (user.deleted_at) {
      const error = new Error('User already deleted');
      (error as any).statusCode = 400;
      throw error;
    }

    // Soft Delete 수행
    await User.updateOne(
      { user_uuid },
      { deleted_at: Math.floor(Date.now() / 1000) }
    );
  }

  /**
   * 지갑 주소로 사용자 조회
   */
  async getUserByWallet(wallet_address: string): Promise<IUser | null> {
    const normalizedWallet = solanaUtil.normalizeAddress(wallet_address);
    if (!normalizedWallet) {
      return null;
    }

    const user = await User.findOne({
      wallet_address: normalizedWallet,
      deleted_at: null,
    });

    return user ? this.formatUser(user) : null;
  }

  /**
   * 사용자에게 지갑 주소 연결
   */
  async connectWallet(user_uuid: string, wallet_address: string): Promise<void> {
    const normalizedWallet = solanaUtil.normalizeAddress(wallet_address);

    if (!normalizedWallet) {
      const error = new Error('Invalid wallet address');
      (error as any).statusCode = 422;
      throw error;
    }

    // 다른 사용자에 이미 연결되어 있는지 확인
    const existingUser = await User.findOne({
      wallet_address: normalizedWallet,
      user_uuid: { $ne: user_uuid },
      deleted_at: null,
    });

    if (existingUser) {
      const error = new Error('Wallet address already connected to another account');
      (error as any).statusCode = 409;
      throw error;
    }

    await User.updateOne(
      { user_uuid },
      {
        wallet_address: normalizedWallet,
        updated_at: Math.floor(Date.now() / 1000),
      }
    );
  }

  /**
   * 사용자에게서 지갑 주소 연결 해제
   */
  async disconnectWallet(user_uuid: string): Promise<void> {
    await User.updateOne(
      { user_uuid },
      {
        wallet_address: null,
        updated_at: Math.floor(Date.now() / 1000),
      }
    );
  }

  async createOtpSetup(user_uuid: string): Promise<{ secret: string; otpauth_url: string; qr_code_data_url: string }> {
    const user = await User.findOne({ user_uuid, deleted_at: null });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const generated = otpUtil.generateSecret(user.user_id);
    const qrCodeDataUrl = await otpUtil.generateQrDataUrl(generated.otpauth_url);

    await User.updateOne(
      { user_uuid },
      {
        otp_pending_secret: generated.base32,
        updated_at: Math.floor(Date.now() / 1000),
      }
    );

    return {
      secret: generated.base32,
      otpauth_url: generated.otpauth_url,
      qr_code_data_url: qrCodeDataUrl,
    };
  }

  async getOtpStatus(user_uuid: string): Promise<{ otp_enabled: boolean; otp_pending: boolean }> {
    const user = await User.findOne({ user_uuid, deleted_at: null });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return {
      otp_enabled: !!user.otp_enabled,
      otp_pending: !!user.otp_pending_secret,
    };
  }

  async enableOtp(user_uuid: string, code: string): Promise<void> {
    const user = await User.findOne({ user_uuid, deleted_at: null });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (!user.otp_pending_secret) {
      const error = new Error('OTP setup is not initialized');
      (error as any).statusCode = 400;
      throw error;
    }

    if (!otpUtil.verifyToken(user.otp_pending_secret, code)) {
      const error = new Error('Invalid OTP code');
      (error as any).statusCode = 401;
      throw error;
    }

    await User.updateOne(
      { user_uuid },
      {
        otp_enabled: true,
        otp_secret: user.otp_pending_secret,
        otp_pending_secret: null,
        updated_at: Math.floor(Date.now() / 1000),
      }
    );
  }

  async disableOtp(user_uuid: string, code: string): Promise<void> {
    const user = await User.findOne({ user_uuid, deleted_at: null });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (!user.otp_enabled || !user.otp_secret) {
      const error = new Error('OTP is not enabled');
      (error as any).statusCode = 400;
      throw error;
    }

    if (!otpUtil.verifyToken(user.otp_secret, code)) {
      const error = new Error('Invalid OTP code');
      (error as any).statusCode = 401;
      throw error;
    }

    await User.updateOne(
      { user_uuid },
      {
        otp_enabled: false,
        otp_secret: null,
        otp_pending_secret: null,
        updated_at: Math.floor(Date.now() / 1000),
      }
    );
  }

  verifyOtpForUser(user: IUser, code?: string): boolean {
    if (!user.otp_enabled) {
      return true;
    }

    if (!user.otp_secret || !code) {
      return false;
    }

    return otpUtil.verifyToken(user.otp_secret, code);
  }

  /**
   * 사용자 문서를 타입으로 변환
   */
  private formatUser(user: any): IUser {
    return {
      user_uuid: user.user_uuid,
      user_id: user.user_id,
      nickname: user.nickname,
      password: user.password,
      profile_image_url: user.profile_image_url,
      profile_bio: user.profile_bio || '',
      capabilities: Array.isArray(user.capabilities) ? user.capabilities : [],
      wallet_address: user.wallet_address,
      otp_enabled: !!user.otp_enabled,
      otp_secret: user.otp_secret || null,
      otp_pending_secret: user.otp_pending_secret || null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      deleted_at: user.deleted_at,
    };
  }
}

export const userService = new UserService();

