"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, CheckCircle2, Loader2, Fingerprint, FileKey, Mail, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getApiContext, apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { startRegistration } from "@simplewebauthn/browser";

type SetupMethod = "intro" | "totp" | "email" | "passkey";
type Step = "select" | "scan" | "success";

export default function UniversalMfaSetupPage() {
  const router = useRouter();
  const [portal, setPortal] = useState<"patient" | "staff" | "admin" | null>(null);
  
  const [method, setMethod] = useState<SetupMethod>("intro");
  const [step, setStep] = useState<Step>("select");

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  
  const [emailSent, setEmailSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPortal("staff"); 
    getApiContext().then(({ role }) => {
      if (role === "PATIENT") setPortal("patient");
      else if (role === "STAFF" || role === "NURSE") setPortal("staff");
      else setPortal("admin");
    }).catch((err) => console.error("MFA Context Error:", err));
  }, [router]);

  // --- TOTP Flow ---
  const startTotpEnrollment = async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App" });
      if (error) throw error;
      setQrCode(data.totp.qr_code); setSecret(data.totp.secret); setFactorId(data.id); setMethod("totp");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const verifyTotpEnrollment = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      setStep("success");
      sessionStorage.removeItem("mfa_prompt_dismissed");
    } catch (err: any) { setError(err.message || "Invalid code."); } finally { setLoading(false); }
  };

  // --- Email Flow ---
  const sendEmailOtp = async () => {
    setLoading(true); setError("");
    try {
      await apiFetch("/mfa/email/send", { method: "POST" });
      setEmailSent(true);
      setEmailCooldown(60);
      const t = setInterval(() => setEmailCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (err: any) {
      setError(err.message || "Could not send email code.");
    } finally { setLoading(false); }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data: any = await apiFetch("/mfa/email/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      localStorage.setItem("mfa_token", data.mfaToken);
      setStep("success");
      sessionStorage.removeItem("mfa_prompt_dismissed");
    } catch (err: any) { setError(err.message || "Invalid email code."); } finally { setLoading(false); }
  };

  // --- Passkey Flow ---
  const registerPasskey = async () => {
    setLoading(true); setError("");
    try {
      const opts: any = await apiFetch("/mfa/passkey/generate-registration-options", { method: "POST" });
      const regResp = await startRegistration(opts);
      await apiFetch("/mfa/passkey/verify-registration", {
        method: "POST",
        body: JSON.stringify({ ...regResp, challenge: opts.challenge })
      });
      setPasskeyRegistered(true);
      setStep("success");
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Passkey registration cancelled.");
      else setError(err.message);
    }
    setLoading(false);
  };

  const generateRecoveryCodes = async () => {
    setLoading(true);
    try {
      const data: any = await apiFetch("/mfa/recovery/generate", { method: "POST" });
      setRecoveryCodes(data.codes);
    } catch (err) { setError("Failed to generate recovery codes."); }
    setLoading(false);
  };

  if (!portal) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <AppShell portal={portal}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold dark:text-white">Set Up Two-Factor Authentication</h1></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card>
          <div className="p-6">
            {step === "select" && method === "intro" && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <ShieldCheck className="w-12 h-12 text-blue-600 mx-auto" />
                  <h2 className="text-xl font-semibold dark:text-white">Choose a Security Method</h2>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">Select how you want to verify your identity for future logins.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={startTotpEnrollment} className="flex flex-col items-center p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800">
                    <Smartphone className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="font-semibold text-sm dark:text-white">Authenticator App</span>
                    <span className="text-xs text-slate-500 text-center mt-1">Use Google Auth, Authy, etc.</span>
                  </button>

                  <button onClick={() => setMethod("email")} className="flex flex-col items-center p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800">
                    <Mail className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="font-semibold text-sm dark:text-white">Email Code</span>
                    <span className="text-xs text-slate-500 text-center mt-1">Receive a 6-digit code</span>
                  </button>

                  <button onClick={registerPasskey} className="flex flex-col items-center p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800">
                    <Fingerprint className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="font-semibold text-sm dark:text-white">Passkey</span>
                    <span className="text-xs text-slate-500 text-center mt-1">Face ID, Touch ID, Windows Hello</span>
                  </button>
                </div>
              </div>
            )}

            {method === "totp" && step === "select" && (
              <div className="flex flex-col items-center space-y-6 py-4">
                <h2 className="text-xl font-semibold dark:text-white">Scan this QR Code</h2>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Can&apos;t scan? Enter this code manually:</p>
                  <code className="bg-slate-100 px-3 py-1 rounded text-sm font-mono">{secret}</code>
                </div>
                <form onSubmit={verifyTotpEnrollment} className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-100">
                  <Input type="text" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="text-center text-xl tracking-widest" />
                  <Button type="submit" className="w-full" isLoading={loading}>Verify & Enable</Button>
                </form>
                <button onClick={() => setMethod("intro")} className="text-sm text-slate-500 hover:underline">Back to options</button>
              </div>
            )}

            {method === "email" && step === "select" && (
              <div className="flex flex-col items-center space-y-6 py-4">
                <Mail className="w-12 h-12 text-blue-600" />
                <h2 className="text-xl font-semibold dark:text-white">Email Verification</h2>
                <p className="text-sm text-slate-500 text-center max-w-sm">We will send a 6-digit code to your email address. Enter it below to verify.</p>
                
                {!emailSent ? (
                  <Button onClick={sendEmailOtp} isLoading={loading}>Send Code to Email</Button>
                ) : (
                  <form onSubmit={verifyEmailOtp} className="w-full max-w-xs space-y-4">
                    <Input type="text" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="text-center text-xl tracking-widest" />
                    <Button type="submit" className="w-full" isLoading={loading}>Verify Code</Button>
                    <Button type="button" variant="outline" className="w-full" onClick={sendEmailOtp} disabled={emailCooldown > 0}>
                      {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Resend Code"}
                    </Button>
                  </form>
                )}
                <button onClick={() => setMethod("intro")} className="text-sm text-slate-500 hover:underline">Back to options</button>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-6 py-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">Security Method Enabled!</h2>
                  <p className="text-sm text-slate-500 mt-2">Now, set up backup methods so you don&apos;t get locked out.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {!passkeyRegistered && (
                    <div className="p-4 border rounded-xl dark:border-slate-800">
                      <Fingerprint className="w-6 h-6 text-blue-600 mb-2" />
                      <h3 className="font-semibold text-sm mb-1">Passkey</h3>
                      <p className="text-xs text-slate-500 mb-3">Use your device&apos;s face or fingerprint.</p>
                      <Button onClick={registerPasskey} size="sm" className="w-full">
                        Register Passkey
                      </Button>
                    </div>
                  )}

                  <div className="p-4 border rounded-xl dark:border-slate-800">
                    <FileKey className="w-6 h-6 text-amber-600 mb-2" />
                    <h3 className="font-semibold text-sm mb-1">Recovery Codes</h3>
                    <p className="text-xs text-slate-500 mb-3">Save these codes somewhere safe.</p>
                    <Button onClick={generateRecoveryCodes} size="sm" variant="outline" className="w-full">
                      Generate Codes
                    </Button>
                  </div>
                </div>

                {recoveryCodes.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-left">
                    <p className="text-xs font-semibold mb-2">Save these codes! They will not be shown again.</p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {recoveryCodes.map(c => <div key={c} className="bg-white dark:bg-slate-800 p-1 rounded text-center border">{c}</div>)}
                    </div>
                  </div>
                )}

                <Button className="mt-4 w-full md:w-auto" onClick={() => router.push(portal === 'patient' ? '/patient' : portal === 'staff' ? '/staff' : '/admin')}>
                  Done & Back to Dashboard
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}