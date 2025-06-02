import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchJobs, fetchJobById, createJob, updateJob, deleteJob } from '../services/jobService';
import type { Job as JobType } from '../services/jobService';

interface Job {
  _id: string;
  title: string;
  description: string;
  // requirements: string;
  responsibilities: string;
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
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
  company: string;
  recruiter?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  loading: false,
  error: null,
};

// Async thunks using the job service
export const getJobs = createAsyncThunk('jobs/getJobs', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchJobs();
    return response.jobs;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
  }
});

export const getJobById = createAsyncThunk(
  'jobs/getJobById',
  async (_id: string, { rejectWithValue }) => {
    try {
      const response = await fetchJobById(_id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job');
    }
  }
);

export const addJob = createAsyncThunk(
  'jobs/addJob',
  async (jobData: Omit<JobType, '_id'>, { rejectWithValue }) => {
    try {
      const response = await createJob(jobData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create job');
    }
  }
);

export const editJob = createAsyncThunk(
  'jobs/editJob',
  async ({ _id, jobData }: { _id: string; jobData: Partial<JobType> }, { rejectWithValue }) => {
    try {
      const response = await updateJob(_id, jobData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update job');
    }
  }
);

export const removeJob = createAsyncThunk(
  'jobs/removeJob',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteJob(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete job');
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearJobError: (state) => {
      state.error = null;
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all jobs
      .addCase(getJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getJobs.fulfilled, (state, action: PayloadAction<Job[]>) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(getJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get job by ID
      .addCase(getJobById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getJobById.fulfilled, (state, action: PayloadAction<Job>) => {
        state.loading = false;
        state.currentJob = action.payload;
      })
      .addCase(getJobById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add new job
      .addCase(addJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addJob.fulfilled, (state, action: PayloadAction<Job>) => {
        state.loading = false;
        state.jobs.unshift(action.payload); // Add new job to the beginning of the array
      })
      .addCase(addJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Edit job
      .addCase(editJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editJob.fulfilled, (state, action: PayloadAction<Job>) => {
        state.loading = false;
        const index = state.jobs.findIndex((job) => job._id === action.payload._id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        if (state.currentJob?._id === action.payload._id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(editJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Remove job
      .addCase(removeJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeJob.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.jobs = state.jobs.filter((job) => job._id !== action.payload);
        if (state.currentJob?._id === action.payload) {
          state.currentJob = null;
        }
      })
      .addCase(removeJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearJobError, clearCurrentJob } = jobsSlice.actions;
export default jobsSlice.reducer;