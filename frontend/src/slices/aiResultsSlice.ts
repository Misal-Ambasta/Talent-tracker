import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { matchResumesToJob, bulkUploadResumes } from '../services/resumeService';
import { processInterviewAudio, getInterviewSummary, processInterviewText } from '../services/interviewService';
import { summarizeChat } from '../services/chatService';
import { analyzeTextForBias } from '../services/biasService';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ResumeMatchResult } from '../services/resumeService';
import type { InterviewSummary } from '../services/interviewService';
import type { ChatSummary as IChatSummary } from '../services/chatService';
import type { BiasReport } from '../services/biasService';
import { uploadInterviewAudio } from '../services/interviewService';

interface ResumeAnalysis {
  _id: string;
  jobPost: string;
  resume: string;
  recruiter: string;
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
  matchMethod: 'vector' | 'keyword' | 'hybrid' | 'gpt-4o';
  modelVersion?: string;
}

interface InterviewAnalysis {
  _id: string;
  interviewAudio: string;
  recruiter: string;
  applicant: string;
  transcription: string;
  transcriptionConfidence: number;
  summary: string;
  overallScore: number;
  categoryScores: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    culturalFit: number;
    experience: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
  recommendationConfidence: number;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSummary {
  _id: string;
  recruiter: string;
  applicant?: string;
  chatText: string;
  summary: string;
  keyPoints: string[];
  questions: string[];
  answers: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

interface BiasDetection {
  _id: string;
  recruiter: string;
  originalText: string;
  contentType: 'job_description' | 'interview_question' | 'feedback' | 'other';
  detections: {
    category: string;
    biasedText: string;
    explanation: string;
    suggestion: string;
    confidence: number;
  }[];
  overallRiskLevel: 'low' | 'medium' | 'high';
  improvedText?: string;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

interface AiResultsState {
  resumeAnalyses: ResumeAnalysis[];
  interviewAnalyses: InterviewAnalysis[];
  chatSummaries: ChatSummary[];
  biasDetections: BiasDetection[];
  currentResumeAnalysis: ResumeAnalysis | null;
  currentInterviewAnalysis: InterviewAnalysis | null;
  currentChatSummary: ChatSummary | null;
  currentBiasDetection: BiasDetection | null;
  loading: boolean;
  error: string | null;
}

const initialState: AiResultsState = {
  resumeAnalyses: [],
  interviewAnalyses: [],
  chatSummaries: [],
  biasDetections: [],
  currentResumeAnalysis: null,
  currentInterviewAnalysis: null,
  currentChatSummary: null,
  currentBiasDetection: null,
  loading: false,
  error: null,
};

// Async thunks using the new service files
export const analyzeResumeForJob = createAsyncThunk(
  'aiResults/analyzeResumeForJob',
  async (
    { jobId, resumeId }: { jobId: string; resumeId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await matchResumesToJob(jobId, [resumeId]);
      return response.matches[0];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to analyze resume');
    }
  }
);

export const analyzeInterviewAudio = createAsyncThunk(
  'aiResults/analyzeInterviewAudio',
  async (
    { interviewId }: { interviewId: string },
    { rejectWithValue }
  ) => {
    try {
      // First process the audio
      await processInterviewAudio(interviewId);
      
      // Then get the summary
      const response = await getInterviewSummary(interviewId);
      return response.summary;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to analyze interview');
    }
  }
);

export const processInterviewTextInput = createAsyncThunk(
  'aiResults/processInterviewTextInput',
  async (
    { applicantId, text, includeJobContext = true }: { applicantId: string; text: string; includeJobContext?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await processInterviewText(applicantId, text, includeJobContext);
      return response.summary;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process interview text');
    }
  }
);

export const summarizeChatConversation = createAsyncThunk(
  'aiResults/summarizeChatConversation',
  async (
    { chatText, applicantId }: { chatText: string; applicantId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await summarizeChat(chatText, applicantId);
      return response.summary;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to summarize chat');
    }
  }
);

export const detectBiasInDocument = createAsyncThunk(
  'aiResults/detectBiasInDocument',
  async (
    {
      text,
      contentType,
    }: {
      text: string;
      contentType: 'job_description' | 'interview_question' | 'feedback' | 'other';
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await analyzeTextForBias(text, contentType);
      return response.report;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to detect bias');
    }
  }
);

export const uploadInterviewAudioThunk = createAsyncThunk(
  'aiResults/uploadInterviewAudio',
  async (
    { file }: { file: File },
    { rejectWithValue }
  ) => {
    try {
      const response = await uploadInterviewAudio(file, ''); // No applicantId needed
      return response.summary;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload and process audio');
    }
  }
);

// Bulk upload thunk
export const bulkUploadResumesThunk = createAsyncThunk(
  'aiResults/bulkUploadResumes',
  async ({
    resumeFiles,
    jobMode,
    jobId,
    title,
    description
  }: {
    resumeFiles: File[],
    jobMode: string,
    jobId?: string,
    title?: string,
    description?: string
  }, { rejectWithValue }) => {
    try {
      const response = await bulkUploadResumes({
        resumeFiles,
        jobMode,
        jobId,
        title,
        description
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const aiResultsSlice = createSlice({
  name: 'aiResults',
  initialState,
  reducers: {
    clearAiError: (state) => {
      state.error = null;
    },
    clearCurrentResumeAnalysis: (state) => {
      state.currentResumeAnalysis = null;
    },
    clearCurrentInterviewAnalysis: (state) => {
      state.currentInterviewAnalysis = null;
    },
    clearCurrentChatSummary: (state) => {
      state.currentChatSummary = null;
    },
    clearCurrentBiasDetection: (state) => {
      state.currentBiasDetection = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Resume analysis
      .addCase(analyzeResumeForJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(analyzeResumeForJob.fulfilled, (state, action: PayloadAction<ResumeMatchResult>) => {
        state.loading = false;
        const resumeAnalysis = action.payload as unknown as ResumeAnalysis;
        state.resumeAnalyses.push(resumeAnalysis);
        state.currentResumeAnalysis = resumeAnalysis;
      })
      .addCase(analyzeResumeForJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Interview analysis
      .addCase(analyzeInterviewAudio.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(analyzeInterviewAudio.fulfilled, (state, action: PayloadAction<InterviewSummary>) => {
        state.loading = false;
        const interviewAnalysis = action.payload as unknown as InterviewAnalysis;
        state.interviewAnalyses.push(interviewAnalysis);
        state.currentInterviewAnalysis = interviewAnalysis;
      })
      .addCase(analyzeInterviewAudio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Process interview text
      .addCase(processInterviewTextInput.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processInterviewTextInput.fulfilled, (state, action: PayloadAction<InterviewSummary>) => {
        state.loading = false;
        const interviewAnalysis = action.payload as unknown as InterviewAnalysis;
        state.interviewAnalyses.push(interviewAnalysis);
        state.currentInterviewAnalysis = interviewAnalysis;
      })
      .addCase(processInterviewTextInput.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Audio transcription
      .addCase(uploadInterviewAudioThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadInterviewAudioThunk.fulfilled, (state, action: PayloadAction<InterviewSummary>) => {
        state.loading = false;
        const interviewAnalysis = action.payload as unknown as InterviewAnalysis;
        state.interviewAnalyses.push(interviewAnalysis);
        state.currentInterviewAnalysis = interviewAnalysis;
      })
      .addCase(uploadInterviewAudioThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Chat summary
      .addCase(summarizeChatConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(summarizeChatConversation.fulfilled, (state, action: PayloadAction<IChatSummary>) => {
        state.loading = false;
        const chatSummary = action.payload as unknown as ChatSummary;
        state.chatSummaries.push(chatSummary);
        state.currentChatSummary = chatSummary;
      })
      .addCase(summarizeChatConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Bias detection
      .addCase(detectBiasInDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(detectBiasInDocument.fulfilled, (state, action: PayloadAction<BiasReport>) => {
        state.loading = false;
        const biasDetection = action.payload as unknown as BiasDetection;
        state.biasDetections.push(biasDetection);
        state.currentBiasDetection = biasDetection;
      })
      .addCase(detectBiasInDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Bulk Upload Resumes
      .addCase(bulkUploadResumesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUploadResumesThunk.fulfilled, (state, action) => {
        state.loading = false;
        // If we have match results, add them to the resumeAnalysis array
        if (action.payload.matchResults && action.payload.matchResults.length > 0) {
          state.resumeAnalyses = action.payload.matchResults;
        }
      })
      .addCase(bulkUploadResumesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to upload resumes';
      });
  },
});

export const {
  clearAiError,
  clearCurrentResumeAnalysis,
  clearCurrentInterviewAnalysis,
  clearCurrentChatSummary,
  clearCurrentBiasDetection,
} = aiResultsSlice.actions;

export default aiResultsSlice.reducer;