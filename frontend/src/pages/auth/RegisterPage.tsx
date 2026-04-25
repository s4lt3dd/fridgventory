import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Refrigerator } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { isValidEmail, isValidPassword } from "@/utils/validation";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    let hasError = false;
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }
    if (!username.trim()) {
      setUsernameError("Please pick a username.");
      hasError = true;
    } else {
      setUsernameError("");
    }
    if (!isValidPassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      hasError = true;
    } else {
      setPasswordError("");
    }
    if (hasError) return;
    setLoading(true);
    try {
      await register(email, username, password);
    } catch {
      setError("Registration failed. Email or username may already be taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-surface-subtle to-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <Refrigerator className="h-9 w-9 text-primary" />
            <h1 className="font-display text-6xl leading-none text-primary">
              FridgeCheck
            </h1>
          </div>
          <p className="text-text-muted">
            Start tracking today — waste less, eat better.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-[var(--radius-lg)] bg-surface p-6 shadow-lg"
        >
          {error && (
            <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            error={emailError}
            required
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (usernameError) setUsernameError("");
            }}
            placeholder="Pick a username"
            autoComplete="username"
            error={usernameError}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            placeholder="At least 8 characters"
            hint="Must be at least 8 characters."
            autoComplete="new-password"
            error={passwordError}
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
