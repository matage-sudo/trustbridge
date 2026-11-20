
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Phase = "checking" | "code" | "ready" | "invalid" | "success";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenHash = searchParams.get("token_hash");
  const tokenType =
    searchParams.get("type") === "invite" ? "invite" : "recovery";

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    // If there is a token in the URL, go straight to the password form.
    // We will NOT verify it yet. We will verify it when they click "Update".
    if (tokenHash) {
      setPhase("ready");
      return;
    }

    // If no token, check if they are already logged in
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPhase("ready");
      } else {
        setPhase("code");
      }
    });
  }, [tokenHash]);

  // Code-entry submit (invite flow without clicking the link)
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter the email address that received the invite.");
      return;
    }
    if (cleanCode.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // Try invite first, fall back to recovery (same 6-digit form serves both)
      let { error: vErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "invite",
      });

      if (vErr) {
        const retry = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "recovery",
        });
        vErr = retry.error;
      }

      if (vErr) {
        throw vErr;
      }

      // Session is now active -> let them set a password
      setPhase("ready");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid or expired code. Request a new invite."
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // If they came via a link, verify it NOW at the moment of submission
      if (tokenHash) {
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType,
        });
        if (vErr) throw new Error("This link is invalid or has expired. Please request a new one.");
      }

      // Now update the password
      const { error: updErr } = await supabase.auth.updateUser({
        password,
      });

      if (updErr) {
        throw updErr;
      }

      setPhase("success");

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <ShieldCheck className="h-10 w-10 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            TrustBridge
          </h1>
        </div>

        {phase === "checking" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              Verifying your reset link...
            </p>
          </div>
        )}

        {phase === "invalid" && (
          <div className="text-center space-y-4 py-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />

            <h2 className="text-xl font-semibold dark:text-white">
              Link expired or invalid
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              This password reset link has expired or has already been used.
              Request a new one.
            </p>

            <Link
              href="/forgot-password"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Request new link
            </Link>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}

        {phase === "code" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold dark:text-white mb-1">
                Enter your invitation code
              </h2>
              <p className="text-sm text-slate-500">
                Check your email for a 6-digit code. It expires in 24 hours.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                {error}
              </div>
            )}

            <form onSubmit={submitCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  6-digit code
                </label>
                <Input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="tracking-[0.5em] text-center text-lg font-mono"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Verify code
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}

        {phase === "success" && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />

            <h2 className="text-xl font-semibold dark:text-white">
              Password updated
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Redirecting you to sign in...
            </p>
          </div>
        )}

        {phase === "ready" && (
          <>
            <h2 className="text-xl font-semibold mb-2 text-center dark:text-white">
              Set your new password
            </h2>

            <p className="text-sm text-slate-500 text-center mb-6">
              Choose a strong password, at least 8 characters.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New password
                </label>

                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm password
                </label>

                <Input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
              >
                Update password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
