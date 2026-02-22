import { createContext, useContext, useState, ReactNode } from "react";

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "completed" | "pending" | "failed";
  method: string;
  date: string;
  mpesaNumber?: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransactionStatus: (transactionId: string, status: Transaction["status"]) => void;
  getUserTransactions: (userId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  };

  const updateTransactionStatus = (
    transactionId: string,
    status: Transaction["status"]
  ) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, status } : t))
    );
  };

  const getUserTransactions = (userId: string) => {
    return transactions.filter((t) => t.userId === userId);
  };

  const getAllTransactions = () => {
    return transactions;
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransactionStatus,
        getUserTransactions,
        getAllTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
}
