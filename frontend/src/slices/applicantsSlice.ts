import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchApplicants, fetchApplicantById, createApplicant, updateApplicantStatus as updateStatus, deleteApplicant } from '../services/applicantService';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Applicant as ApplicantType } from '../services/applicantService';

interface Applicant {
  _id: string;
  jobPost: string;
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
  resume: string;
  matchScore?: number;
  recruiter: string;
  applicationDate: string;
  lastUpdated: string;
}

interface ApplicantsState {
  applicants: Applicant[];
  currentApplicant: Applicant | null;
  loading: boolean;
  error: string | null;
}

const initialState: ApplicantsState = {
  applicants: [],
  currentApplicant: null,
  loading: false,
  error: null,
};

// Async thunks using the applicant service
export const getApplicants = createAsyncThunk(
  'applicants/getApplicants',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await fetchApplicants(jobId);
      return response.applicants;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applicants');
    }
  }
);

export const getApplicantById = createAsyncThunk(
  'applicants/getApplicantById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetchApplicantById(id);
      return response.applicant;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applicant');
    }
  }
);

export const addApplicant = createAsyncThunk(
  'applicants/addApplicant',
  async (
    { jobId, applicantData, resumeFile }: 
    { 
      jobId: string; 
      applicantData: Omit<ApplicantType, 'resume'>; 
      resumeFile: File 
    }, 
    { rejectWithValue }
  ) => {
    try {
      const response = await createApplicant(jobId, applicantData, resumeFile);
      return response.applicant;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create applicant');
    }
  }
);

export const updateApplicantStatus = createAsyncThunk(
  'applicants/updateApplicantStatus',
  async (
    { id, status, notes }: { id: string; status: Applicant['status']; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await updateStatus(id, status, notes);
      return response.applicant;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update applicant status');
    }
  }
);

export const removeApplicant = createAsyncThunk(
  'applicants/removeApplicant',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteApplicant(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete applicant');
    }
  }
);

const applicantsSlice = createSlice({
  name: 'applicants',
  initialState,
  reducers: {
    clearApplicantError: (state) => {
      state.error = null;
    },
    clearCurrentApplicant: (state) => {
      state.currentApplicant = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all applicants
      .addCase(getApplicants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getApplicants.fulfilled, (state, action: PayloadAction<Applicant[]>) => {
        state.loading = false;
        state.applicants = action.payload;
      })
      .addCase(getApplicants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get applicant by ID
      .addCase(getApplicantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getApplicantById.fulfilled, (state, action: PayloadAction<Applicant>) => {
        state.loading = false;
        state.currentApplicant = action.payload;
      })
      .addCase(getApplicantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add new applicant
      .addCase(addApplicant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addApplicant.fulfilled, (state, action: PayloadAction<Applicant>) => {
        state.loading = false;
        state.applicants.push(action.payload);
      })
      .addCase(addApplicant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update applicant status
      .addCase(updateApplicantStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApplicantStatus.fulfilled, (state, action: PayloadAction<Applicant>) => {
        state.loading = false;
        const index = state.applicants.findIndex((applicant) => applicant._id === action.payload._id);
        if (index !== -1) {
          state.applicants[index] = action.payload;
        }
        if (state.currentApplicant?._id === action.payload._id) {
          state.currentApplicant = action.payload;
        }
      })
      .addCase(updateApplicantStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Remove applicant
      .addCase(removeApplicant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeApplicant.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.applicants = state.applicants.filter((applicant) => applicant._id !== action.payload);
        if (state.currentApplicant?._id === action.payload) {
          state.currentApplicant = null;
        }
      })
      .addCase(removeApplicant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearApplicantError, clearCurrentApplicant } = applicantsSlice.actions;
export default applicantsSlice;