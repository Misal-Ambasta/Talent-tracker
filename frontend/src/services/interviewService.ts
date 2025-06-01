import axiosInstance from '../utils/axiosInstance';
import { API_URLS } from '../config/api';

// Interface matching the backend InterviewAudio model
export interface InterviewAudio {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  duration: number; // Duration in seconds
  recruiter: string; // Recruiter ID
  applicant: string; // Applicant ID
  uploadDate: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  transcriptionJobId?: string;
}

// Interface matching the backend InterviewSummary model
export interface InterviewSummary {
  _id: string;
  interviewAudio?: string; // InterviewAudio ID (optional for text input)
  recruiter: string; // Recruiter ID
  applicant: string; // Applicant ID
  transcription: string;
  transcriptionConfidence: number; // 0-1 score
  summary: string;
  overallScore: number; // 0-100 score
  categoryScores: {
    technicalSkills: number; // 0-100 score
    communication: number; // 0-100 score
    problemSolving: number; // 0-100 score
    culturalFit: number; // 0-100 score
    experience: number; // 0-100 score
  };
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
  recommendationConfidence: number; // 0-1 score
  aiModel: string; // Model used for analysis
  inputType?: 'audio' | 'text' | 'recording'; // Type of input
  createdAt: string;
  updatedAt: string;
}

/**
 * Upload an interview audio file
 */
export const uploadInterviewAudio = async (audioFile: File, applicantId: string): Promise<{ message: string; summary: any }> => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('applicantId', applicantId);
  
  const response = await axiosInstance.post(`${API_URLS.INTERVIEWS}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Fetch all interviews for the authenticated recruiter
 */
export const fetchInterviews = async (): Promise<{ interviews: InterviewAudio[] }> => {
  const response = await axiosInstance.get(API_URLS.INTERVIEWS);
  return response.data;
};

/**
 * Fetch a specific interview by ID
 */
export const fetchInterviewById = async (interviewId: string): Promise<{ interview: InterviewAudio }> => {
  const response = await axiosInstance.get(`${API_URLS.INTERVIEWS}/${interviewId}`);
  return response.data;
};

/**
 * Process an interview audio to generate transcription and summary
 */
export const processInterviewAudio = async (interviewId: string): Promise<{ message: string; jobId: string }> => {
  const response = await axiosInstance.post(`${API_URLS.INTERVIEWS}/${interviewId}/process`);
  return response.data;
};

/**
 * Process interview text input to generate summary
 */
export const processInterviewText = async (applicantId: string, text: string, includeJobContext: boolean = true): Promise<{ summary: InterviewSummary }> => {
  const response = await axiosInstance.post(`${API_URLS.INTERVIEWS}/process-text`, {
    applicantId,
    text,
    includeJobContext
  });
  return response.data;
};

/**
 * Process recorded audio blob to generate transcription and summary
 */
export const processRecordedAudio = async (audioBlob: Blob, applicantId: string): Promise<{ interview: InterviewAudio }> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('applicantId', applicantId);
  
  const response = await axiosInstance.post(`${API_URLS.INTERVIEWS}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Get interview summary by interview ID
 */
export const getInterviewSummary = async (interviewId: string): Promise<{ summary: InterviewSummary }> => {
  const response = await axiosInstance.get(`${API_URLS.INTERVIEWS}/${interviewId}/summary`);
  return response.data;
};

/**
 * Get audio stream URL
 */
export const getInterviewAudioUrl = (interviewId: string): string => {
  return `${API_URLS.INTERVIEWS}/${interviewId}/audio`;
};

/**
 * Delete an interview and its summary
 */
export const deleteInterview = async (interviewId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.INTERVIEWS}/${interviewId}`);
};