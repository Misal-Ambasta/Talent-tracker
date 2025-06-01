import axiosInstance from '../utils/axiosInstance';
import { API_BASE_URL, API_URLS } from '../config/api';

// Interface matching the backend Applicant model
export interface ApplicantData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  yearsOfExperience?: number;
  education?: {
    degree?: string;
    institution?: string;
    graduationYear?: number;
  };
  status: 'new' | 'screening' | 'interview' | 'technical' | 'offer' | 'hired' | 'rejected';
  notes?: string;
  tags?: string[];
  resume: string; // Resume ID
  matchScore?: number;
}

export interface Applicant extends ApplicantData {
  _id: string;
  jobPost: string; // Job ID
  recruiter: string; // Recruiter ID
  applicationDate: string;
  lastUpdated: string;
}

/**
 * Fetch all applicants for a specific job
 */
export const fetchApplicants = async (jobId?: string): Promise<{ applicants: Applicant[] }> => {
  const url = jobId ? `${API_URLS.JOBS}/${jobId}/applicants` : API_URLS.APPLICANTS;
  const response = await axiosInstance.get(url);
  return response.data;
};

/**
 * Fetch a specific applicant by ID
 */
export const fetchApplicantById = async (applicantId: string): Promise<{ applicant: Applicant }> => {
  const response = await axiosInstance.get(`${API_URLS.APPLICANTS}/${applicantId}`);
  return response.data;
};

/**
 * Create a new applicant for a job
 */
export const createApplicant = async (jobId: string, applicantData: Omit<ApplicantData, 'resume'>, resumeFile: File): Promise<{ applicant: Applicant }> => {
  // First upload the resume
  const formData = new FormData();
  formData.append('resume', resumeFile);
  
  const resumeResponse = await axiosInstance.post(`${API_URLS.RESUMES}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  const resumeId = resumeResponse.data.resume._id;
  
  // Then create the applicant with the resume ID
  const response = await axiosInstance.post(`${API_URLS.JOBS}/${jobId}/applicants`, {
    ...applicantData,
    resume: resumeId,
  });
  
  return response.data;
};

/**
 * Update an existing applicant
 */
export const updateApplicant = async (applicantId: string, applicantData: Partial<ApplicantData>): Promise<{ applicant: Applicant }> => {
  const response = await axiosInstance.put(`${API_URLS.APPLICANTS}/${applicantId}`, applicantData);
  return response.data;
};

/**
 * Update an applicant's status
 */
export const updateApplicantStatus = async (
  applicantId: string, 
  status: Applicant['status'], 
  notes?: string
): Promise<{ applicant: Applicant }> => {
  const response = await axiosInstance.patch(`${API_URLS.APPLICANTS}/${applicantId}/status`, { status, notes });
  return response.data;
};

/**
 * Bulk update applicant statuses
 */
export const bulkUpdateApplicantStatus = async (
  applicantIds: string[], 
  status: Applicant['status']
): Promise<{ success: boolean; count: number }> => {
  const response = await axiosInstance.patch(`${API_URLS.APPLICANTS}/bulk-status`, { applicantIds, status });
  return response.data;
};

/**
 * Delete an applicant
 */
export const deleteApplicant = async (applicantId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.APPLICANTS}/${applicantId}`);
};