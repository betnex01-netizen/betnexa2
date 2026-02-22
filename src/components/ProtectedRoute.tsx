import { Navigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

interface ProtectedRouteProps {
  element: React.ReactNode;
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return element;
}
