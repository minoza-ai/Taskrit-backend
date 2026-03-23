import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

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
 * POST /users/me/profile-image
 * Update user profile image
 */
router.post('/me/profile-image', authMiddleware, upload.single('profile_image'), (req, res) => userController.uploadProfileImage(req, res));

/**
 * DELETE /users/me
 * 현재 사용자 삭제
 */
router.delete('/me', authMiddleware, (req, res) => userController.deleteMe(req, res));

export default router;
