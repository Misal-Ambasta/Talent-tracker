import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  summarizeChat,
  getChatSummary,
  getChatSummaries,
  deleteChatSummary
} from '../controllers/chatController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all chat summaries for the authenticated recruiter
router.get('/', getChatSummaries);

// Summarize chat text
router.post('/summarize', summarizeChat);

// Get chat summary by ID
router.get('/:chatId', getChatSummary);

// Delete chat summary
router.delete('/:chatId', deleteChatSummary);

export default router;