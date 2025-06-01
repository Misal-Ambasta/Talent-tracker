import { Request, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import InterviewAudio from '../models/InterviewAudio';
import InterviewSummary from '../models/InterviewSummary';
import Applicant from '../models/Applicant';
import JobPost from '../models/JobPost';
import { audioUpload, getAudioPath, deleteAudioFile } from '../utils/audioUpload';
import { validateAudioFile, assessAudioQuality } from '../utils/audioValidation';
import { transcribeAudio, generateInterviewSummary } from '../services/whisperService';
import logger from '../utils/logger';
import fs from 'fs';

// Validation schema for uploading interview audio
const uploadInterviewSchema = Joi.object({
  applicantId: Joi.string().required().messages({
    'string.empty': 'Applicant ID is required',
    'any.required': 'Applicant ID is required',
  }),
});

// Validation schema for processing interview audio
const processInterviewSchema = Joi.object({
  language: Joi.string().min(2).max(5).messages({
    'string.min': 'Language code must be at least 2 characters',
    'string.max': 'Language code must be at most 5 characters',
  }),
  prompt: Joi.string().max(500).messages({
    'string.max': 'Prompt must be at most 500 characters',
  }),
  includeJobContext: Joi.boolean().default(true),
});

// Validation schema for processing text input
const processTextSchema = Joi.object({
  applicantId: Joi.string().required().messages({
    'string.empty': 'Applicant ID is required',
    'any.required': 'Applicant ID is required',
  }),
  text: Joi.string().required().min(50).max(10000).messages({
    'string.empty': 'Interview text is required',
    'string.min': 'Interview text must be at least 50 characters',
    'string.max': 'Interview text must be at most 10000 characters',
    'any.required': 'Interview text is required',
  }),
  includeJobContext: Joi.boolean().default(true),
});

/**
 * Upload interview audio file
 * @route POST /api/interviews/upload
 */
export const uploadInterviewAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ message: 'No audio file uploaded' });
      return;
    }

    const recruiterId = req.recruiterId; // From auth middleware

    // Validate the audio file
    const filePath = getAudioPath(req.file.filename);
    const validationResult = await validateAudioFile(filePath, req.file.mimetype);

    if (!validationResult.isValid) {
      // Delete the invalid file
      await deleteAudioFile(filePath);
      res.status(400).json({ message: validationResult.error });
      return;
    }

    // Create new interview audio record
    const interviewAudio = new InterviewAudio({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath: filePath,
      duration: validationResult.duration,
      recruiter: recruiterId,
      isProcessed: false,
      processingStatus: 'pending',
    });

    await interviewAudio.save();

    // Immediately process the audio
    try {
      // Transcribe the audio
      const transcriptionResult = await transcribeAudio(interviewAudio.filePath, {});
      console.log('transcriptionResult', transcriptionResult);
      // Generate summary and analysis
      const summaryResult = await generateInterviewSummary(transcriptionResult.transcription);
      console.log('summaryResult', summaryResult);
      // Create interview summary
      const interviewSummary = new InterviewSummary({
        interviewAudio: interviewAudio._id,
        recruiter: recruiterId,
        transcription: transcriptionResult.transcription,
        transcriptionConfidence: transcriptionResult.confidence,
        summary: summaryResult.summary,
        overallScore: summaryResult.overallScore,
        categoryScores: summaryResult.categoryScores,
        strengths: summaryResult.strengths,
        areasForImprovement: summaryResult.areasForImprovement,
        keyInsights: summaryResult.keyInsights,
        recommendation: summaryResult.recommendation,
        recommendationConfidence: summaryResult.recommendationConfidence,
        aiModel: 'gpt-4',
        inputType: 'audio',
      });
      await interviewSummary.save();
      interviewAudio.isProcessed = true;
      interviewAudio.processingStatus = 'completed';
      await interviewAudio.save();

      // Delete the uploaded audio file after processing
      const deleted = await deleteAudioFile(interviewAudio.filePath);
      if (!deleted) {
        logger.warn(`Audio file not deleted: ${interviewAudio.filePath}`);
      }

      res.status(201).json({
        message: 'Interview audio uploaded and processed successfully',
        summary: {
          id: interviewSummary._id,
          summary: interviewSummary.summary,
          overallScore: interviewSummary.overallScore,
          categoryScores: interviewSummary.categoryScores,
          strengths: interviewSummary.strengths,
          areasForImprovement: interviewSummary.areasForImprovement,
          keyInsights: interviewSummary.keyInsights,
          recommendation: interviewSummary.recommendation,
          createdAt: interviewSummary.createdAt,
        },
      });
    } catch (processingError) {
      logger.error('Error processing interview audio:', processingError);
      interviewAudio.processingStatus = 'failed';
      const deleted = await deleteAudioFile(interviewAudio.filePath);
      if (!deleted) {
        logger.warn(`Catch case:Audio file not deleted: ${interviewAudio.filePath}`);
      }
      interviewAudio.processingError =
        processingError instanceof Error
          ? processingError.message
          : 'Unknown error during processing';
      await interviewAudio.save();
      res.status(500).json({ message: 'Failed to process interview audio' });
    }
  } catch (error) {
    logger.error('Error uploading interview audio:', error);
    res.status(500).json({ message: 'Failed to upload interview audio' });
  }
};

