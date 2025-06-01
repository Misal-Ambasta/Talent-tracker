import axiosInstance from '../utils/axiosInstance';
import { API_URLS } from '../config/api';

// Types matching the backend BiasReport model
export type BiasCategory = 
  | 'gender' 
  | 'age' 
  | 'race' 
  | 'ethnicity' 
  | 'disability' 
  | 'religion' 
  | 'socioeconomic' 
  | 'appearance' 
  | 'other';

export type BiasRiskLevel = 'low' | 'medium' | 'high';

export type ContentType = 'job_description' | 'interview_question' | 'feedback' | 'other';

export interface BiasDetection {
  category: BiasCategory;
  biasedText: string;
  explanation: string;
  suggestion: string;
  confidence: number; // 0-1 score
}

export interface BiasReport {
  _id: string;
  recruiter: string; // Recruiter ID
  originalText: string;
  contentType: ContentType;
  detections: BiasDetection[];
  overallRiskLevel: BiasRiskLevel;
  improvedText?: string;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Analyze text for bias
 */
export const analyzeTextForBias = async (
  text: string, 
  contentType: ContentType
): Promise<{ report: BiasReport }> => {
  const payload = {
    text,
    contentType
  };
  
  const response = await axiosInstance.post(`${API_URLS.BIAS}/detect`, payload);
  return response.data;
};

/**
 * Fetch all bias reports for the authenticated recruiter
 */
export const fetchBiasReports = async (): Promise<{ reports: BiasReport[] }> => {
  const response = await axiosInstance.get(API_URLS.BIAS);
  return response.data;
};

/**
 * Fetch a specific bias report by ID
 */
export const fetchBiasReportById = async (reportId: string): Promise<{ report: BiasReport }> => {
  const response = await axiosInstance.get(`${API_URLS.BIAS}/${reportId}`);
  return response.data;
};

/**
 * Generate improved text based on bias analysis
 */
export const generateImprovedText = async (reportId: string): Promise<{ report: BiasReport }> => {
  const response = await axiosInstance.post(`${API_URLS.BIAS}/${reportId}/improve`);
  return response.data;
};

/**
 * Delete a bias report
 */
export const deleteBiasReport = async (reportId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.BIAS}/${reportId}`);
};