import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated with backend
  const checkAuth = async () => {
    try {
      console.log('🔐 checkAuth called, checking session...');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost'}/sessioninfo`, {
        credentials: 'include', // Include cookies for session
      });

      console.log('🔐 Session response status:', response.status);
      console.log('🔐 Session response ok:', response.ok);

      if (response.ok) {
        const sessionData = await response.json();
        console.log('🔐 Session data:', sessionData);
        
        if (sessionData.status === 'AUTHENTICATED' && sessionData.userId) {
          console.log('🔐 User authenticated, setting user info...');
          // User is authenticated, set user info
          setUser({
            id: sessionData.userId,
            email: sessionData.accessTokenPayload?.email || 'unknown@email.com',
          });
          console.log('🔐 User set to:', sessionData.userId);
        } else {
          console.log('🔐 User not authenticated, clearing user...');
          setUser(null);
        }
      } else {
        console.log('🔐 Session response not ok, clearing user...');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const signIn = async (email: string, userData?: any) => {
    setIsLoading(true);
    try {
      if (userData) {
        // If we have user data from OTP verification, use it directly
        console.log('🔐 Using provided user data:', userData);
        setUser({
          id: userData.id || userData.userId || `user_${Date.now()}`,
          email: email,
        });
        console.log('🔐 User set directly from OTP verification data');
      } else {
        // Check authentication using the working session endpoint
        console.log('🔐 SignIn called, checking authentication...');
        await checkAuth();
        console.log('🔐 After checkAuth, user:', user, 'isAuthenticated:', !!user);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear local user state
      setUser(null);
      
      // Note: SuperTokens handles session cleanup automatically
      // We don't need to call a specific signout endpoint
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, clear the local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
