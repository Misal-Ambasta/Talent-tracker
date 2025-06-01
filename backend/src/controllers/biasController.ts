import { Request, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import BiasReport, { IBiasReport } from '../models/BiasReport';
import { detectBias, calculateOverallRiskLevel } from '../services/biasDetectionService';
import logger from '../utils/logger';

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

// Validation schema for bias detection request
const biasDetectionSchema = Joi.object({
  text: Joi.string().required().min(10).max(5000),
  contentType: Joi.string().valid('job_description', 'interview_question', 'feedback', 'other').required()
});

// Validation schema for retrieving bias reports
const getBiasReportsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  contentType: Joi.string().valid('job_description', 'interview_question', 'feedback', 'other'),
  riskLevel: Joi.string().valid('low', 'medium', 'high'),
  sortBy: Joi.string().valid('createdAt', 'riskLevel').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().min(2).max(100)
});

/**
 * Analyze text for bias and create a bias report
 * @route POST /api/bias/detect
 */
export const detectTextBias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = biasDetectionSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { text, contentType } = value;
    const recruiterId = req.user?.id;

    // Analyze text for bias
    const biasAnalysis = await detectBias(text, contentType);
    
    // Create a new bias report
    const biasReport = new BiasReport({
      recruiter: recruiterId,
      originalText: text,
      contentType,
      detections: biasAnalysis.detections,
      overallRiskLevel: biasAnalysis.overallRiskLevel || calculateOverallRiskLevel(biasAnalysis.detections),
      improvedText: biasAnalysis.improvedText,
      aiModel: biasAnalysis.aiModel
    });

    await biasReport.save();

    res.status(201).json({
      message: 'Bias analysis completed successfully',
      report: biasReport
    });
  } catch (error) {
    logger.error('Error in bias detection:', error);
    res.status(500).json({ message: 'Failed to analyze text for bias', error: (error as Error).message });
  }
};

/**
 * Get a specific bias report by ID
 * @route GET /api/bias/:reportId
 */
export const getBiasReport = async (req: AuthenticatedRequest, res: Response): Promise<void>  => {
  try {
    const { reportId } = req.params;
    const recruiterId = req.user?.id;

    // Validate report ID
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
     res.status(400).json({ message: 'Invalid report ID' });
     return;
    }

    // Find the report
    const report = await BiasReport.findOne({ 
      _id: reportId,
      recruiter: recruiterId 
    });

    if (!report) {
      res.status(404).json({ message: 'Bias report not found' });
      return;
    }

    res.status(200).json(report);
  } catch (error) {
    logger.error('Error retrieving bias report:', error);
    res.status(500).json({ message: 'Failed to retrieve bias report', error: (error as Error).message });
  }
};

/**
 * Get all bias reports for the authenticated recruiter with filtering and pagination
 * @route GET /api/bias
 */
export const getBiasReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getBiasReportsSchema.validate(req.query);
    if (error) {
     res.status(400).json({ message: error.details[0].message });
     return;
    }

    const { 
      page, 
      limit, 
      contentType, 
      riskLevel, 
      sortBy, 
      sortOrder,
      search 
    } = value;
    const recruiterId = req.user?.id;

    // Build query
    const query: any = { recruiter: recruiterId };
    if (contentType) query.contentType = contentType;
    if (riskLevel) query.overallRiskLevel = riskLevel;
    if (search) query.$text = { $search: search };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const reports = await BiasReport.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await BiasReport.countDocuments(query);

    res.status(200).json({
      reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error retrieving bias reports:', error);
    res.status(500).json({ message: 'Failed to retrieve bias reports', error: (error as Error).message });
  }
};

/**
 * Delete a bias report
 * @route DELETE /api/bias/:reportId
 */
export const deleteBiasReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const recruiterId = req.user?.id;

    // Validate report ID
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      res.status(400).json({ message: 'Invalid report ID' });
      return;
    }

    // Find and delete the report
    const report = await BiasReport.findOneAndDelete({ 
      _id: reportId,
      recruiter: recruiterId 
    });

    if (!report) {
      res.status(404).json({ message: 'Bias report not found' });
      return;
    }

    res.status(200).json({ message: 'Bias report deleted successfully' });
  } catch (error) {
    logger.error('Error deleting bias report:', error);
    res.status(500).json({ message: 'Failed to delete bias report', error: (error as Error).message });
  }
};