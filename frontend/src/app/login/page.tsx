"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, Shield, CheckCircle2, Users } from "lucide-react";
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
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    clearApiCache();

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Check if the user has MFA enabled and needs to verify
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2') {
        // They have MFA, redirect to challenge page
        router.replace("/mfa-challenge");
        return;
      }

      // If no MFA required, proceed normally
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
      {/* LEFT SIDE - Image & Branding (Hidden on Mobile/Tablet) */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 text-white"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Placeholder, replace with your actual image
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B3D]/95 via-[#0B1B3D]/40 to-transparent"></div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-[#0B1B3D]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trust Bridge</h1>
            <p className="text-sm text-blue-200">Better Care. Stronger Trust.</p>
          </div>
        </div>

        {/* Middle Quote Box */}
        <div className="relative z-10 ml-auto w-80 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
          <div className="text-4xl text-blue-300 font-serif leading-none mb-2">“</div>
          <h2 className="text-xl font-bold mb-2 leading-tight">Your Data. Your Consent.<br/>Our Priority.</h2>
          <p className="text-sm text-blue-100/80 mb-4">
            We use advanced cybersecurity to protect your information and respect your consent at all times.
          </p>
          <p className="text-sm font-medium text-blue-200">— Your Healthcare Partner</p>
        </div>

        {/* Bottom Badges */}
        <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
          <div className="flex flex-col items-center text-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-300" />
            <span className="text-xs font-medium">Secure Access</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Lock className="w-6 h-6 text-blue-300" />
            <span className="text-xs font-medium">Data Protection</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Users className="w-6 h-6 text-blue-300" />
            <span className="text-xs font-medium">Your Consent Matters</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background Accents (Wavy shapes) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-tr-full opacity-50 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#0B1B3D] rounded-full flex items-center justify-center mb-4 shadow-lg">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#0B1B3D]">Trust Bridge</h1>
          </div>

          {/* Form Header */}
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
            {/* Email Field */}
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
                className="pl-11 h-14 rounded-xl border-slate-200 text-base shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-white"
              />
            </div>

            {/* Password Field */}
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
                className="pl-11 pr-12 h-14 rounded-xl border-slate-200 text-base shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-[#0B1B3D] focus:ring-[#0B1B3D] accent-[#0B1B3D]" />
                <span className="text-sm text-slate-600 font-medium">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-14 rounded-xl bg-[#0B1B3D] hover:bg-[#152a5a] text-white text-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-2" 
              isLoading={loading}
            >
              {!loading && <>Sign In <ArrowRight className="h-5 w-5" /></>}
            </Button>
          </form>

          {/* Bottom Trust Badge */}
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

// Add this small missing icon to prevent build errors
function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}