"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "request_failed");
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <ShieldCheck className="h-10 w-10 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TrustBridge</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <Mail className="h-12 w-12 text-blue-600 mx-auto" />
            <h2 className="text-xl font-semibold dark:text-white">Check your email</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. The link expires in 1 hour.
            </p>
            <p className="text-xs text-slate-500">Didn&apos;t get it? Check spam, or try again in a few minutes.</p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2 text-center dark:text-white">Forgot your password?</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Enter your email and we&apos;ll send you a reset link.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" isLoading={loading}>Send reset link</Button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}