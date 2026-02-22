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

  // Login with Supabase using phone and password
  const loginWithSupabase = async (phone: string, password: string): Promise<UserProfile | null> => {
    try {
      // Query users table to find by phone
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phone)
        .single();

      if (error || !users) {
        console.error('User not found:', error?.message);
        return null;
      }

      // Check password (in production, this should be handled by proper auth)
      if (users.password !== password) {
        console.error('Invalid password');
        return null;
      }

      const userData: UserProfile = {
        id: users.id,
        name: users.username,
        email: users.email || '',
        phone: users.phone_number,
        password: users.password,
        username: users.username,
        verified: users.is_verified,
        level: users.role === 'admin' ? 'Admin' : 'Member',
        joinDate: new Date(users.created_at).toLocaleDateString(),
        totalBets: users.total_bets || 0,
        totalWinnings: users.total_winnings || 0,
        accountBalance: parseFloat(users.account_balance) || 0,
        withdrawalActivated: users.withdrawal_activated || false,
        withdrawalActivationDate: users.withdrawal_activation_date,
        isAdmin: users.is_admin || false,
      };

      login(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  };

  // Signup with Supabase
  const signupWithSupabase = async (userData: any): Promise<UserProfile | null> => {
    try {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            username: userData.username,
            phone_number: userData.phone,
            email: userData.email,
            password: userData.password,
            account_balance: 0,
            total_bets: 0,
            total_winnings: 0,
            is_verified: false,
            is_admin: false,
            role: 'user',
            status: 'active',
          },
        ])
        .select()
        .single();

      if (error || !newUser) {
        console.error('Signup error:', error?.message);
        return null;
      }

      const userProfile: UserProfile = {
        id: newUser.id,
        name: newUser.username,
        email: newUser.email || '',
        phone: newUser.phone_number,
        password: newUser.password,
        username: newUser.username,
        verified: false,
        level: 'Member',
        joinDate: new Date().toLocaleDateString(),
        totalBets: 0,
        totalWinnings: 0,
        accountBalance: 0,
        withdrawalActivated: false,
        withdrawalActivationDate: null,
        isAdmin: false,
      };

      login(userProfile);
      return userProfile;
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
