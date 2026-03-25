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
 * GET /users/me/otp/status
 * OTP 상태 조회
 */
router.get('/me/otp/status', authMiddleware, (req, res) => userController.getOtpStatus(req, res));

/**
 * POST /users/me/otp/setup
 * OTP 설정 초기화(시크릿 및 QR 발급)
 */
router.post('/me/otp/setup', authMiddleware, (req, res) => userController.setupOtp(req, res));

/**
 * POST /users/me/otp/enable
 * OTP 활성화
 */
router.post('/me/otp/enable', authMiddleware, (req, res) => userController.enableOtp(req, res));

/**
 * POST /users/me/otp/disable
 * OTP 비활성화
 */
router.post('/me/otp/disable', authMiddleware, (req, res) => userController.disableOtp(req, res));

/**
 * DELETE /users/me
 * 현재 사용자 삭제
 */
router.delete('/me', authMiddleware, (req, res) => userController.deleteMe(req, res));

export default router;
