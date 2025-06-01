import axiosInstance from '../utils/axiosInstance';
import { API_URLS } from '../config/api';

// Interface matching the backend JobPost model
export interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  responsibilities: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  skills: string[];
  applicationDeadline?: string;
  isRemote: boolean;
  isActive: boolean;
  department: string;
  postedDate: string;
  closingDate: string;
  status: 'open' | 'closed';
}

export interface Job extends JobData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all jobs for the authenticated recruiter
 */
export const fetchJobs = async (): Promise<{ jobs: Job[] }> => {
  const response = await axiosInstance.get(API_URLS.JOBS);
  return response.data;
};

/**
 * Fetch a specific job by ID
 */
export const fetchJobById = async (jobId: string): Promise<{ job: Job }> => {
  const response = await axiosInstance.get(`${API_URLS.JOBS}/${jobId}`);
  return response.data;
};

/**
 * Create a new job posting
 */
export const createJob = async (jobData: JobData): Promise<{ job: Job }> => {
  const response = await axiosInstance.post(API_URLS.JOBS, jobData);
  return response.data;
};

/**
 * Update an existing job posting
 */
export const updateJob = async (jobId: string, jobData: Partial<JobData>): Promise<{ job: Job }> => {
  const response = await axiosInstance.put(`${API_URLS.JOBS}/${jobId}`, jobData);
  return response.data;
};

/**
 * Delete a job posting
 */
export const deleteJob = async (jobId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.JOBS}/${jobId}`);
};