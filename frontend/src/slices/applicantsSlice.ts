import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import {
  fetchApplicants,
  fetchApplicantById,
  createApplicant,
  updateApplicantStatus as updateStatus,
  deleteApplicant,
  bulkUpdateApplicantStatus,
  uploadResumeAndCreateApplicant,
} from '../services/applicantService';
import { Applicant, ApplicantData } from '../services/applicantService';

// Applicant interface is now imported from applicantService.ts

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
  async (j, { rejectWithValue }) => {
    try {
      const applicants = await fetchApplicants();
      return applicants;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applicants');
    }
  }
);

export const getApplicantById = createAsyncThunk(
  'applicants/getApplicantById',
  async (id: string, { rejectWithValue }) => {
    try {
      const applicant = await fetchApplicantById(id);
      return applicant;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applicant');
    }
  }
);

// Add a new applicant manually
export const addApplicant = createAsyncThunk(
  'applicants/addApplicant',
  async (applicantData: ApplicantData, { rejectWithValue }) => {
    try {
      const applicant = await createApplicant(applicantData);
      return applicant;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add applicant');
    }
  }
);

// Add a new applicant by uploading a resume
export const uploadResumeApplicant = createAsyncThunk(
  'applicants/uploadResumeApplicant',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await uploadResumeAndCreateApplicant(formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload resume and create applicant');
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
      const applicant = await updateStatus(id, status, notes);
      return applicant;
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
      .addCase(getApplicants.fulfilled, (state, action) => {
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
      .addCase(getApplicantById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentApplicant = action.payload;
      })
      .addCase(getApplicantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add applicant manually
      .addCase(addApplicant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addApplicant.fulfilled, (state, action) => {
        state.loading = false;
        state.applicants.push(action.payload);
      })
      .addCase(addApplicant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add applicant by uploading resume
      .addCase(uploadResumeApplicant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadResumeApplicant.fulfilled, (state, action) => {
        state.loading = false;
        state.applicants.push(action.payload.applicant);
      })
      .addCase(uploadResumeApplicant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update applicant status
      .addCase(updateApplicantStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApplicantStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.applicants.findIndex(
          (applicant) => applicant._id === action.payload._id
        );
        if (index !== -1) {
          state.applicants[index] = action.payload;
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
      .addCase(removeApplicant.fulfilled, (state, action) => {
        state.loading = false;
        state.applicants = state.applicants.filter(
          (applicant) => applicant._id !== action.payload
        );
      })
      .addCase(removeApplicant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearApplicantError, clearCurrentApplicant } = applicantsSlice.actions;
export const selectApplicants = (state: RootState) => state.applicants.applicants;
export const selectCurrentApplicant = (state: RootState) => state.applicants.currentApplicant;
export const selectApplicantsLoading = (state: RootState) => state.applicants.loading;
export const selectApplicantsError = (state: RootState) => state.applicants.error;

export default applicantsSlice.reducer;