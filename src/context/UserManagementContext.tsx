import { createContext, useContext, useState, ReactNode } from "react";

export interface User {
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
  withdrawalActivated?: boolean;
  withdrawalActivationDate?: string | null;
}

interface UserManagementContextType {
  users: User[];
  updateUser: (userId: string, userData: Partial<User>) => void;
  getUser: (userId: string) => User | undefined;
  addUser: (user: User) => void;
  getAllUsers: () => User[];
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([
    {
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
    },
    {
      id: "user2",
      name: "Sarah Kennedy",
      email: "sarah.k@example.com",
      phone: "+254712345679",
      password: "5678",
      username: "sarah_k",
      verified: true,
      level: "Silver Member",
      joinDate: "2024-08-20",
      totalBets: 120,
      totalWinnings: 8500,
      accountBalance: 5200,
      withdrawalActivated: true,
      withdrawalActivationDate: "2025-12-10T15:30:00",
    },
    {
      id: "user3",
      name: "Mike Johnson",
      email: "mike99@example.com",
      phone: "+254712345680",
      password: "9012",
      username: "mike99",
      verified: false,
      level: "Bronze Member",
      joinDate: "2024-10-10",
      totalBets: 45,
      totalWinnings: 2100,
      accountBalance: 3500,
      withdrawalActivated: false,
      withdrawalActivationDate: null,
    },
    {
      id: "user4",
      name: "Bet King",
      email: "betking@example.com",
      phone: "+254712345681",
      password: "3456",
      username: "betking",
      verified: true,
      level: "Gold Member",
      joinDate: "2024-05-05",
      totalBets: 890,
      totalWinnings: 45000,
      accountBalance: 22500,
      withdrawalActivated: true,
      withdrawalActivationDate: "2025-10-15T10:20:00",
    },
  ]);

  const updateUser = (userId: string, userData: Partial<User>) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, ...userData } : user))
    );
  };

  const getUser = (userId: string) => {
    return users.find((user) => user.id === userId);
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const getAllUsers = () => {
    return users;
  };

  return (
    <UserManagementContext.Provider
      value={{ users, updateUser, getUser, addUser, getAllUsers }}
    >
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error("useUserManagement must be used within a UserManagementProvider");
  }
  return context;
}
