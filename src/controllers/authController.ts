import { Response } from 'express';
import { RequestWithUser, AuthRequest, SignupRequest } from '../types';
import { userService } from '../services/userService';
import { jwtUtil } from '../utils/jwt';
import { rateLimitUtil } from '../utils/rateLimit';

export class AuthController {
  /**
   * 회원가입
   */
  async signup(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const signupReq: SignupRequest = {
        user_id: req.body.user_id,
        nickname: req.body.nickname,
        password: req.body.password,
        wallet_address: req.body.wallet_address,
      };

      // 필수 필드 검증
      if (!signupReq.user_id || !signupReq.nickname || !signupReq.password) {
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
      const authReq: AuthRequest = {
        user_id: req.body.user_id,
        password: req.body.password,
      };

      // 필수 필드 검증
      if (!authReq.user_id || !authReq.password) {
        res.status(400).json({ error: 'Missing user_id or password' });
        return;
      }

      // Rate Limiting 체크
      const limitCheck = rateLimitUtil.checkLimit(`login:${authReq.user_id}`);

      if (!limitCheck.allowed) {
        res.status(429).json({
          error: 'Too many login attempts. Please try again later.',
          lockedUntil: limitCheck.lockedUntil,
        });
        return;
      }

      // 사용자 인증
      const user = await userService.authenticateUser(authReq.user_id, authReq.password);

      if (!user) {
        // 실패한 시도로 기록
        rateLimitUtil.checkLimit(`login:${authReq.user_id}`);

        res.status(401).json({ error: 'Invalid user_id or password' });
        return;
      }

      // 성공 시 Rate Limit 초기화
      rateLimitUtil.reset(`login:${authReq.user_id}`);

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
