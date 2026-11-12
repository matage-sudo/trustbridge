"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function MfaSetupPage() {
  const [step, setStep] = useState<"intro" | "scan" | "success">("intro");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startEnrollment = async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App" });
      if (error) throw error;
      
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("scan");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient/security" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white">Set Up Two-Factor Authentication</h1><p className="text-sm text-slate-500">Protect your account with an extra layer of security.</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card>
          <div className="p-6">
            {step === "intro" && (
              <div className="text-center space-y-4 py-4">
                <ShieldCheck className="w-12 h-12 text-blue-600 mx-auto" />
                <h2 className="text-xl font-semibold dark:text-white">Secure Your Account</h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  You will need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator to scan a QR code.
                </p>
                <Button onClick={startEnrollment} isLoading={loading} className="mt-4">Start Setup</Button>
              </div>
            )}

            {step === "scan" && (
              <div className="flex flex-col items-center space-y-6 py-4">
                <h2 className="text-xl font-semibold dark:text-white">Scan this QR Code</h2>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Can&apos;t scan? Enter this code manually:</p>
                  <code className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-sm font-mono dark:text-slate-300">{secret}</code>
                </div>
                <form onSubmit={verifyEnrollment} className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-center">Enter the 6-digit code</label>
                    <Input type="text" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="text-center text-xl tracking-widest" />
                  </div>
                  <Button type="submit" className="w-full" isLoading={loading}>Verify & Enable</Button>
                </form>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-4 py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold dark:text-white">2FA Enabled!</h2>
                <p className="text-sm text-slate-500">Your account is now protected. You will be asked for a code the next time you log in.</p>
                <Link href="/patient/security">
                  <Button className="mt-4">Back to Security</Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}