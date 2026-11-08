"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // This is the critical fix: it catches the recovery token from the URL
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Recovery event detected - redirecting to update-password");
        router.push("/update-password");
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(`Login failed: ${authError.message}`);
      setIsLoading(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 600));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Your profile is missing. Contact the administrator.");
      setIsLoading(false);
      return;
    }

    const role = profile.role;
    console.log(`✅ Logged in as ${profile.full_name} (${role})`);

    switch (role) {
      case "SYSTEM_ADMIN":
      case "COMPLIANCE_OFFICER":
        router.push("/admin");
        break;
      case "DOCTOR":
      case "NURSE":
        router.push("/staff-dashboard");
        break;
      case "PATIENT":
      default:
        router.push("/dashboard");
        break;
    }
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-brand-600" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">TrustBridge</span>
            </Link>
            <h2 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">Sign in</h2>
          </div>
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                {error}
              </div>
            )}
            <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ruiru.go.ke" />
            <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-500">
            Accounts are provisioned by the Hospital Administrator.
          </p>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551076805-e1869043e560?q=80&w=2670&auto=format&fit=crop')" }} />
        <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply dark:bg-slate-950/90" />
      </div>
    </div>
  );
}

