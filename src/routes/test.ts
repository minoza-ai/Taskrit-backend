import { Router } from 'express';
import { testController } from '../controllers/testController';

const router = Router();

/**
 * POST /test/hash-password
 * 비밀번호 해싱 테스트 (개발용)
 */
router.post('/hash-password', (req, res) => testController.hashPassword(req, res));

export default router;
