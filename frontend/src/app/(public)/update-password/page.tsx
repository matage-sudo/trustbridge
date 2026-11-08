"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Supabase automatically processes the recovery token in the URL hash
  // We just need to wait for the session to be established
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      } else {
        // Fallback: listen for the PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) {
            setIsReady(true);
          }
        });
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-4 text-sm text-slate-500">Verifying recovery link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm px-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Password Updated</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your password has been changed successfully. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-brand-600" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">TrustBridge</span>
            </Link>
            <h2 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">Set new password</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Choose a strong password for your account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleUpdatePassword}>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                {error}
              </div>
            )}
            <Input
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
              ) : (
                <>Update Password <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551076805-e1869043e560?q=80&w=2670&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply dark:bg-slate-950/90" />
      </div>
    </div>
  );
}
