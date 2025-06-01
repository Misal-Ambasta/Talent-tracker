import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  hardDeleteJob
} from '../controllers/jobController';

const router = express.Router();

// Apply authentication middleware to all job routes
router.use(authenticate);

// Job routes
router.get('/', getJobs);
router.get('/:jobId', getJobById);
router.post('/', createJob);
router.put('/:jobId', updateJob);
router.delete('/:jobId', deleteJob);

// Hard delete route (for testing/admin purposes)
router.delete('/:jobId/hard', hardDeleteJob);

export default router;