/**
 * Process interview audio to generate transcription and summary
 * @route POST /api/interviews/:interviewId/process
 */
export const processInterviewAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { interviewId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    // Validate request body
    const { error, value } = processInterviewSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { language, prompt, includeJobContext } = value;

    // Find the interview audio
    const interviewAudio = await InterviewAudio.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    });

    if (!interviewAudio) {
      res.status(404).json({ message: 'Interview audio not found' });
      return;
    }

    // Check if already processed or processing
    if (interviewAudio.processingStatus === 'processing') {
      res.status(409).json({
        message: 'Interview audio is already being processed',
        status: interviewAudio.processingStatus,
      });
      return;
    }

    if (interviewAudio.processingStatus === 'completed') {
      res.status(409).json({
        message: 'Interview audio has already been processed',
        status: interviewAudio.processingStatus,
      });
      return;
    }

    // Update status to processing
    interviewAudio.processingStatus = 'processing';
    await interviewAudio.save();

    // Start processing in background
    res.status(202).json({
      message: 'Interview audio processing started',
      interviewId: interviewAudio._id,
      status: interviewAudio.processingStatus,
    });

    try {
      // Transcribe the audio
      const transcriptionResult = await transcribeAudio(interviewAudio.filePath, {
        language,
        prompt,
      });

      // Get job details if requested
      let jobDetails;
      if (includeJobContext) {
        const applicant = await Applicant.findById(interviewAudio.applicant);
        if (applicant?.jobPost) {
          const jobPost = await JobPost.findById(applicant.jobPost);
          if (jobPost) {
            jobDetails = {
              title: jobPost.title,
              description: jobPost.description,
              requiredSkills: jobPost.skills || [],
            };
          }
        }
      }

      // Generate summary and analysis
      const summaryResult = await generateInterviewSummary(
        transcriptionResult.transcription,
        jobDetails,
      );

      // Create interview summary
      const interviewSummary = new InterviewSummary({
        interviewAudio: interviewAudio._id,
        recruiter: recruiterId,
        applicant: interviewAudio.applicant,
        transcription: transcriptionResult.transcription,
        transcriptionConfidence: transcriptionResult.confidence,
        summary: summaryResult.summary,
        overallScore: summaryResult.overallScore,
        categoryScores: summaryResult.categoryScores,
        strengths: summaryResult.strengths,
        areasForImprovement: summaryResult.areasForImprovement,
        keyInsights: summaryResult.keyInsights,
        recommendation: summaryResult.recommendation,
        recommendationConfidence: summaryResult.recommendationConfidence,
        aiModel: 'gpt-4-turbo-preview',
      });

      await interviewSummary.save();

      // Update interview audio status
      interviewAudio.isProcessed = true;
      interviewAudio.processingStatus = 'completed';
      await interviewAudio.save();
    } catch (processingError) {
      logger.error('Error processing interview audio:', processingError);

      // Update status to failed
      interviewAudio.processingStatus = 'failed';
      interviewAudio.processingError =
        processingError instanceof Error
          ? processingError.message
          : 'Unknown error during processing';
      await interviewAudio.save();
    }
  } catch (error) {
    logger.error('Error initiating interview processing:', error);
    res.status(500).json({ message: 'Failed to process interview audio' });
  }
};

