import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import Resume from '../models/Resume';
import JobPost from '../models/JobPost';
import ResumeMatchResult from '../models/ResumeMatchResult';
import { extractTextFromFile, cleanExtractedText } from '../utils/textExtraction';
import { deleteFile, getResumePath } from '../utils/fileUpload';
import {
  generateEmbedding,
  calculateCosineSimilarity,
  extractSkills,
} from '../services/openaiService';
import logger from '../utils/logger';
import { IJobPost } from '../models/JobPost';
import { IResume } from '../models/Resume';
import { extractCandidateDetails } from '../utils/candidate';
import { validateFiles, ValidatedFile, ValidationResult } from '../utils/fileValidation';

/**
 * Upload a resume
 * @route POST /api/resumes/upload
 * @access Private
 */
export const uploadResume = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const recruiterId = (req as any).recruiterId;
    const file = req.file;
    const { jobMode, title, description, jobId } = req.body;
    let usedJobId = jobId;

    // If jobMode is 'new', create a new JobPost
    let job;
    if (jobMode === 'new') {
      if (!title || !description) {
        res.status(400).json({ message: 'Job title and description are required for new job' });
        return;
      }
      job = new JobPost({
        title,
        description,
        recruiter: recruiterId,
      });
      await job.save();
      usedJobId = job._id;
    } else {
      job = await JobPost.findOne({ _id: usedJobId, recruiter: recruiterId });
      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
    }

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
      recruiter: recruiterId,
      isProcessed: true,
      candidateDetails // Add the extracted candidate details
    });

    // Save the resume to the database
    await resume.save();

    // After upload, call matchResumesToJobCore
    if (!job) {
      res.status(400).json({ message: 'Job not found for matching' });
      return;
    }
    const matchResults = await matchResumesToJobCore(job, [resume], recruiterId, jobMode);

    // Delete the file after successful processing
    await deleteFile(file.path);
    logger.info(`Successfully deleted file ${file.path} after processing`);

    res.status(201).json({
      message: 'Resume uploaded and matched successfully',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        originalFileName: resume.originalFileName,
        uploadDate: resume.uploadDate,
        candidateDetails: resume.candidateDetails
      },
      matchResults: matchResults || [],
    });
  } catch (error) {
    if (req.file) {
      await deleteFile(req.file.path);
    }

    logger.error('Error uploading resume:', error);
    res.status(500).json({ message: 'Error uploading resume' });
  }
};


/**
 * Get all resumes for a recruiter
 * @route GET /api/resumes
 * @access Private
 */
export const getResumes = async (req: Request, res: Response): Promise<void> => {
  try {
    const recruiterId = (req as any).recruiterId;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { recruiter: recruiterId };

    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [{ originalFileName: searchRegex }, { parsedText: searchRegex }];
    }

    // Determine sort order
    const sortField = (req.query.sortField as string) || 'uploadDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;

    // Execute query with pagination
    const resumes = await Resume.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('fileName originalFileName fileSize mimeType uploadDate isProcessed')
      .exec();

    // Get total count for pagination
    const total = await Resume.countDocuments(filter);

    res.status(200).json({
      resumes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting resumes:', error);
    res.status(500).json({ message: 'Error retrieving resumes' });
  }
};

/**
 * Get a single resume by ID
 * @route GET /api/resumes/:resumeId
 * @access Private
 */
export const getResumeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeId } = req.params;
    const recruiterId = (req as any).recruiterId;

    const resume = await Resume.findOne({
      _id: resumeId,
      recruiter: recruiterId,
    }).select('-textEmbedding'); // Exclude large embedding data

    if (!resume) {
      res.status(404).json({ message: 'Resume not found' });
      return;
    }

    res.status(200).json(resume);
  } catch (error) {
    logger.error('Error getting resume by ID:', error);
    res.status(500).json({ message: 'Error retrieving resume' });
  }
};

/**
 * Download a resume file
 * @route GET /api/resumes/:resumeId/download
 * @access Private
 */
export const downloadResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeId } = req.params;
    const recruiterId = (req as any).recruiterId;

    const resume = await Resume.findOne({
      _id: resumeId,
      recruiter: recruiterId,
    });

    if (!resume) {
      res.status(404).json({ message: 'Resume not found' });
      return;
    }
    
    // Check if the resume has a Cloudinary URL
    if (resume.cloudinary && resume.cloudinary.url) {
      // Redirect to the Cloudinary URL
      return res.redirect(resume.cloudinary.url);
    }

    const filePath = getResumePath(resume.fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Resume file not found' });
      return;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalFileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error downloading resume:', error);
    res.status(500).json({ message: 'Error downloading resume' });
  }
};

