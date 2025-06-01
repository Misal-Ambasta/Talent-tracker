import express from 'express';
import { audioUpload } from '../utils/audioUpload';
import { authenticate } from '../middleware/auth';
import {
  uploadInterviewAudio,
  processInterviewAudio,
  getInterviewAudio,
  getInterviewSummary,
  getInterviews,
  deleteInterview,
  streamInterviewAudio,
  processInterviewText
} from '../controllers/interviewController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all interviews for the authenticated recruiter
router.get('/', getInterviews);

// Upload a new interview audio file
router.post('/upload', audioUpload.single('audio'), uploadInterviewAudio);

// Get interview audio by ID
router.get('/:interviewId', getInterviewAudio);

// Process interview audio to generate transcription and summary
router.post('/:interviewId/process', processInterviewAudio);

// Get interview summary by interview ID
router.get('/:interviewId/summary', getInterviewSummary);

// Stream audio file
router.get('/:interviewId/audio', streamInterviewAudio);

// Delete interview audio and summary
router.delete('/:interviewId', deleteInterview);

// Process interview text input
router.post('/process-text', processInterviewText);

export default router;