/**
 * Process interview text input to generate summary
 * @route POST /api/interviews/process-text
 */
export const processInterviewText = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body (only text is required)
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.length < 50 || text.length > 10000) {
      res.status(400).json({ message: 'Interview text must be between 50 and 10000 characters.' });
      return;
    }

    // Generate summary and analysis directly from text
    const summaryResult = await generateInterviewSummary(text);
    console.log('summaryResult', summaryResult);
    // Create interview summary without applicant or job context
    const interviewSummary = new InterviewSummary({
      transcription: text, // The text input is treated as the transcription
      transcriptionConfidence: 1.0, // Perfect confidence since it's direct text input
      summary: summaryResult.summary,
      overallScore: summaryResult.overallScore,
      categoryScores: summaryResult.categoryScores,
      strengths: summaryResult.strengths,
      areasForImprovement: summaryResult.areasForImprovement,
      keyInsights: summaryResult.keyInsights,
      recommendation: summaryResult.recommendation,
      recommendationConfidence: summaryResult.recommendationConfidence,
      aiModel: 'gpt-4',
      inputType: 'text', // Mark this as text input
    });

    await interviewSummary.save();

    res.status(201).json({
      message: 'Interview text processed successfully',
      summary: {
        id: interviewSummary._id,
        summary: interviewSummary.summary,
        overallScore: interviewSummary.overallScore,
        categoryScores: interviewSummary.categoryScores,
        strengths: interviewSummary.strengths,
        areasForImprovement: interviewSummary.areasForImprovement,
        keyInsights: interviewSummary.keyInsights,
        recommendation: interviewSummary.recommendation,
        createdAt: interviewSummary.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error processing interview text:', error);
    res.status(500).json({ message: 'Failed to process interview text' });
  }
};

/**
 * Get interview audio by ID
 * @route GET /api/interviews/:interviewId
 */
export const getInterviewAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { interviewId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    const interviewAudio = await InterviewAudio.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    });

    if (!interviewAudio) {
      res.status(404).json({ message: 'Interview audio not found' });
      return;
    }

    res.status(200).json({
      id: interviewAudio._id,
      fileName: interviewAudio.originalFileName,
      fileSize: interviewAudio.fileSize,
      duration: interviewAudio.duration,
      uploadDate: interviewAudio.uploadDate,
      status: interviewAudio.processingStatus,
      isProcessed: interviewAudio.isProcessed,
      applicantId: interviewAudio.applicant,
    });
  } catch (error) {
    logger.error('Error getting interview audio:', error);
    res.status(500).json({ message: 'Failed to get interview audio' });
  }
};

/**
 * Get interview summary by interview ID
 * @route GET /api/interviews/:interviewId/summary
 */
