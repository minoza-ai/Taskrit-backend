import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';
import { uploadSubmission } from '../middleware/uploadSubmission';

const router = Router();

router.get('/feed', (req, res) => projectController.getPublicFeed(req, res));
router.get('/public/metrics', (req, res) => projectController.getMetrics(req, res));
router.get('/dashboard', authMiddleware, (req, res) => projectController.getDashboard(req, res));
router.post('/match/suggest', authMiddleware, (req, res) => projectController.suggestMatches(req, res));
router.post('/', authMiddleware, (req, res) => projectController.create(req, res));
router.get('/', authMiddleware, (req, res) => projectController.list(req, res));
router.post('/:project_uuid/submissions', authMiddleware, (req, res) => projectController.submitResult(req, res));
router.post(
	'/:project_uuid/submissions/upload',
	authMiddleware,
	uploadSubmission.single('artifact_file'),
	(req, res) => projectController.uploadSubmissionFile(req, res),
);
router.get('/:project_uuid/submissions', authMiddleware, (req, res) => projectController.listSubmissions(req, res));
router.post(
	'/:project_uuid/submissions/:submission_uuid/approve',
	authMiddleware,
	(req, res) => projectController.approveSubmission(req, res),
);
router.get('/:project_uuid', authMiddleware, (req, res) => projectController.getByUuid(req, res));
router.patch('/:project_uuid', authMiddleware, (req, res) => projectController.update(req, res));
router.delete('/:project_uuid', authMiddleware, (req, res) => projectController.delete(req, res));

export default router;