/**
 * Delete a resume
 * @route DELETE /api/resumes/:resumeId
 * @access Private
 */
export const deleteResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeId } = req.params;
    const recruiterId = (req as any).recruiterId;
    
    const resume = await Resume.findOne({
      _id: resumeId,
      recruiter: recruiterId
    });
    
    if (!resume) {
      res.status(404).json({ message: 'Resume not found' });
      return;
    }
    
    // Delete the file from Cloudinary if it exists
    if (resume.cloudinary && resume.cloudinary.publicId) {
      try {
        const { deleteCloudinaryFile } = await import('../config/cloudinary');
        await deleteCloudinaryFile(resume.cloudinary.publicId);
        logger.info(`Successfully deleted file from Cloudinary: ${resume.cloudinary.publicId}`);
      } catch (cloudinaryError) {
        logger.error(`Error deleting file from Cloudinary: ${resume.cloudinary.publicId}`, cloudinaryError);
        // Continue with local file deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete the file from the filesystem if it exists
    const filePath = getResumePath(resume.fileName);
    if (fs.existsSync(filePath)) {
      await deleteFile(filePath);
    }
    
    // Delete the resume from the database
    await Resume.findByIdAndDelete(resumeId);
    
    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    logger.error('Error deleting resume:', error);
    res.status(500).json({ message: 'Error deleting resume' });
  }
};

/**
 * Core matching logic as a reusable function
 * @access Private
 */
export const matchResumesToJobCore = async (
  job: any,
  resumes: any[],
  recruiterId: any,
  jobMode: String,
): Promise<any[]> => {
  // Prepare job text for matching
  let jobText = '';
  if (jobMode === 'new') {
    jobText = `\n      Job Title: ${job.title}\n     Description: ${job.description}\n`;
  } else {
    jobText = `\n      Job Title: ${job.title}\n      Company: ${job.company}\n      Description: ${job.description}\n      Requirements: ${job.requirements}\n      Responsibilities: ${job.responsibilities}\n      Skills: ${job.skills.join(', ')}\n    `;
  }

  // Generate embedding for job
  const jobEmbedding = await generateEmbedding(jobText);
  
  // Process each resume
  const matchResults = [];
  const candidatesInSampleFormat = [];

  for (const resume of resumes) {
    // Check if resume already has an embedding
    let resumeEmbedding = resume.textEmbedding;
    
    // If not, generate one
    if (!resumeEmbedding || resumeEmbedding.length === 0) {
      resumeEmbedding = await generateEmbedding(resume.parsedText);
      resume.textEmbedding = resumeEmbedding;
      resume.embeddingModel = 'text-embedding-ada-002';
      resume.embeddingDate = new Date();
      await resume.save();
    }

    // Calculate similarity score
    const similarityScore = calculateCosineSimilarity(jobEmbedding, resumeEmbedding);

    // Extract skills from resume
    const resumeSkills = await extractSkills(resume.parsedText);

    // Calculate skill match
    const jobSkills = job.skills ? job.skills.map((skill: any) => skill.toLowerCase()) : [];
    const matchedSkills = resumeSkills.filter((skill: any) =>
      jobSkills.some(
        (jobSkill: any) =>
          jobSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill),
      ),
    );
    const missingSkills = jobSkills.filter(
      (jobSkill: any) =>
        !resumeSkills.some(
          (skill: any) =>
            jobSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill),
        ),
    );

    // Calculate skill match percentage
    const skillsMatchScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 0;

    // Convert similarity score to percentage (0-100)
    const overallScore = Math.round(similarityScore * 100);

    // Generate strengths and concerns based on match results
    const strengths = [];
    const concerns = [];

    if (matchedSkills.length > 0) {
      strengths.push(`Strong skills in ${matchedSkills.slice(0, 3).join(', ')}`);
    }
    if (skillsMatchScore > 70) {
      strengths.push('Good skill match for the role');
    }
    if (overallScore > 80) {
      strengths.push('Overall strong candidate profile');
    }

    if (missingSkills.length > 0) {
      concerns.push(`Limited experience in ${missingSkills.slice(0, 2).join(', ')}`);
    }
    if (skillsMatchScore < 50) {
      concerns.push('Skill gap for required technologies');
    }
    if (overallScore < 70) {
      concerns.push('May need additional evaluation');
    }

    // Create candidate in sampleCandidates format
    const candidateInSampleFormat = {
      id: resume._id,
      name: resume.candidateDetails?.name || 'Name not extracted',
      email: resume.candidateDetails?.email || 'Email not found',
      phone: resume.candidateDetails?.phone || 'Phone not found',
      score: overallScore,
      skills: resume.candidateDetails?.skills || resumeSkills,
      experience: resume.candidateDetails?.experience || 'Experience not specified',
      strengths: strengths.length > 0 ? strengths : ['Candidate profile available'],
      concerns: concerns.length > 0 ? concerns : ['No major concerns identified'],
      summary: resume.candidateDetails?.summary || 'Professional summary not available'
    };

    candidatesInSampleFormat.push(candidateInSampleFormat);

    // Create or update match result (existing logic)
    const existingMatch = await ResumeMatchResult.findOne({
      jobPost: job._id,
      resume: resume._id,
    });

    let matchResult;
    if (existingMatch) {
      existingMatch.overallScore = overallScore;
      existingMatch.categoryScores = {
        skillsMatch: Math.round(skillsMatchScore),
        experienceMatch: 0,
        educationMatch: 0,
        roleMatch: 0,
      };
      existingMatch.matchedSkills = matchedSkills;
      existingMatch.missingSkills = missingSkills;
      existingMatch.matchDate = new Date();
      existingMatch.matchMethod = 'vector';
      // Add candidate details to match result
      existingMatch.candidateDetails = candidateInSampleFormat;
      matchResult = await existingMatch.save();
    } else {
      matchResult = await ResumeMatchResult.create({
        jobPost: job._id,
        resume: resume._id,
        recruiter: recruiterId,
        overallScore,
        categoryScores: {
          skillsMatch: Math.round(skillsMatchScore),
          experienceMatch: 0,
          educationMatch: 0,
          roleMatch: 0,
        },
        matchedSkills,
        missingSkills,
        matchDate: new Date(),
        matchMethod: 'vector',
        modelVersion: 'text-embedding-ada-002',
        candidateDetails: candidateInSampleFormat
      });
    }

    matchResults.push(matchResult);
  }

  // Sort results by score (descending)
  matchResults.sort((a, b) => b.overallScore - a.overallScore);
  candidatesInSampleFormat.sort((a, b) => b.score - a.score);

  // You can return both formats or choose one based on your needs
  return candidatesInSampleFormat;
};

