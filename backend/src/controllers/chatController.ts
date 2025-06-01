import { Request, Response } from 'express';
import Joi from 'joi';
import ChatSummary from '../models/ChatSummary';
import Applicant from '../models/Applicant';
import { analyzeChatText, estimateConfidence } from '../services/chatService';
import logger from '../utils/logger';

// Validation schema for chat summarization
const summarizeChatSchema = Joi.object({
  chatText: Joi.string().required().min(10).max(50000).messages({
    'string.empty': 'Chat text is required',
    'string.min': 'Chat text must be at least 10 characters',
    'string.max': 'Chat text must be at most 50,000 characters',
    'any.required': 'Chat text is required'
  }),
  applicantId: Joi.string().messages({
    'string.empty': 'Applicant ID must not be empty if provided'
  })
});

// Validation schema for retrieving chat summaries
const getChatSummariesSchema = Joi.object({
  applicantId: Joi.string(),
  sentiment: Joi.string().valid('positive', 'neutral', 'negative'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('createdAt', 'confidenceScore').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Summarize chat text
 * @route POST /api/chats/summarize
 */
export const summarizeChat = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = summarizeChatSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { chatText, applicantId } = value;
    const recruiterId = req.recruiterId; // From auth middleware

    // If applicantId is provided, verify it exists and belongs to the recruiter
    let applicant = null;
    if (applicantId) {
      applicant = await Applicant.findOne({ 
        _id: applicantId, 
        recruiter: recruiterId 
      });

      if (!applicant) {
        res.status(404).json({ message: 'Applicant not found' });
        return;
      }
    }

    // Analyze the chat text
    const analysisResult = await analyzeChatText(chatText);

    // Create a new chat summary
    const chatSummary = new ChatSummary({
      recruiter: recruiterId,
      ...(applicant && { applicant: applicantId }),
      chatText,
      summary: analysisResult.summary,
      keyPoints: analysisResult.keyPoints,
      questions: analysisResult.questions,
      answers: analysisResult.answers,
      nextSteps: analysisResult.nextSteps,
      sentiment: analysisResult.sentiment,
      confidenceScore: analysisResult.confidenceScore,
      aiModel: 'gpt-4'
    });

    await chatSummary.save();

    res.status(201).json({
      id: chatSummary._id,
      summary: chatSummary.summary,
      keyPoints: chatSummary.keyPoints,
      questions: chatSummary.questions,
      answers: chatSummary.answers,
      nextSteps: chatSummary.nextSteps,
      sentiment: chatSummary.sentiment,
      confidenceScore: chatSummary.confidenceScore,
      createdAt: chatSummary.createdAt
    });
  } catch (error) {
    logger.error('Error summarizing chat:', error);
    res.status(500).json({ message: 'Failed to summarize chat' });
  }
};

/**
 * Get chat summary by ID
 * @route GET /api/chats/:chatId
 */
export const getChatSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    const chatSummary = await ChatSummary.findOne({ 
      _id: chatId, 
      recruiter: recruiterId 
    });

    if (!chatSummary) {
      res.status(404).json({ message: 'Chat summary not found' });
      return;
    }

    res.status(200).json({
      id: chatSummary._id,
      summary: chatSummary.summary,
      keyPoints: chatSummary.keyPoints,
      questions: chatSummary.questions,
      answers: chatSummary.answers,
      nextSteps: chatSummary.nextSteps,
      sentiment: chatSummary.sentiment,
      confidenceScore: chatSummary.confidenceScore,
      applicantId: chatSummary.applicant,
      createdAt: chatSummary.createdAt
    });
  } catch (error) {
    logger.error('Error getting chat summary:', error);
    res.status(500).json({ message: 'Failed to get chat summary' });
  }
};

/**
 * Get all chat summaries for a recruiter
 * @route GET /api/chats
 */
export const getChatSummaries = async (req: Request, res: Response): Promise<void> => {
  try {
    const recruiterId = req.recruiterId; // From auth middleware
    
    // Validate query parameters
    const { error, value } = getChatSummariesSchema.validate(req.query);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { applicantId, sentiment, page, limit, sort, order } = value;

    // Build query
    const query: any = { recruiter: recruiterId };
    
    if (applicantId) {
      query.applicant = applicantId;
    }
    
    if (sentiment) {
      query.sentiment = sentiment;
    }

    // Parse pagination params
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObj: any = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    // Get total count
    const total = await ChatSummary.countDocuments(query);

    // Get chat summaries
    const chatSummaries = await ChatSummary.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('applicant', 'firstName lastName email')
      .lean();

    res.status(200).json({
      chatSummaries: chatSummaries.map(summary => ({
        id: summary._id,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        sentiment: summary.sentiment,
        confidenceScore: summary.confidenceScore,
        applicant: summary.applicant,
        createdAt: summary.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting chat summaries:', error);
    res.status(500).json({ message: 'Failed to get chat summaries' });
  }
};

/**
 * Delete chat summary
 * @route DELETE /api/chats/:chatId
 */
export const deleteChatSummary = async (req: Request, res: Response): Promise<void>  => {
  try {
    const { chatId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    const result = await ChatSummary.deleteOne({ 
      _id: chatId, 
      recruiter: recruiterId 
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Chat summary not found' });
      return;
    }

    res.status(200).json({ message: 'Chat summary deleted successfully' });
  } catch (error) {
    logger.error('Error deleting chat summary:', error);
    res.status(500).json({ message: 'Failed to delete chat summary' });
  }
};