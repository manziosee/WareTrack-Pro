import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types';
import { authService } from '@/services/authService';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ requiresOTP?: boolean; email?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      const token = authService.getToken();
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // If user data doesn't have role, fetch fresh profile
          if (!userData.role) {
            try {
              const profile = await authService.getProfile();
              const updatedUser = { ...userData, role: profile.role as UserRole };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            } catch (error) {
              // If profile fetch fails, use stored data as is
              setUser({ ...userData, role: userData.role as UserRole });
            }
          } else {
            setUser({ ...userData, role: userData.role as UserRole });
          }
        } catch (error) {
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      // Check if 2FA is required
      if (response.requiresOTP) {
        return { requiresOTP: true, email: response.data?.email };
      }
      
      // Direct login (shouldn't happen with current 2FA setup)
      if (response.data?.user && response.data?.tokens) {
        const userData = { ...response.data.user, role: response.data.user.role as UserRole };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return {};
      }
      
      throw new Error('Invalid login response');
    } catch (error) {
      console.error('Login error in context:', error);
      throw error;
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await authService.verifyOTP({ email, otp });
      const userData = { ...response.user, role: response.user.role as UserRole };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('OTP verification error in context:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Immediate logout without waiting for API
    setUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyOTP, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}