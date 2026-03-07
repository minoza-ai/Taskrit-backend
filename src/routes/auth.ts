import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /user/register
 * 회원가입
 */
router.post('/register', (req, res) => authController.signup(req, res));

/**
 * POST /user/login
 * 로그인
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * POST /user/refresh
 * 토큰 갱신
 */
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

export default router;
