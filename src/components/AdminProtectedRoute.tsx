/**
 * Admin Protected Route
 * Only allows users with is_admin = true to access
 */

import { Navigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

interface AdminProtectedRouteProps {
  element: React.ReactNode;
}

export function AdminProtectedRoute({ element }: AdminProtectedRouteProps) {
  const { isLoggedIn, user } = useUser();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    console.warn('❌ Access Denied: User is not an admin');
    return <Navigate to="/" replace />;
  }

  return element;
}
