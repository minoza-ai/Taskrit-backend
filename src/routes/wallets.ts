import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /wallets/connect/request
 * 지갑 연동 요청 (Nonce 발급)
 */
router.post('/connect/request', (req, res) => walletController.requestConnect(req, res));

/**
 * POST /wallets/connect/confirm
 * 지갑 연동 완료 (Signature 검증)
 */
router.post('/connect/confirm', authMiddleware, (req, res) => walletController.confirmConnect(req, res));

/**
 * DELETE /wallets
 * 지갑 연동 해제
 */
router.delete('/', authMiddleware, (req, res) => walletController.disconnect(req, res));

export default router;
