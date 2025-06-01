import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  detectTextBias,
  getBiasReport,
  getBiasReports,
  deleteBiasReport
} from '../controllers/biasController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all bias reports for the authenticated recruiter
router.get('/', getBiasReports);

// Analyze text for bias
router.post('/detect', detectTextBias);

// Get bias report by ID
router.get('/:reportId', getBiasReport);

// Delete bias report
router.delete('/:reportId', deleteBiasReport);

export default router;