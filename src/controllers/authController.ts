import { Response } from 'express';
import { RequestWithUser, AuthRequest, SignupRequest } from '../types';
import { userService } from '../services/userService';
import { jwtUtil } from '../utils/jwt';
import { rateLimitUtil } from '../utils/rateLimit';

export class AuthController {
  private static readonly USER_ID_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;
  private static readonly INVALID_USER_ID_ERROR = '사용할 수 없는 문자열이 포함되어 있습니다';

  private sanitizeUserId(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.replace(/\s+/g, '');
  }

  private isValidUserId(value: unknown): value is string {
    return typeof value === 'string' && AuthController.USER_ID_REGEX.test(value);
  }

  /**
   * 회원가입
   */
  async signup(req: RequestWithUser, res: Response): Promise<void> {
    try {
      // 🔍 First, validate the original input before sanitizing
      const originalUserId = req.body.user_id;
      
      if (!originalUserId || typeof originalUserId !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const sanitizedUserId = this.sanitizeUserId(originalUserId);

      // If sanitization removed all characters, it's invalid
      if (!sanitizedUserId) {
        res.status(422).json({ error: AuthController.INVALID_USER_ID_ERROR });
        return;
      }

      // Validate the sanitized user_id against the regex
      if (!this.isValidUserId(sanitizedUserId)) {
        res.status(422).json({ error: AuthController.INVALID_USER_ID_ERROR });
        return;
      }

      if (req.body.profile_bio !== undefined && typeof req.body.profile_bio !== 'string') {
        res.status(422).json({ error: 'profile_bio must be a string' });
        return;
      }

      const signupReq: SignupRequest = {
        user_id: sanitizedUserId,
        nickname: req.body.nickname,
        password: req.body.password,
        profile_bio: req.body.profile_bio,
        wallet_address: req.body.wallet_address,
      };

      // 필수 필드 검증
      if (!signupReq.nickname || !signupReq.password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await userService.createUser(signupReq);

      res.status(201).json({
        message: 'User created successfully',
        user_uuid: user.user_uuid,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';
      res.status(statusCode).json({ error: message });
    }
  }

  /**
   * 로그인
   */
  async login(req: RequestWithUser, res: Response): Promise<void> {
    try {
      // 🔍 First, validate the original input before sanitizing
      const originalUserId = req.body.user_id;
      
      if (!originalUserId || typeof originalUserId !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const sanitizedUserId = this.sanitizeUserId(originalUserId);

      // If sanitization removed all characters, it's invalid
      if (!sanitizedUserId) {
        res.status(422).json({ error: AuthController.INVALID_USER_ID_ERROR });
        return;
      }

      // Validate the sanitized user_id against the regex
      if (!this.isValidUserId(sanitizedUserId)) {
        res.status(422).json({ error: AuthController.INVALID_USER_ID_ERROR });
        return;
      }

      const authReq: AuthRequest = {
        user_id: sanitizedUserId,
        password: req.body.password,
      };
      const otpCode = typeof req.body.otp_code === 'string' ? req.body.otp_code.trim() : undefined;

      // 필수 필드 검증
      if (!authReq.password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }

      // Rate Limiting 체크 (로컬 개발 환경에서는 제한 없음)
      if (process.env.NODE_ENV !== 'development') {
        const limitCheck = rateLimitUtil.checkLimit(`login:${authReq.user_id}`);

        if (!limitCheck.allowed) {
          res.status(429).json({
            error: 'Too many login attempts. Please try again later.',
            lockedUntil: limitCheck.lockedUntil,
          });
          return;
        }
      }

      // 사용자 인증
      const user = await userService.authenticateUser(authReq.user_id, authReq.password);

      if (!user) {
        // 실패한 시도로 기록 (로컬 개발 환경에서는 제한 없음)
        if (process.env.NODE_ENV !== 'development') {
          rateLimitUtil.checkLimit(`login:${authReq.user_id}`);
        }

        res.status(401).json({ error: 'Invalid user_id or password' });
        return;
      }

      if (user.otp_enabled) {
        if (!otpCode) {
          res.status(401).json({ error: 'OTP code is required', otp_required: true });
          return;
        }

        const validOtp = userService.verifyOtpForUser(user, otpCode);
        if (!validOtp) {
          res.status(401).json({ error: 'Invalid OTP code', otp_required: true });
          return;
        }
      }

      // 성공 시 Rate Limit 초기화 (로컬 개발 환경에서는 제한 없음)
      if (process.env.NODE_ENV !== 'development') {
        rateLimitUtil.reset(`login:${authReq.user_id}`);
      }

      // 토큰 생성
      const tokens = jwtUtil.generateTokens({
        user_uuid: user.user_uuid,
        user_id: user.user_id,
      });

      res.status(200).json(tokens);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshToken(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({ error: 'refresh_token is required' });
        return;
      }

      const payload = jwtUtil.verifyRefreshToken(refresh_token);

      if (!payload) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      const tokens = jwtUtil.generateTokens({
        user_uuid: payload.user_uuid,
        user_id: payload.user_id,
      });

      res.status(200).json(tokens);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