export const getInterviewSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { interviewId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    // Find the interview audio first to verify ownership
    const interviewAudio = await InterviewAudio.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    });

    if (!interviewAudio) {
      res.status(404).json({ message: 'Interview audio not found' });
      return;
    }

    // Check if processing is complete
    if (interviewAudio.processingStatus !== 'completed') {
      res.status(409).json({
        message: `Interview processing is ${interviewAudio.processingStatus}`,
        status: interviewAudio.processingStatus,
        error: interviewAudio.processingError,
      });
      return;
    }

    // Get the summary
    const summary = await InterviewSummary.findOne({ interviewAudio: interviewId });

    if (!summary) {
      res.status(404).json({ message: 'Interview summary not found' });
      return;
    }

    res.status(200).json({
      id: summary._id,
      interviewId: summary.interviewAudio,
      applicantId: summary.applicant,
      summary: summary.summary,
      transcription: summary.transcription,
      transcriptionConfidence: summary.transcriptionConfidence,
      overallScore: summary.overallScore,
      categoryScores: summary.categoryScores,
      strengths: summary.strengths,
      areasForImprovement: summary.areasForImprovement,
      keyInsights: summary.keyInsights,
      recommendation: summary.recommendation,
      recommendationConfidence: summary.recommendationConfidence,
      createdAt: summary.createdAt,
    });
  } catch (error) {
    logger.error('Error getting interview summary:', error);
    res.status(500).json({ message: 'Failed to get interview summary' });
  }
};

/**
 * Get all interviews for a recruiter
 * @route GET /api/interviews
 */
export const getInterviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const recruiterId = req.recruiterId; // From auth middleware
    const {
      applicantId,
      status,
      page = '1',
      limit = '10',
      sort = 'uploadDate',
      order = 'desc',
    } = req.query;

    // Build query
    const query: any = { recruiter: recruiterId };

    if (applicantId) {
      query.applicant = applicantId;
    }

    if (status) {
      query.processingStatus = status;
    }

    // Parse pagination params
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    // Get total count
    const total = await InterviewAudio.countDocuments(query);

    // Get interviews
    const interviews = await InterviewAudio.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('applicant', 'firstName lastName email')
      .lean();

    res.status(200).json({
      interviews: interviews.map(interview => ({
        id: interview._id,
        fileName: interview.originalFileName,
        duration: interview.duration,
        uploadDate: interview.uploadDate,
        status: interview.processingStatus,
        isProcessed: interview.isProcessed,
        applicant: interview.applicant,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error getting interviews:', error);
    res.status(500).json({ message: 'Failed to get interviews' });
  }
};

/**
 * Delete interview audio and summary
 * @route DELETE /api/interviews/:interviewId
 */
export const deleteInterview = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { interviewId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    // Find the interview audio
    const interviewAudio = await InterviewAudio.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    }).session(session);

    if (!interviewAudio) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ message: 'Interview audio not found' });
      return;
    }

    // Delete the file
    const deleteResult = await deleteAudioFile(interviewAudio.filePath);
    if (!deleteResult) {
      logger.warn(`File not found or could not be deleted: ${interviewAudio.filePath}`);
    }

    // Delete the summary if it exists
    await InterviewSummary.deleteOne({ interviewAudio: interviewId }).session(session);

    // Delete the interview audio record
    await InterviewAudio.deleteOne({ _id: interviewId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Interview deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error deleting interview:', error);
    res.status(500).json({ message: 'Failed to delete interview' });
  }
};

/**
 * Stream audio file
 * @route GET /api/interviews/:interviewId/audio
 */
export const streamInterviewAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { interviewId } = req.params;
    const recruiterId = req.recruiterId; // From auth middleware

    // Find the interview audio
    const interviewAudio = await InterviewAudio.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    });

    if (!interviewAudio) {
      res.status(404).json({ message: 'Interview audio not found' });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(interviewAudio.filePath)) {
      res.status(404).json({ message: 'Audio file not found' });
      return;
    }

    // Get file stats
    const stat = fs.statSync(interviewAudio.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Handle range requests (for streaming)
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(interviewAudio.filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': interviewAudio.mimeType,
        'Content-Disposition': `inline; filename="${interviewAudio.originalFileName}"`,
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': interviewAudio.mimeType,
        'Content-Disposition': `inline; filename="${interviewAudio.originalFileName}"`,
      });

      fs.createReadStream(interviewAudio.filePath).pipe(res);
    }
  } catch (error) {
    logger.error('Error streaming interview audio:', error);
    res.status(500).json({ message: 'Failed to stream interview audio' });
  }
};
