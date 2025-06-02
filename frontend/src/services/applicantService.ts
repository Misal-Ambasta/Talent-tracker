import axiosInstance from '../utils/axiosInstance';
import { API_BASE_URL, API_URLS } from '../config/api';

// Interface matching the backend Applicant model
export interface ApplicantData {
  fullName: string;
  email: string;
  phone?: string;
  positionAppliedFor: string;
  yearsOfExperience?: number;
  location?: string;
  skills?: string[];
  additionalNote?: string;
  recruiterId? : string,
  status?: 'new' | 'reviewing' | 'interview' | 'offer' | 'rejected';
}

export interface Applicant extends ApplicantData {
  _id: string;
  jobId?: string; // Job ID
  recruiter?: string; // Recruiter ID
  resume?: string; // Resume ID
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  applicationDate: string;
}

/**
 * Fetch all applicants
 */
export const fetchApplicants = async (): Promise<Applicant[]> => {
  const url =`${API_URLS.APPLICANTS}/all`;
  const response = await axiosInstance.get(url);
  return response.data.applicants;
};

/**
 * Fetch a specific applicant by ID
 */
export const fetchApplicantById = async (applicantId: string): Promise<Applicant> => {
  const response = await axiosInstance.get(`${API_URLS.APPLICANTS}/${applicantId}`);
  return response.data.applicant;
};

/**
 * Create a new applicant manually
 */
export const createApplicant = async (applicantData: ApplicantData): Promise<Applicant> => {
  const response = await axiosInstance.post(`${API_URLS.APPLICANTS}`, applicantData);
  return response.data.applicant;
};

/**
 * Upload a resume and create an applicant
 */
export const uploadResumeAndCreateApplicant = async (formData: FormData): Promise<{ applicant: Applicant, resume: any }> => {
  const response = await axiosInstance.post(`${API_URLS.APPLICANTS}/upload-resume`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Update an existing applicant
 */
export const updateApplicant = async (applicantId: string, applicantData: Partial<ApplicantData>): Promise<Applicant> => {
  const response = await axiosInstance.put(`${API_URLS.APPLICANTS}/${applicantId}`, applicantData);
  return response.data.applicant;
};

/**
 * Update an applicant's status
 */
export const updateApplicantStatus = async (
  applicantId: string, 
  status: Applicant['status'], 
  notes?: string
): Promise<Applicant> => {
  const response = await axiosInstance.patch(`${API_URLS.APPLICANTS}/${applicantId}/status`, { status, notes });
  return response.data.applicant;
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
export const deleteApplicant = async (applicantId: string): Promise<string> => {
  const response = await axiosInstance.delete(`${API_URLS.APPLICANTS}/${applicantId}`);
  return applicantId;
};