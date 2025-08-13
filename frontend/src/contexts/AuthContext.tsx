import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
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
      const response = await fetch(`${import.meta.env.VITE_API_DOMAIN || 'http://localhost:8000'}/auth/session`, {
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.status === 'OK' && sessionData.userId) {
          // Get user details
          const userResponse = await fetch(`${import.meta.env.VITE_API_DOMAIN || 'http://localhost:8000'}/auth/user/${sessionData.userId}`, {
            credentials: 'include',
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser({
              id: userData.id,
              email: userData.email,
            });
          }
        } else {
          setUser(null);
        }
      } else {
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

  const signIn = async (email: string) => {
    setIsLoading(true);
    try {
      // User is already signed in after OTP verification
      // Just update the local state
      const mockUser = {
        id: `user_${Date.now()}`,
        email: email,
      };
      
      setUser(mockUser);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Call backend to sign out
      await fetch(`${import.meta.env.VITE_API_DOMAIN || 'http://localhost:8000'}/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
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
