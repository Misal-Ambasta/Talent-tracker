import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllApplicants,
  getApplicantsByJob,
  getApplicantById,
  createApplicantByJob,
  updateApplicant,
  deleteApplicant,
  updateApplicantStatus,
  bulkUpdateApplicantStatus,
  createApplicant,
  uploadResumeAndCreateApplicant
} from '../controllers/applicantController';
import { resumeUpload } from '../utils/fileUpload';

const router = express.Router();

// Apply authentication middleware to all applicant routes
router.use(authenticate);

// Applicant routes
router.get('/jobs/:jobId/applicants', getApplicantsByJob);
router.get('/applicants/all', getAllApplicants);
router.post('/jobs/:jobId/applicants', createApplicantByJob);
router.get('/applicants/:applicantId', getApplicantById);
router.put('/applicants/:applicantId', updateApplicant);
router.delete('/applicants/:applicantId', deleteApplicant);
router.patch('/applicants/:applicantId/status', updateApplicantStatus);
router.patch('/applicants/bulk-status', bulkUpdateApplicantStatus);

// Add new applicant (simple, not tied to job/recruiter)
router.post('/applicants', createApplicant);

// Upload resume and create applicant
router.post('/applicants/upload-resume', resumeUpload.single('resume'), uploadResumeAndCreateApplicant);

export default router;