"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Mail, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { clearApiCache, getApiContext } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up stale URL error parameters on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error") || url.searchParams.has("token_hash")) {
        url.searchParams.delete("error");
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Clean up stale URL parameters on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error") || url.searchParams.has("token_hash")) {
        url.searchParams.delete("error");
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    clearApiCache();

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2') {
        router.replace("/mfa-challenge");
        return;
      }

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
    <div className="min-h-screen flex bg-white">
      
      {/* LEFT SIDE - TRUSTBRIDGE BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0B1B3D] via-[#0f2a5c] to-[#0B1B3D] items-center justify-center p-6 sm:p-12">
        
        {/* Soft glowing background elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
        </div>

        {/* Content container directly on dark background */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
          
          {/* Logo wrapped in a clean white pill */}
          <div className="bg-white/95 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl border border-white/20 w-full max-w-[450px] flex justify-center">
            <img
              src="/trustbridge-logo.png"
              alt="TrustBridge Logo"
              className="w-full max-w-[380px] h-auto object-contain"
            />
          </div>

          {/* Divider */}
          <div className="w-24 h-1 bg-blue-500/30 rounded-full mb-8"></div>

          {/* Welcoming Text */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Welcome to TrustBridge
          </h1>
          
          <p className="text-blue-100/90 text-base sm:text-lg leading-relaxed max-w-md mb-8">
            Secure Health. Stronger Together. 
            <br />
            Log in to manage your care, access records, and connect with your healthcare team.
          </p>

          {/* Small trust badge */}
          <div className="flex items-center gap-2 text-blue-100/80 text-sm font-medium bg-white/10 px-5 py-2.5 rounded-full border border-white/20 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>HIPAA Compliant & End-to-End Encrypted</span>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-tr-full opacity-50 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#0B1B3D] rounded-full flex items-center justify-center mb-4 shadow-lg">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#0B1B3D]">Trust Bridge</h1>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-[#0B1B3D] tracking-tight mb-2">Sign In</h2>
            <p className="text-slate-500 font-medium">Access your account securely</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address or Staff ID"
                className="pl-11 h-14 rounded-xl border-slate-300 text-base shadow-sm focus:border-blue-600 focus:ring-blue-600 !bg-white !text-slate-900"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="pl-11 pr-12 h-14 rounded-xl border-slate-300 text-base shadow-sm focus:border-blue-600 focus:ring-blue-600 !bg-white !text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-[#0B1B3D] focus:ring-[#0B1B3D] accent-[#0B1B3D]" />
                <span className="text-sm text-slate-600 font-medium">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Forgot Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-xl bg-[#0B1B3D] hover:bg-[#152a5a] text-white text-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-2" 
              isLoading={loading}
            >
              {!loading && <>Sign In <ArrowRight className="h-5 w-5" /></>}
            </Button>
          </form>

          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="h-px bg-slate-200 flex-1"></div>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <ShieldCheck className="w-4 h-4" /> Trusted • Secure • Compliant
            </div>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

        </div>
      </div>
    </div>
  );
}