export const getCandidatesForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const recruiterId = (req as any).recruiterId;
    const matchResults = await ResumeMatchResult.find({
      jobPost: jobId,
      recruiter: recruiterId
    })
      .populate('resume')
      .sort({ overallScore: -1 });
    const candidatesInSampleFormat = matchResults.map((match: any) => match.candidateDetails);
    res.status(200).json({
      candidates: candidatesInSampleFormat,
      totalCandidates: candidatesInSampleFormat.length
    });
  } catch (error) {
    logger.error('Error fetching candidates:', error);
    res.status(500).json({ message: 'Error fetching candidates' });
  }
};

/**
 * Get match results for a job
 * @route GET /api/jobs/:jobId/matches
 * @access Private
 */
export const getJobMatchResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const recruiterId = (req as any).recruiterId;

    // Verify job exists and belongs to recruiter
    const job = await JobPost.findOne({
      _id: jobId,
      recruiter: recruiterId,
    });

    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get match results
    const matches = await ResumeMatchResult.find({ jobPost: jobId })
      .sort({ overallScore: -1 })
      .skip(skip)
      .limit(limit)
      .populate('resume', 'fileName originalFileName')
      .exec();

    // Get total count for pagination
    const total = await ResumeMatchResult.countDocuments({ jobPost: jobId });

    res.status(200).json({
      matches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting job match results:', error);
    res.status(500).json({ message: 'Error retrieving match results' });
  }
};


// Types
interface BatchUploadRequest {
  files: Express.Multer.File[];
  recruiterId: string;
  body: {
    jobMode: 'new' | 'existing';
    title?: string;
    description?: string;
    jobId?: string;
  };
}

interface ProcessedResume {
  file: Express.Multer.File;
  resume?: any;
  error?: string;
  candidateDetails?: any;
}

