import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Check localStorage for saved user
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (email: string, _password: string) => {
    // Mock login - in production, this would call an API
    let mockUser: AuthUser;
    
    if (email === 'admin@waretrack.com') {
      mockUser = { id: 1, name: 'John Admin', email, role: 'admin' };
    } else if (email === 'warehouse@waretrack.com') {
      mockUser = { id: 2, name: 'Sarah Wilson', email, role: 'warehouse_staff' };
    } else if (email === 'dispatch@waretrack.com') {
      mockUser = { id: 3, name: 'Mike Johnson', email, role: 'dispatch_officer' };
    } else if (email === 'driver@waretrack.com') {
      mockUser = { id: 4, name: 'David Brown', email, role: 'driver' };
    } else {
      mockUser = { id: 1, name: 'John Admin', email, role: 'admin' };
    }

    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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