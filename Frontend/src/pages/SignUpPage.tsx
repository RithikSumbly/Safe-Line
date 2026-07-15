import { Link, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpPage() {
  const navigate = useNavigate();
  const { user, loading, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await signUpWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setMessage("Check your email to confirm your account.");
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-14">
      <div className="border border-line rounded-[12px] p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Sign up</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="signup-email">
              Email <span className="text-risk" aria-hidden>*</span>
              <span className="sr-only">(required)</span>
            </Label>
            <Input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "signup-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">
              Password <span className="text-risk" aria-hidden>*</span>
              <span className="sr-only">(required, at least 8 characters)</span>
            </Label>
            <Input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "signup-error" : "signup-password-hint"}
            />
            <p id="signup-password-hint" className="font-sans text-xs text-ink/55">
              At least 8 characters.
            </p>
          </div>
          {error && (
            <p id="signup-error" className="font-sans text-sm text-risk" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="font-sans text-sm text-ink/70" role="status">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center font-sans text-sm text-ink/75">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="font-sans text-sm font-medium text-ink/80 underline underline-offset-2 hover:text-ink">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