export interface BatchUploadResponse {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
    validationFailed: number;
  };
  successful: Array<{
    id: string;
    fileName: string;
    originalFileName: string;
    uploadDate: Date;
    candidateDetails: any;
  }>;
  failed: Array<{
    fileName: string;
    error: string;
    stage: 'validation' | 'parsing' | 'extraction' | 'database';
  }>;
  matchResults?: any[];
}

/**
 * Upload multiple resumes in batch
 * @route POST /api/resumes/bulk-upload
 * @access Private
 */

// Utility functions
const partition = <T>(predicate: (item: T) => boolean) => 
  (items: T[]): [T[], T[]] => [
    items.filter(predicate),
    items.filter(item => !predicate(item))
  ];

const cleanupFailedFiles = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(files.map(file => deleteFile(file.path).catch(() => {})));
};

// Helper function to normalize files array
const getFilesArray = (files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined): Express.Multer.File[] => {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  
  // If files is an object, flatten all arrays into a single array
  return Object.values(files).flat();
};

// Business logic functions
const createJobIfNeeded = async (
  jobMode: string,
  title: string | undefined,
  description: string | undefined,
  jobId: string | undefined,
  recruiterId: string
) => {
  if (jobMode === 'new') {
    if (!title || !description) {
      throw new Error('Job title and description are required for new job');
    }
    const job = new JobPost({
      title,
      description,
      recruiter: recruiterId,
    });
    await job.save();
    return { job, usedJobId: job._id };
  } else {
    const job = await JobPost.findOne({ _id: jobId, recruiter: recruiterId });
    if (!job) {
      throw new Error('Job not found');
    }
    return { job, usedJobId: jobId };
  }
};

