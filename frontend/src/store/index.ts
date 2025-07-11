import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../slices/authSlice';
import jobsSlice from '../slices/jobsSlice';
import applicantsSlice from '../slices/applicantsSlice';
import aiResultsSlice from '../slices/aiResultsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    jobs: jobsSlice,          
    applicants: applicantsSlice, 
    aiResults: aiResultsSlice,   
  },
  // Add middleware if needed
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;