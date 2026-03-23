import { Router } from 'express';
import { assetController } from '../controllers/assetController';
import { authMiddleware } from '../middleware/auth';
import { uploadAsset } from '../middleware/uploadAsset';

const router = Router();

// POST /assets
router.post('/', authMiddleware, uploadAsset.single('file'), (req, res) => assetController.create(req, res));

// GET /assets/my
router.get('/my', authMiddleware, (req, res) => assetController.listMyAssets(req, res));

// DELETE /assets/:asset_uuid
router.delete('/:asset_uuid', authMiddleware, (req, res) => assetController.delete(req, res));

export default router;
