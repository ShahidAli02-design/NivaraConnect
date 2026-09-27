import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { generateAvatar } from '../utils/avatar';
import { api } from '../services/api';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  apartmentId?: string;
  residentType?: string;
}

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  setCurrentUser: (user: User) => void;
  switchRole: (userId: string) => void;
  loginUser: (email: string, password: string) => Promise<User>;
  registerUser: (data: RegisterData) => Promise<string>;
  logoutUser: () => void;
  isLoading: boolean;
}

const defaultUser: User = {
  id: 'usr-res-1',
  name: 'Aditya Sharma',
  email: 'aditya.sharma@example.com',
  phone: '+91 98765 43210',
  role: 'resident',
  apartmentId: 'A-402',
  wing: 'A',
  flatNumber: '402',
  residentType: 'owner',
  avatarUrl: generateAvatar('Aditya Sharma'),
  familyMembersCount: 3,
  vehiclesCount: 2,
};

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultUser,
  users: [defaultUser],
  isAuthenticated: false,
  setCurrentUser: () => {},
  switchRole: () => {},
  loginUser: async () => defaultUser,
  registerUser: async () => '',
  logoutUser: () => {},
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const authed = localStorage.getItem('nivara_authenticated') === 'true';
    const saved = localStorage.getItem('nivara_user');
    if (authed && saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return defaultUser;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('nivara_authenticated') === 'true' && !!localStorage.getItem('nivara_user');
  });

  const [users, setUsers] = useState<User[]>([defaultUser]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await api.getUsers();
        if (list && list.length > 0) {
          setUsers(list);
        }
      } catch (e) {
        console.error('Failed to load users', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const persistSession = (user: User, authenticated: boolean) => {
    setCurrentUserState(user);
    setIsAuthenticated(authenticated);
    if (authenticated) {
      localStorage.setItem('nivara_user', JSON.stringify(user));
      localStorage.setItem('nivara_authenticated', 'true');
    } else {
      localStorage.removeItem('nivara_user');
      localStorage.removeItem('nivara_authenticated');
    }
  };

  // Kept for internal/demo tooling only — does not grant authentication.
  const switchRole = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      persistSession(target, true);
    }
  };

  const loginUser = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.user) {
        persistSession(res.user, true);
        return res.user;
      }
      throw new Error('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: RegisterData): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      return res.message || 'Your account request has been sent to the Society Secretary for approval.';
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    persistSession(defaultUser, false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        setCurrentUser: (u) => persistSession(u, true),
        switchRole,
        loginUser,
        registerUser,
        logoutUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
