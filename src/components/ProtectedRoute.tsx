import { Navigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  element: React.ReactNode;
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isLoggedIn } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Give UserContext time to restore session from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground text-lg">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return element;
}
