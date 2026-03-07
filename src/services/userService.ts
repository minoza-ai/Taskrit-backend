import { User } from '../models/User';
import { User as IUser, SignupRequest, UpdateUserRequest } from '../types';
import { passwordUtil } from '../utils/password';
import { web3Util } from '../utils/web3';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  /**
   * 새로운 사용자 생성
   */
  async createUser(req: SignupRequest): Promise<IUser> {
    // 사용자 ID 중복 확인
    const existingUser = await User.findOne({ user_id: req.user_id });

    if (existingUser) {
      const error = new Error('User ID already exists');
      (error as any).statusCode = 409;
      throw error;
    }

    // 지갑 주소가 제공된 경우 중복 확인
    let normalizedWallet: string | null = null;
    if (req.wallet_address) {
      if (!web3Util.isValidAddress(req.wallet_address)) {
        const error = new Error('Invalid wallet address');
        (error as any).statusCode = 422;
        throw error;
      }

      normalizedWallet = web3Util.normalizeAddress(req.wallet_address);

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
      user_id: req.user_id,
      nickname: req.nickname,
      password: hashedPassword,
      wallet_address: normalizedWallet,
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
    const user = await User.findOne({
      user_id,
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
    if (!req.nickname && !req.password) {
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
    const user = await User.findOne({
      wallet_address: wallet_address.toLowerCase(),
      deleted_at: null,
    });

    return user ? this.formatUser(user) : null;
  }

  /**
   * 사용자에게 지갑 주소 연결
   */
  async connectWallet(user_uuid: string, wallet_address: string): Promise<void> {
    const normalizedWallet = web3Util.normalizeAddress(wallet_address);

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

  /**
   * 사용자 문서를 타입으로 변환
   */
  private formatUser(user: any): IUser {
    return {
      user_uuid: user.user_uuid,
      user_id: user.user_id,
      nickname: user.nickname,
      password: user.password,
      wallet_address: user.wallet_address,
      created_at: user.created_at,
      updated_at: user.updated_at,
      deleted_at: user.deleted_at,
    };
  }
}

export const userService = new UserService();

