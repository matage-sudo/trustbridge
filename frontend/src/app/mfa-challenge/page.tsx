"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getApiContext } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function MfaChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    // Check if we actually have a logged-in user
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      
      // Find their active TOTP factor
      supabase.auth.mfa.listFactors().then(({ data: factors }) => {
        const totp = factors?.totp.find(f => f.status === 'verified');
        if (totp) setFactorId(totp.id);
        else router.replace("/login"); // If no MFA, back to login
      });
    });
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    
    setLoading(true); setError("");

    try {
      const supabase = createClient();
      // Challenge and verify the code
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      
      if (verifyError) throw verifyError;

      // If successful, fetch their role to redirect them to the right dashboard
      const { role } = await getApiContext();
      if (role === "PATIENT") router.replace("/patient");
      else if (role === "STAFF" || role === "NURSE") router.replace("/staff");
      else router.replace("/admin");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">Two-Factor Authentication</h1>
          <p className="text-sm text-slate-500 text-center mt-2">Enter the 6-digit code from your authenticator app.</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 text-center">{error}</div>}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <Input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Only allow numbers
              placeholder="000000"
              className="text-center text-2xl tracking-widest h-14"
            />
          </div>
          <Button type="submit" className="w-full h-12" isLoading={loading}>
            Verify & Continue
          </Button>
          <div className="text-center mt-4">
            <button type="button" onClick={() => createClient().auth.signOut().then(() => router.replace('/login'))} className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
              Cancel and sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}