const processValidFile = async (
  validatedFile: ValidatedFile,
  file: Express.Multer.File,
  recruiterId: string,
  cloudinaryResult?: any
): Promise<ProcessedResume> => {
  try {
    // Extract text from file
    let parsedText = '';
    try {
      parsedText = await extractTextFromFile(file.path, file.mimetype);
      parsedText = cleanExtractedText(parsedText);
    } catch (error) {
      await deleteFile(file.path);
      return {
        file,
        error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Extract candidate details
    let candidateDetails;
    try {
      candidateDetails = await extractCandidateDetails(parsedText);
    } catch (error) {
      await deleteFile(file.path);
      return {
        file,
        error: `Failed to extract candidate details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Create resume record
    const resume = new Resume({
      fileName: file.filename,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: file.path,
      parsedText,
      recruiter: recruiterId,
      isProcessed: true,
      candidateDetails,
      // Add Cloudinary information if available
      cloudinary: cloudinaryResult ? {
        publicId: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        resourceType: cloudinaryResult.resource_type
      } : undefined
    });

    await resume.save();

    return {
      file,
      resume,
      candidateDetails,
    };
  } catch (error) {
    await deleteFile(file.path);
    return {
      file,
      error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Controller functions
export const batchUploadResumes = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // Type assertion for multer files
    const files = req.files as Express.Multer.File[];
    const recruiterId = (req as any).recruiterId;
    
    // Input validation
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    if (files.length > 10) {
      await cleanupFailedFiles(files);
      res.status(400).json({ message: 'Maximum 10 files allowed per batch' });
      return;
    }

    const { jobMode, title, description, jobId } = req.body;

    // Step 1: Pre-validate all files
    logger.info(`Starting pre-validation for ${files.length} files`);
    const filePaths = files.map(file => file.path);
    const validationResult = await validateFiles(filePaths)();
    // If too many files failed validation, stop early
    if (!validationResult.summary.shouldProceed) {
      await cleanupFailedFiles(files);
      
      const failedValidation = validationResult.invalid.map(invalid => {
        const file = files.find(f => f.path === invalid.path);
        return {
          fileName: file?.originalname || invalid.name,
          error: invalid.validation.error || 'Validation failed',
          stage: 'validation' as const,
        };
      });

      res.status(400).json({
        message: 'Too many files failed validation. Please fix issues and retry.',
        summary: {
          total: files.length,
          successful: 0,
          failed: validationResult.invalid.length,
          validationFailed: validationResult.invalid.length,
        },
        successful: [],
        failed: failedValidation,
      } as BatchUploadResponse);
      return;
    }

    // Step 2: Create or validate job
    let job, usedJobId;
    try {
      ({ job, usedJobId } = await createJobIfNeeded(jobMode, title, description, jobId, recruiterId));
    } catch (error) {
      await cleanupFailedFiles(files);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Job creation failed' 
      });
      return;
    }

    // Step 3: Process only validated files
    const validFilePaths = new Set(validationResult.valid.map(v => v.path));
    const [validFiles, invalidFiles] = partition<Express.Multer.File>(
      file => validFilePaths.has(file.path)
    )(files);

    logger.info(`Processing ${validFiles.length} valid files, skipping ${invalidFiles.length} invalid files`);

    // Process valid files in batches
    const BATCH_SIZE = 3;
    const processedResults: ProcessedResume[] = [];

    // Import the uploadToCloudinary function
    const { uploadToCloudinary } = await import('../config/cloudinary');

    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async file => {
          const validatedFile = validationResult.valid.find(v => v.path === file.path)!;
          
          // Try to upload to Cloudinary first
          let cloudinaryResult;
          try {
            cloudinaryResult = await uploadToCloudinary(file.path, {
              folder: 'resumes',
              public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
              resource_type: 'raw'
            });
            logger.info(`Successfully uploaded ${file.originalname} to Cloudinary`);
          } catch (cloudinaryError) {
            logger.error(`Error uploading ${file.originalname} to Cloudinary:`, cloudinaryError);
            // Continue with local file if Cloudinary upload fails
          }
          
          // Process the file with Cloudinary information if available
          const result = await processValidFile(validatedFile, file, recruiterId, cloudinaryResult);
          
          // If Cloudinary upload was successful, delete the local file
          if (cloudinaryResult) {
            await deleteFile(file.path).catch(err => 
              logger.error(`Error deleting local file ${file.path} after Cloudinary upload:`, err)
            );
          }
          
          return result;
        })
      );
      processedResults.push(...batchResults);
      
      if (i + BATCH_SIZE < validFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Clean up invalid files
    await cleanupFailedFiles(invalidFiles);

    // Separate successful and failed processing results
    const [successfulResults, failedResults] = partition<ProcessedResume>(
      result => !!result.resume && !result.error
    )(processedResults);

    await cleanupFailedFiles(failedResults.map(r => r.file));

    // Step 4: Match successful resumes to job
    let matchResults = [];
    if (successfulResults.length > 0) {
      try {
        const resumes = successfulResults.map(r => r.resume).filter(Boolean);
        matchResults = await matchResumesToJobCore(job, resumes, recruiterId, jobMode);
      } catch (error) {
        logger.error('Error matching resumes to job:', error);
      }
    }

    // Prepare response
    const successful = successfulResults.map(result => ({
      id: result.resume._id,
      fileName: result.resume.fileName,
      originalFileName: result.resume.originalFileName,
      uploadDate: result.resume.uploadDate,
      candidateDetails: result.candidateDetails,
    }));

    const failed = [
      ...validationResult.invalid.map(invalid => {
        const file = files.find(f => f.path === invalid.path);
        return {
          fileName: file?.originalname || invalid.name,
          error: invalid.validation.error || 'Validation failed',
          stage: 'validation' as const,
        };
      }),
      ...failedResults.map(result => ({
        fileName: result.file.originalname,
        error: result.error || 'Processing failed',
        stage: 'parsing' as const,
      })),
    ];

    // Delete all successful files after processing
    await Promise.all(successfulResults.map(result => 
      deleteFile(result.file.path).catch(err => 
        logger.error(`Error deleting successful file ${result.file.path}:`, err)
      )
    ));
    logger.info(`Deleted ${successfulResults.length} successfully processed files`);

    const processingTime = Date.now() - startTime;
    logger.info(`Batch upload completed in ${processingTime}ms: ${successful.length} successful, ${failed.length} failed`);

    const response: BatchUploadResponse = {
      message: successful.length > 0 
        ? `Batch upload completed: ${successful.length} successful, ${failed.length} failed`
        : 'All files failed processing',
      summary: {
        total: files.length,
        successful: successful.length,
        failed: failed.length,
        validationFailed: validationResult.invalid.length,
      },
      successful,
      failed,
      matchResults: matchResults || [],
    };

    const statusCode = successful.length > 0 ? 201 : 400;
    res.status(statusCode).json(response);

  } catch (error) {
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      await cleanupFailedFiles(files);
    }

    logger.error('Unexpected error in batch upload:', error);
    res.status(500).json({ 
      message: 'Unexpected error during batch upload',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};