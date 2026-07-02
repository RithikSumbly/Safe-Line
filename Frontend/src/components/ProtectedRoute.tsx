import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-20 font-sans text-sm text-ink/60">
        Loading your account…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return children;
}
