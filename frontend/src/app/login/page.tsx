"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { clearApiCache, getApiContext } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    clearApiCache();

    try {
      const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Fetch role from our secure backend
      const { role } = await getApiContext();
      
      if (role === "PATIENT") {
        router.replace("/patient");
      } else if (role === "STAFF" || role === "NURSE") {
        router.replace("/staff");
      } else {
        router.replace("/admin");
      }
      
      router.refresh();
    } catch (err: any) {
      await createClient().auth.signOut();
      clearApiCache();
      setError(err.message || "Invalid login credentials.");
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
        
        <h2 className="text-xl font-semibold mb-6 text-center dark:text-white">Sign in to your portal</h2>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Sign in {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>
      </div>
    </div>
  );
}