import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import Applicant, { ApplicantStatus } from '../models/Applicant';
import JobPost from '../models/JobPost';
import Resume from '../models/Resume';
import logger from '../utils/logger';
import { extractTextFromFile, cleanExtractedText } from '../utils/textExtraction';
import { extractCandidateDetails } from '../utils/candidate';
import { deleteFile } from '../utils/fileUpload';


// Validation schema for applicant
const applicantSchema = Joi.object({
  firstName: Joi.string().trim(),
  lastName: Joi.string().trim(),
  email: Joi.string().email().trim().lowercase(),
  phone: Joi.string().trim(),
  linkedInUrl: Joi.string().uri().trim(),
  portfolioUrl: Joi.string().uri().trim(),
  currentCompany: Joi.string().trim(),
  currentPosition: Joi.string().trim(),
  yearsOfExperience: Joi.number().min(0),
  education: Joi.object({
    degree: Joi.string().trim(),
    institution: Joi.string().trim(),
    graduationYear: Joi.number().integer().min(1900).max(new Date().getFullYear() + 10)
  }),
  status: Joi.string().valid(
    'new', 'reviewing', 'screening', 'interview', 'technical', 'offer', 'hired', 'rejected'
  ),
  notes: Joi.string(),
  tags: Joi.array().items(Joi.string().trim()),
});

/**
 * Get all applicants for a specific job
 * @route GET /api/jobs/:jobId/applicants
 * @access Private
 */
export const getApplicantsByJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    // Verify job exists and belongs to recruiter
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter: any = { jobPost: jobId, recruiter: recruiterId };
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { currentCompany: searchRegex },
        { currentPosition: searchRegex }
      ];
    }
    
    // Determine sort order
    const sortField = (req.query.sortField as string) || 'applicationDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;
    
    // Execute query with pagination
    const applicants = await Applicant.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('resume', 'fileName originalFileName uploadDate')
      .exec();
    
    // Get total count for pagination
    const total = await Applicant.countDocuments(filter);
    
    res.status(200).json({
      applicants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting applicants by job:', error);
    res.status(500).json({ message: 'Error retrieving applicants' });
  }
};

/**
 * Get a single applicant by ID
 * @route GET /api/applicants/:applicantId
 * @access Private
 */
export const getApplicantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicantId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    const applicant = await Applicant.findOne({ 
      _id: applicantId, 
      recruiter: recruiterId 
    }).populate('resume').populate('jobPost');
    
    if (!applicant) {
      res.status(404).json({ message: 'Applicant not found' });
      return;
    }
    
    res.status(200).json(applicant);
  } catch (error) {
    logger.error('Error getting applicant by ID:', error);
    res.status(500).json({ message: 'Error retrieving applicant' });
  }
};

/**
 * Create a new applicant for a job
 * @route POST /api/jobs/:jobId/applicants
 * @access Private
 */
export const createApplicantByJob = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { jobId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    // Validate request body
    const { error, value } = applicantSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }
    
    // Verify job exists and belongs to recruiter
    const job = await JobPost.findOne({ 
      _id: jobId, 
      recruiter: recruiterId 
    }).session(session);
    
    if (!job) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    
    // Verify resume exists and belongs to recruiter
    const resume = await Resume.findOne({ 
      _id: value.resumeId, 
      recruiter: recruiterId 
    }).session(session);
    
    if (!resume) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ message: 'Resume not found' });
      return;
    }
    
    // Check if applicant with same email already exists for this job
    const existingApplicant = await Applicant.findOne({
      email: value.email,
      jobPost: jobId
    }).session(session);
    
    if (existingApplicant) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ 
        message: 'An applicant with this email already exists for this job' 
      });
      return;
    }
    
    // Create new applicant
    const newApplicant = new Applicant({
      ...value,
      resume: value.resumeId,
      jobPost: jobId,
      recruiter: recruiterId
    });
    
    // Save to database
    await newApplicant.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json(newApplicant);
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    logger.error('Error creating applicant:', error);
    res.status(500).json({ message: 'Error creating applicant' });
  }
};

/**
 * Update an applicant
 * @route PUT /api/applicants/:applicantId
 * @access Private
 */
export const updateApplicant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicantId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    // Validate request body
    const { error, value } = applicantSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }
    
    // Check if applicant exists and belongs to recruiter
    const applicant = await Applicant.findOne({ 
      _id: applicantId, 
      recruiter: recruiterId 
    });
    
    if (!applicant) {
      res.status(404).json({ message: 'Applicant not found' });
      return;
    }
    
    // Update applicant
    const updatedApplicant = await Applicant.findByIdAndUpdate(
      applicantId,
      { $set: value },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedApplicant);
  } catch (error) {
    logger.error('Error updating applicant:', error);
    res.status(500).json({ message: 'Error updating applicant' });
  }
};

/**
 * Delete an applicant
 * @route DELETE /api/applicants/:applicantId
 * @access Private
 */
export const deleteApplicant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicantId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    // Check if applicant exists and belongs to recruiter
    const applicant = await Applicant.findOne({ 
      _id: applicantId, 
      recruiter: recruiterId 
    });
    
    if (!applicant) {
      res.status(404).json({ message: 'Applicant not found' });
      return;
    }
    
    // Delete applicant
    await Applicant.findByIdAndDelete(applicantId);
    
    res.status(200).json({ message: 'Applicant deleted successfully' });
  } catch (error) {
    logger.error('Error deleting applicant:', error);
    res.status(500).json({ message: 'Error deleting applicant' });
  }
};

/**
 * Update applicant status
 * @route PATCH /api/applicants/:applicantId/status
 * @access Private
 */
