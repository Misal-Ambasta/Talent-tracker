import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/reduxHooks';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowAuthenticatedAccess?: boolean; // New prop for login/register pages
}

/**
 * A wrapper component that protects routes based on authentication status
 * 
 * @param children - The components to render if authentication check passes
 * @param requireAuth - If true, redirects to login when not authenticated
 * @param allowAuthenticatedAccess - If true, allows authenticated users to access login/register (for manual navigation)
 */
const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  allowAuthenticatedAccess = false 
}: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If still loading auth state, show a loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // For protected routes: redirect to login if not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For public routes like login/register: only redirect if explicitly not allowing authenticated access
  if (!requireAuth && isAuthenticated && !allowAuthenticatedAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // If authentication check passes, render the children
  return <>{children}</>;
};

export default ProtectedRoute;