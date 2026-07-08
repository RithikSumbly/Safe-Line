import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-14">
      <div className="border border-line rounded-[12px] p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="font-sans text-xs text-ink/60 underline underline-offset-2 hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="font-sans text-sm text-risk">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center font-sans text-sm text-ink/60">
          No account?{" "}
          <Link to="/sign-up" className="text-ink underline underline-offset-2">
            Sign up
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="font-sans text-sm text-ink/60 hover:text-ink">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
