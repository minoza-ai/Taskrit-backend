import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /users/me
 * 현재 사용자 정보 조회
 */
router.get('/me', authMiddleware, (req, res) => userController.getMe(req, res));

/**
 * PATCH /users/me
 * 현재 사용자 정보 수정
 */
router.patch('/me', authMiddleware, (req, res) => userController.updateMe(req, res));

/**
 * DELETE /users/me
 * 현재 사용자 삭제
 */
router.delete('/me', authMiddleware, (req, res) => userController.deleteMe(req, res));

export default router;
