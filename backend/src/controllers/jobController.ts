import { Request, Response } from 'express';
import Joi from 'joi';
import JobPost, { IJobPost } from '../models/JobPost';
import logger from '../utils/logger';

// Validation schema for creating a job post
const createJobSchema = Joi.object({
  title: Joi.string().required().trim(),
  company: Joi.string().required().trim(),
  location: Joi.string().required().trim(),
  description: Joi.string().required(),
  // requirements: Joi.string().required(),
  responsibilities: Joi.string().required(),
  salary: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string().default('USD')
  }),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'temporary').required(),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'executive').required(),
  skills: Joi.array().items(Joi.string().trim()),
  applicationDeadline: Joi.date(),
  isRemote: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  department: Joi.string().required(),
  postedDate: Joi.date().required(),
  closingDate: Joi.date().required(),
  status: Joi.string().valid('open', 'closed').required()
});

// Validation schema for updating a job post
const updateJobSchema = Joi.object({
  title: Joi.string().trim(),
  company: Joi.string().trim(),
  location: Joi.string().trim(),
  description: Joi.string(),
  // requirements: Joi.string(),
  responsibilities: Joi.string(),
  salary: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string()
  }),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'temporary'),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'executive'),
  skills: Joi.array().items(Joi.string().trim()),
  applicationDeadline: Joi.date(),
  isRemote: Joi.boolean(),
  isActive: Joi.boolean(),
  department: Joi.string(),
  postedDate: Joi.date(),
  closingDate: Joi.date(),
  status: Joi.string().valid('open', 'closed')
});

/**
 * Get all job posts with pagination, filtering, and sorting
 * @route GET /api/jobs
 * @access Private
 */
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get recruiterId from authenticated user
    const recruiterId = (req as any).recruiterId;
    
    // Build filter object
    const filter: any = { recruiter: recruiterId };
    
    // Add isActive filter if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { location: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Determine sort order
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;
    
    // Execute query with pagination
    const jobs = await JobPost.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
    
    // Get total count for pagination
    const total = await JobPost.countDocuments(filter);
    
    res.status(200).json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting jobs:', error);
    res.status(500).json({ message: 'Error retrieving job posts' });
  }
};

/**
 * Get a single job post by ID
 * @route GET /api/jobs/:jobId
 * @access Private
 */
export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId;
    const recruiterId = (req as any).recruiterId;
    
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    
    if (!job) {
      res.status(404).json({ message: 'Job post not found' });
      return;
    }
    
    res.status(200).json(job);
  } catch (error) {
    logger.error('Error getting job by ID:', error);
    res.status(500).json({ message: 'Error retrieving job post' });
  }
};

/**
 * Create a new job post
 * @route POST /api/jobs
 * @access Private
 */
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createJobSchema.validate(req.body, { abortEarly: false });
    
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
    
    // Get recruiterId from authenticated user
    const recruiterId = (req as any).recruiterId;
    
    // Create new job post
    const newJob = new JobPost({
      ...value,
      recruiter: recruiterId
    });
    
    // Save to database
    const savedJob = await newJob.save();
    
    res.status(201).json(savedJob);
  } catch (error) {
    logger.error('Error creating job:', error);
    res.status(500).json({ message: 'Error creating job post' });
  }
};

/**
 * Update a job post
 * @route PUT /api/jobs/:jobId
 * @access Private
 */
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = updateJobSchema.validate(req.body, { abortEarly: false });
    
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
    
    const jobId = req.params.jobId;
    const recruiterId = (req as any).recruiterId;
    
    // Check if job exists and belongs to the recruiter
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    
    if (!job) {
      res.status(404).json({ message: 'Job post not found' });
      return;
    }
    
    // Update job post
    const updatedJob = await JobPost.findByIdAndUpdate(
      jobId,
      { $set: value },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedJob);
  } catch (error) {
    logger.error('Error updating job:', error);
    res.status(500).json({ message: 'Error updating job post' });
  }
};

/**
 * Delete a job post (soft delete by setting isActive to false)
 * @route DELETE /api/jobs/:jobId
 * @access Private
 */
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId;
    const recruiterId = (req as any).recruiterId;
    
    // Check if job exists and belongs to the recruiter
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    
    if (!job) {
      res.status(404).json({ message: 'Job post not found' });
      return;
    }
    
    // Soft delete by setting isActive to false
    await JobPost.findByIdAndUpdate(jobId, { isActive: false });
    
    res.status(200).json({ message: 'Job post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting job:', error);
    res.status(500).json({ message: 'Error deleting job post' });
  }
};

/**
 * Hard delete a job post (for testing purposes)
 * @route DELETE /api/jobs/:jobId/hard
 * @access Private
 */
export const hardDeleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId;
    const recruiterId = (req as any).recruiterId;
    
    // Check if job exists and belongs to the recruiter
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    
    if (!job) {
      res.status(404).json({ message: 'Job post not found' });
      return;
    }
    
    // Hard delete
    await JobPost.findByIdAndDelete(jobId);
    
    res.status(200).json({ message: 'Job post permanently deleted' });
  } catch (error) {
    logger.error('Error hard deleting job:', error);
    res.status(500).json({ message: 'Error deleting job post' });
  }
};