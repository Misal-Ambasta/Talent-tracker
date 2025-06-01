import express from 'express';
import { authenticate } from '../middleware/auth';
import { resumeUpload } from '../utils/fileUpload';
import {
  uploadResume,
  getResumes,
  getResumeById,
  downloadResume,
  deleteResume,
  getJobMatchResults,
  getCandidatesForJob
} from '../controllers/resumeController';

const router = express.Router();

// Apply authentication middleware to all resume routes
router.use(authenticate);

// Resume routes
router.post('/resumes/upload', resumeUpload.single('resume'), uploadResume);
router.get('/resumes', getResumes);
router.get('/resumes/:resumeId', getResumeById);
router.get('/resumes/:resumeId/download', downloadResume);
router.delete('/resumes/:resumeId', deleteResume);

// Resume matching routes
// router.post('/jobs/:jobId/resumes/match', matchResumesToJob);
router.get('/jobs/:jobId/matches', getJobMatchResults);
router.get('/jobs/:jobId/candidate', getCandidatesForJob);

export default router;