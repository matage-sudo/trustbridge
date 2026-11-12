"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Phase = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data.session) { settled = true; setPhase("ready"); }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === "PASSWORD_RECOVERY" || session) { settled = true; setPhase("ready"); }
    });

    const t = setTimeout(() => { if (!settled) { settled = true; setPhase("invalid"); } }, 2500);

    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: updErr } = await createClient().auth.updateUser({ password });
      if (updErr) throw updErr;
      setPhase("success");
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <ShieldCheck className="h-10 w-10 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TrustBridge</h1>
        </div>

        {phase === "checking" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Verifying your reset link...</p>
          </div>
        )}

        {phase === "invalid" && (
          <div className="text-center space-y-4 py-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold dark:text-white">Link expired or invalid</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This password reset link has expired or has already been used. Request a new one.
            </p>
            <Link href="/forgot-password" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              Request new link
            </Link>
            <div className="pt-2">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </div>
        )}

        {phase === "success" && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold dark:text-white">Password updated</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Redirecting you to sign in...</p>
          </div>
        )}

        {phase === "ready" && (
          <>
            <h2 className="text-xl font-semibold mb-2 text-center dark:text-white">Set your new password</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Choose a strong password, at least 8 characters.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New password</label>
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm password</label>
                <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Password" />
              </div>
              <Button type="submit" className="w-full" isLoading={loading}>Update password</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}