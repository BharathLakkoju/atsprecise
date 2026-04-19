"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type AuthMode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    // Client-side validation
    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    if (!hasSupabaseConfig()) {
      setError(
        "Authentication is not configured. Check environment variables.",
      );
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Auth client unavailable.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: authError } = await client.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        setMessage(
          "Account created! Check your email to confirm, then sign in.",
        );
      } else {
        const { error: authError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        const nextPath = searchParams.get("next");
        const safeNextPath =
          nextPath && nextPath.startsWith("/") ? nextPath : "/app";

        router.push(safeNextPath as any);
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-lowest p-8 shadow-ambient">
      {/* Mode Toggle */}
      <div className="mb-6 flex bg-surface-low p-1 gap-0.5">
        {(["signup", "login"] as AuthMode[]).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setMessage(null);
              }}
              className="relative flex-1 py-2.5 z-10 flex items-center justify-center transition-all duration-200 ease-out"
            >
              {isActive && (
                <motion.div
                  layoutId="auth-mode-indicator"
                  className="absolute inset-0 bg-foreground"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span
                className={`relative z-10 text-xs font-semibold uppercase tracking-widest transition-colors duration-150 ${
                  isActive ? "text-white" : "text-muted-foreground"
                }`}
              >
                {m === "signup" ? "Create Account" : "Sign In"}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="label-sm text-muted-foreground">
            EMAIL ADDRESS
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-surface-low text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="label-sm text-muted-foreground">
            PASSWORD
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder={
                mode === "signup" ? "Min. 8 characters" : "Your password"
              }
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 bg-surface-low pr-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full overflow-hidden"
          size="lg"
          disabled={loading}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={loading ? `${mode}-loading` : mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="block"
            >
              {loading
                ? mode === "signup"
                  ? "Creating Account..."
                  : "Signing In..."
                : mode === "signup"
                  ? "Create Account"
                  : "Sign In"}
            </motion.span>
          </AnimatePresence>
        </Button>

        {message && (
          <div className="bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
