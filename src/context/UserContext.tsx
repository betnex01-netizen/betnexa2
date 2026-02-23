import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  username: string;
  verified: boolean;
  level: string;
  joinDate: string;
  totalBets: number;
  totalWinnings: number;
  accountBalance: number;
  withdrawalActivated: boolean;
  withdrawalActivationDate: string | null;
  isAdmin?: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  updateUser: (userData: Partial<UserProfile>) => void;
  login: (userData: UserProfile) => void;
  logout: () => void;
  loginWithSupabase: (phone: string, password: string) => Promise<UserProfile | null>;
  signupWithSupabase: (userData: any) => Promise<UserProfile | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER: UserProfile = {
  id: "user1",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+254712345678",
  password: "1234",
  username: "john_doe",
  verified: true,
  level: "Gold Member",
  joinDate: "2024-06-15",
  totalBets: 245,
  totalWinnings: 15750,
  accountBalance: 10000,
  withdrawalActivated: false,
  withdrawalActivationDate: null,
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('betnexa_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('betnexa_user');
      }
    }
  }, []);

  const login = (userData: UserProfile) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('betnexa_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('betnexa_user');
  };

  const updateUser = (userData: Partial<UserProfile>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('betnexa_user', JSON.stringify(updatedUser));
    }
  };

  // Login with backend API
  const loginWithSupabase = async (phone: string, password: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Login failed:', data.message);
        return null;
      }

      login(data.user);
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  };

  // Signup with backend API
  const signupWithSupabase = async (userData: any): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app'}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Signup failed:', data.message);
        return null;
      }

      login(data.user);
      return data.user;
    } catch (error) {
      console.error('Signup error:', error);
      return null;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn,
        updateUser,
        login,
        logout,
        loginWithSupabase,
        signupWithSupabase,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
