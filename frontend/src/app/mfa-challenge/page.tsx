"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Fingerprint } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getApiContext, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { startAuthentication } from "@simplewebauthn/browser";

export default function MfaChallengePage() {
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "passkey" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      
      supabase.auth.mfa.listFactors().then(({ data: factors }) => {
        const totp = factors?.totp.find(f => f.status === 'verified');
        if (totp) setFactorId(totp.id);
        else router.replace("/login");
      });
    });
  }, [router]);

  const finishLogin = async (customToken?: string) => {
    if (customToken) {
      localStorage.setItem("mfa_token", customToken);
    }
    const { role } = await getApiContext();
    if (role === "PATIENT") router.replace("/patient");
    else if (role === "STAFF" || role === "NURSE") router.replace("/staff");
    else router.replace("/admin");
    router.refresh();
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      await finishLogin();
    } catch (err: any) {
      setError(err.message || "Invalid code.");
      setLoading(false);
    }
  };

  const handleVerifyPasskey = async () => {
    setLoading(true); setError("");
    try {
      // THIS IS THE FIX: We explicitly pass method: "POST"
      const opts: any = await apiFetch("/mfa/passkey/generate-authentication-options", { method: "POST" });
      const authResp = await startAuthentication(opts);
      const data: any = await apiFetch("/mfa/passkey/verify-authentication", {
        method: "POST",
        body: JSON.stringify({ ...authResp, challenge: opts.challenge })
      });
      await finishLogin(data.mfaToken);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Passkey prompt was cancelled.");
      else setError(err.message || "Passkey authentication failed.");
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data: any = await apiFetch("/mfa/recovery/verify", {
        method: "POST",
        body: JSON.stringify({ code: recoveryCode })
      });
      await finishLogin(data.mfaToken);
    } catch (err: any) {
      setError(err.message || "Invalid recovery code");
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
          <p className="text-sm text-slate-500 text-center mt-2">
            {method === "totp" && "Enter the 6-digit code from your authenticator app."}
            {method === "passkey" && "Use your device biometrics or hardware key."}
            {method === "recovery" && "Enter one of your saved recovery codes."}
          </p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 text-center">{error}</div>}

        {method === "totp" && (
          <form onSubmit={handleVerifyTotp} className="space-y-4">
            <Input type="text" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="text-center text-2xl tracking-widest h-14" />
            <Button type="submit" className="w-full h-12" isLoading={loading}>Verify & Continue</Button>
          </form>
        )}

        {method === "passkey" && (
          <div className="space-y-4">
            <Button onClick={handleVerifyPasskey} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white" isLoading={loading}>
              <Fingerprint className="w-5 h-5 mr-2" /> Authenticate with Passkey
            </Button>
          </div>
        )}

        {method === "recovery" && (
          <form onSubmit={handleVerifyRecovery} className="space-y-4">
            <Input type="text" required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} placeholder="XXXX-XXXX" className="text-center text-lg" />
            <Button type="submit" className="w-full h-12" isLoading={loading}>Verify Recovery Code</Button>
          </form>
        )}

        <div className="mt-6 flex flex-col space-y-3 text-center text-sm">
          {method === "totp" && (
            <>
              <button onClick={() => { setMethod("passkey"); setError(""); }} className="font-medium text-blue-600 hover:underline">Use a passkey or security key</button>
              <button onClick={() => { setMethod("recovery"); setError(""); }} className="text-slate-500 hover:text-slate-700">Use a backup recovery code</button>
            </>
          )}
          {method !== "totp" && (
            <button onClick={() => { setMethod("totp"); setError(""); }} className="font-medium text-blue-600 hover:underline">Back to authenticator app</button>
          )}
          <div className="pt-2">
            <button onClick={() => createClient().auth.signOut().then(() => router.replace('/login'))} className="text-slate-500 hover:text-slate-800">Cancel and sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}