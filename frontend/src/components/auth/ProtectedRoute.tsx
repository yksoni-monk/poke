import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SignIn } from './SignIn';
import { UserProfile } from './UserProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For protected routes (requireAuth=true), check authentication
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SignIn />
      </div>
    );
  }

  // For public routes (requireAuth=false), always show children
  // regardless of authentication status
  if (!requireAuth) {
    return <>{children}</>;
  }

  // For protected routes, user is authenticated, show children
  return <>{children}</>;
};