export const updateApplicantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicantId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    // Validate status
    const { status } = req.body;
    
    if (!status || !['new', 'screening', 'reviewing', 'interview', 'technical', 'offer', 'hired', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }
    
    // Check if applicant exists and belongs to recruiter
    const applicant = await Applicant.findOne({ 
      _id: applicantId, 
      recruiter: recruiterId 
    });
    
    if (!applicant) {
      res.status(404).json({ message: 'Applicant not found' });
      return;
    }
    
    // Update status
    applicant.status = status as ApplicantStatus;
    await applicant.save();
    
    res.status(200).json({ message: 'Applicant status updated successfully', applicant });
  } catch (error) {
    logger.error('Error updating applicant status:', error);
    res.status(500).json({ message: 'Error updating applicant status' });
  }
};

/**
 * Bulk update applicant statuses
 * @route PATCH /api/applicants/bulk-status
 * @access Private
 */
export const bulkUpdateApplicantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicantIds, status } = req.body;
    const recruiterId = (req as any).recruiterId;
    
    // Validate input
    if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
      res.status(400).json({ message: 'Applicant IDs are required' });
      return;
    }
    
    if (!status || !['new', 'screening', 'reviewing', 'interview', 'technical', 'offer', 'hired', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }
    
    // Update all applicants that belong to the recruiter
    const result = await Applicant.updateMany(
      { 
        _id: { $in: applicantIds }, 
        recruiter: recruiterId 
      },
      { $set: { status } }
    );
    
    res.status(200).json({ 
      message: 'Applicant statuses updated successfully', 
      count: result.modifiedCount 
    });
  } catch (error) {
    logger.error('Error bulk updating applicant statuses:', error);
    res.status(500).json({ message: 'Error updating applicant statuses' });
  }
};

/**
 * Get all applicants in the system
 * @route GET /api/applicants/all
 * @access Private/Admin
 */
export const getAllApplicants = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicants = await Applicant.find();
    res.status(200).json({ applicants });
  } catch (error) {
    logger.error('Error getting all applicants:', error);
    res.status(500).json({ message: 'Error retrieving all applicants' });
  }
};

/**
 * Create a new applicant (simple version)
 * @route POST /api/applicants
 * @access Public or Private (no recruiter/job required)
 */
export const createApplicant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName,
      email,
      phone,
      positionAppliedFor,
      yearsOfExperience,
      location,
      skills,
      additionalNote,
      recruiterId // Added recruiterId from request body
    } = req.body;

    // Basic validation
    if (!fullName || !email || !positionAppliedFor) {
      res.status(400).json({ message: 'Full name, email, and position applied for are required.' });
      return;
    }

    if (!recruiterId) {
      res.status(400).json({ message: 'Recruiter ID is required.' });
      return;
    }

    // Create new applicant
    const newApplicant = new Applicant({
      fullName,
      email,
      phone,
      positionAppliedFor,
      yearsOfExperience,
      location,
      skills,
      additionalNote,
      recruiter: recruiterId // Set the recruiter field with the provided ID
    });

    await newApplicant.save();
    res.status(201).json(newApplicant);
  } catch (error) {
    logger.error('Error creating applicant:', error);
    res.status(500).json({ message: 'Error creating applicant' });
  }
};

/**
 * Upload a resume, extract information, and create an applicant
 * @route POST /api/applicants/upload-resume
 * @access Public
 */
export const uploadResumeAndCreateApplicant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recruiterId } = req.body;
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    if (!recruiterId) {
      res.status(400).json({ message: 'Recruiter ID is required.' });
      return;
    }
    const file = req.file;
    
    // Extract text from the uploaded file
    let parsedText = '';
    try {
      parsedText = await extractTextFromFile(file.path, file.mimetype);
      parsedText = cleanExtractedText(parsedText);
    } catch (error) {
      await deleteFile(file.path);
      logger.error('Error extracting text from resume:', error);
      res.status(400).json({ message: 'Failed to extract text from the uploaded file' });
      return;
    }

    // Extract candidate details from parsed text
    const candidateDetails = await extractCandidateDetails(parsedText);
    // Create a new resume record with candidate details
    const resume = new Resume({
      fileName: file.filename,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: file.path,
      parsedText,
      isProcessed: true,
      recruiter: recruiterId,
      candidateDetails
    });

    // Save the resume to the database
    await resume.save();
    
    // Convert years of experience from string to number if possible
    let yearsOfExperience;
    if (candidateDetails.experience) {
      const yearsMatch = candidateDetails.experience.match(/\d+/);
      if (yearsMatch) {
        yearsOfExperience = parseInt(yearsMatch[0], 10);
      }
    }
    
    // Create a new applicant using the extracted information
    const newApplicant = new Applicant({
      fullName: candidateDetails.name,
      email: candidateDetails.email,
      phone: candidateDetails.phone,
      positionAppliedFor: req.body.positionAppliedFor || 'Not specified',
      yearsOfExperience,
      skills: candidateDetails.skills,
      additionalNote: candidateDetails.summary,
      resume: resume._id,
      status: 'new',
      recruiter: recruiterId // Add the recruiter ID from the request body
    });
    
    await newApplicant.save();

    res.status(201).json({
      message: 'Resume uploaded and applicant created successfully',
      applicant: newApplicant,
      resume: {
        _id: resume._id,
        fileName: resume.fileName,
        originalFileName: resume.originalFileName
      }
    });
  } catch (error) {
    logger.error('Error uploading resume and creating applicant:', error);
    res.status(500).json({ message: 'Error processing resume and creating applicant' });
  }
};