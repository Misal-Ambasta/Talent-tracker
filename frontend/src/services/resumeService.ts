import axiosInstance from '../utils/axiosInstance';
import { API_BASE_URL, API_URLS } from '../config/api';

// Interface matching the backend Resume model
export interface ResumeData {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  parsedText: string;
  recruiter: string; // Recruiter ID
  uploadDate: string;
  isProcessed: boolean;
  processingError?: string;
}

// Interface matching the backend ResumeMatchResult model
export interface ResumeMatchResult {
  _id: string;
  jobPost: string; // Job ID
  resume: string; // Resume ID or populated Resume object
  recruiter: string; // Recruiter ID
  overallScore: number;
  categoryScores?: {
    skillsMatch?: number;
    experienceMatch?: number;
    educationMatch?: number;
    roleMatch?: number;
  };
  matchedSkills?: string[];
  missingSkills?: string[];
  matchSummary?: string;
  matchDate: string;
  matchMethod: 'vector' | 'keyword' | 'hybrid';
  modelVersion?: string;
}

/**
 * Upload a resume file
 */
export const uploadResume = async ({ resumeFile, jobMode, jobId, title, description }: {
  resumeFile: File,
  jobMode: string,
  jobId?: string,
  title?: string,
  description?: string
}): Promise<any> => {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  if (jobMode) formData.append('jobMode', jobMode);
  if (jobId) formData.append('jobId', jobId);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  const response = await axiosInstance.post(`${API_URLS.RESUMES}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Fetch all resumes for the authenticated recruiter
 */
export const fetchResumes = async (): Promise<{ resumes: ResumeData[] }> => {
  const response = await axiosInstance.get(API_URLS.RESUMES);
  return response.data;
};

/**
 * Fetch a specific resume by ID
 */
export const fetchResumeById = async (resumeId: string): Promise<{ resume: ResumeData }> => {
  const response = await axiosInstance.get(`${API_URLS.RESUMES}/${resumeId}`);
  return response.data;
};

/**
 * Download a resume file
 */
export const downloadResume = async (resumeId: string): Promise<Blob> => {
  const response = await axiosInstance.get(`${API_URLS.RESUMES}/${resumeId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Delete a resume
 */
export const deleteResume = async (resumeId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.RESUMES}/${resumeId}`);
};

/**
 * Match resumes to a job
 */
export const matchResumesToJob = async (jobId: string, resumeIds: string[]): Promise<{ matches: ResumeMatchResult[] }> => {
  const response = await axiosInstance.post(`${API_URLS.JOBS}/${jobId}/resumes/match`, { resumeIds });
  return response.data;
};

/**
 * Get match results for a job
 */
export const getJobMatchResults = async (jobId: string): Promise<{ matches: ResumeMatchResult[] }> => {
  const response = await axiosInstance.get(`${API_URLS.JOBS}/${jobId}/matches`);
  return response.data;
};