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
      recruiter: recruiterId,
    });

    if (!resume) {
      res.status(404).json({ message: 'Resume not found' });
      return;
    }

    // Delete the file
    const filePath = getResumePath(resume.fileName);
    await deleteFile(filePath);

    // Delete the database record
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
