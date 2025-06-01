import axiosInstance from '../utils/axiosInstance';
import { API_URLS } from '../config/api';

// Interface matching the backend ChatSummary model
export interface ChatSummary {
  _id: string;
  recruiter: string; // Recruiter ID
  applicant?: string; // Optional Applicant ID
  chatText: string;
  summary: string;
  keyPoints: string[];
  questions: string[];
  answers: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number; // 0-1 score
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Summarize chat text
 */
export const summarizeChat = async (
  chatText: string, 
  applicantId?: string
): Promise<{ summary: ChatSummary }> => {
  const payload = {
    chatText,
    applicantId
  };
  
  const response = await axiosInstance.post(`${API_URLS.CHATS}/summarize`, payload);
  return response.data;
};

/**
 * Fetch all chat summaries for the authenticated recruiter
 */
export const fetchChatSummaries = async (): Promise<{ summaries: ChatSummary[] }> => {
  const response = await axiosInstance.get(API_URLS.CHATS);
  return response.data;
};

/**
 * Fetch a specific chat summary by ID
 */
export const fetchChatSummaryById = async (chatId: string): Promise<{ summary: ChatSummary }> => {
  const response = await axiosInstance.get(`${API_URLS.CHATS}/${chatId}`);
  return response.data;
};

/**
 * Delete a chat summary
 */
export const deleteChatSummary = async (chatId: string): Promise<void> => {
  await axiosInstance.delete(`${API_URLS.CHATS}/${chatId}`);
};