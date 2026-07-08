import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("If an account exists for that email, we sent a reset link.");
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-14">
      <div className="border border-line rounded-[12px] p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Reset password</h1>
        <p className="mt-2 font-sans text-sm text-ink/60">
          Enter your email and we&apos;ll send a link to choose a new password.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="font-sans text-sm text-risk">{error}</p>}
          {message && <p className="font-sans text-sm text-ink/70">{message}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center font-sans text-sm text-ink/60">
          <Link to="/sign-in" className="text-ink underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
