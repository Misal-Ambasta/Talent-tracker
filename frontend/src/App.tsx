import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import JobManagement from "./pages/JobManagement";
import ApplicantManagement from "./pages/ApplicantManagement";
import ResumeMatching from "./pages/ResumeMatching";
import InterviewFeedback from "./pages/InterviewFeedback";
import NotFound from "./pages/NotFound";
import AIAssistant from "./pages/AIAssistant";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // Setup auth interceptor on app mount
  useEffect(() => {
    // setupAuthInterceptor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="recruitment-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Login />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Register />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs"
                element={
                  <ProtectedRoute>
                    <JobManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/:_id"
                element={
                  <ProtectedRoute>
                    <JobDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicants"
                element={
                  <ProtectedRoute>
                    <ApplicantManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume-matching"
                element={
                  <ProtectedRoute>
                    <ResumeMatching />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview-feedback"
                element={
                  <ProtectedRoute>
                    <InterviewFeedback />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AIAssistant />
                  </ProtectedRoute>
                }
              />
              {/* Not found route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
