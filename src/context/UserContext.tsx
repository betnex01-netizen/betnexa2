import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { sessionService } from "@/services/sessionService";

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
  sessionId: string | null;
  updateUser: (userData: Partial<UserProfile>) => void;
  login: (userData: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  loginWithSupabase: (phone: string, password: string) => Promise<UserProfile | null>;
  signupWithSupabase: (userData: any) => Promise<UserProfile | null>;
  refreshUserData: () => Promise<void>;  // Refresh user data from backend
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Load user and verify session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem('betnexa_user');
        const savedSession = localStorage.getItem('betnexa_session');
        
        console.log('🔐 Checking for existing session in localStorage...');
        
        if (savedUser && savedSession) {
          try {
            const userData = JSON.parse(savedUser);
            const sessionData = JSON.parse(savedSession);
            
            console.log('✅ Found saved user and session:', userData.username);
            
            // Restore session immediately from localStorage (faster than database check)
            setUser(userData);
            setSessionId(sessionData.sessionId);
            setIsLoggedIn(true);
            setIsAuthReady(true);
            
            console.log('✅ Session restored from local storage');
            
            // Verify session is still valid in background
            const currentSession = sessionService.getCurrentSession();
            if (!currentSession) {
              console.warn('⚠️ Session validation failed, but keeping local session active');
              // Don't immediately log out - let the background check happen
            } else {
              // Update session activity
              await sessionService.updateSessionActivity(currentSession.sessionId).catch(err => {
                console.warn('⚠️ Failed to update session activity:', err);
                // Continue anyway, don't interrupt user session
              });
            }
          } catch (parseError) {
            console.error('❌ Error parsing saved session:', parseError);
            localStorage.removeItem('betnexa_user');
            localStorage.removeItem('betnexa_session');
            setIsAuthReady(true);
          }
        } else {
          console.log('ℹ️ No saved session found');
          setIsAuthReady(true);
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        setIsAuthReady(true);
      }
    };
    
    initializeAuth();
  }, []);

  const login = async (userData: UserProfile) => {
    try {
      // Create session for this device
      const session = await sessionService.createSession(userData.id);
      
      if (session) {
        setUser(userData);
        setSessionId(session.sessionId);
        setIsLoggedIn(true);
        
        // Persist to localStorage immediately
        localStorage.setItem('betnexa_user', JSON.stringify(userData));
        localStorage.setItem('betnexa_session', JSON.stringify(session));
        
        console.log(`✅ Login successful on device: ${session.deviceName}`);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear session from database if available
      if (sessionId) {
        await sessionService.clearSession();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessionId(null);
      setIsLoggedIn(false);
      localStorage.removeItem('betnexa_user');
      localStorage.removeItem('betnexa_session');
      console.log('✅ User logged out successfully');
    }
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

      // Create session for this device
      await login(data.user);
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
          username: userData.username || userData.name,
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

      // Create session for this device
      await login(data.user);
      return data.user;
    } catch (error) {
      console.error('Signup error:', error);
      return null;
    }
  };

  // Refresh user data from backend (for admin updates to reflect in real-time)
  const refreshUserData = async () => {
    if (!user) return;
    try {
      console.log('🔄 Refreshing user data...');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/auth/profile/${encodeURIComponent(user.phone)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to refresh user data');
        return;
      }

      const data = await response.json();
      if (data.success && data.user) {
        console.log('✅ User data refreshed successfully');
        // Silently update user data without interrupting UI
        updateUser(data.user);
      }
    } catch (error) {
      console.warn('⚠️ Error refreshing user data:', error);
      // Don't throw - let it fail silently so it doesn't interrupt user experience
    }
  };

  // Periodic refresh of user data every 30 seconds when logged in
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    console.log('⏱️ Starting periodic user data refresh (every 30 seconds)');
    
    // Refresh immediately on login
    refreshUserData();

    // Then refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      refreshUserData();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
      console.log('⏹️ Stopped periodic user data refresh');
    };
  }, [isLoggedIn, user?.phone]);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn,
        sessionId,
        updateUser,
        login,
        logout,
        loginWithSupabase,
        signupWithSupabase,
        refreshUserData,
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


