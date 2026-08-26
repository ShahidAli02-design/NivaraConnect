import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchRole: (userId: string) => void;
  loginUser: (email: string, role?: UserRole) => Promise<void>;
  registerUser: (data: Partial<User>) => Promise<void>;
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
  avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  familyMembersCount: 3,
  vehiclesCount: 2,
};

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultUser,
  users: [defaultUser],
  setCurrentUser: () => {},
  switchRole: () => {},
  loginUser: async () => {},
  registerUser: async () => {},
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('nivara_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return defaultUser;
  });

  const [users, setUsers] = useState<User[]>([defaultUser]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await api.getUsers();
        if (list && list.length > 0) {
          setUsers(list);
          // If currentUser doesn't match loaded list, keep existing or set
          const matched = list.find(u => u.id === currentUser.id);
          if (matched) {
            setCurrentUser(matched);
          }
        }
      } catch (e) {
        console.error('Failed to load users', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const switchRole = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('nivara_user', JSON.stringify(target));
    }
  };

  const loginUser = async (email: string, role?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, undefined, role);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('nivara_user', JSON.stringify(res.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setUsers(prev => [...prev, res.user]);
        localStorage.setItem('nivara_user', JSON.stringify(res.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser: (u) => {
          setCurrentUser(u);
          localStorage.setItem('nivara_user', JSON.stringify(u));
        },
        switchRole,
        loginUser,
        registerUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
