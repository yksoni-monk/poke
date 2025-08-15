import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { signOut as superTokensSignOut } from "supertokens-auth-react/recipe/session";

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
  
  // Use SuperTokens session context
  const sessionContext = useSessionContext();

  // Check if user is authenticated using SuperTokens SDK
  const checkAuth = async () => {
    try {
      console.log('🔐 checkAuth called, checking SuperTokens session...');
      
      if (sessionContext.loading) {
        console.log('🔐 Session context still loading...');
        return;
      }
      
      // Check if session exists and get user info
      if (sessionContext.userId) {
        console.log('🔐 SuperTokens session exists!');
        const userId = sessionContext.userId;
        const accessTokenPayload = sessionContext.accessTokenPayload;
        
        console.log('🔐 User authenticated, setting user info...');
        setUser({
          id: userId,
          email: accessTokenPayload?.email || 'unknown@email.com',
        });
        console.log('🔐 User set to:', userId);
      } else {
        console.log('🔐 No SuperTokens session, clearing user...');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth when session context changes
  useEffect(() => {
    if (!sessionContext.loading) {
      checkAuth();
    }
  }, [sessionContext.loading]);

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
        // Check authentication using SuperTokens session
        console.log('🔐 SignIn called, checking SuperTokens session...');
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
      // Use SuperTokens SDK to sign out
      await superTokensSignOut();
      
      // Clear local user state
      setUser(null);
      
      console.log('User signed out successfully via SuperTokens');
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
