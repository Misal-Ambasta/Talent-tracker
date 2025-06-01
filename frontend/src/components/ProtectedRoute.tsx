import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/reduxHooks';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * A wrapper component that protects routes based on authentication status
 * 
 * @param children - The components to render if authentication check passes
 * @param requireAuth - If true, redirects to login when not authenticated
 *                     If false, redirects to dashboard when authenticated (for login/register pages)
 */
const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If still loading auth state, you could show a loading spinner
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

  // For public routes like login/register: redirect to dashboard if already authenticated
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If authentication check passes, render the children
  return <>{children}</>;
};

export default ProtectedRoute;