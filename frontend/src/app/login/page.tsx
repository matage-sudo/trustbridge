"use client";

import { useState } from "react";
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
      {/* LEFT SIDE - Your Custom Image */}
      {/* We use bg-cover and bg-center to make sure it fills the left side perfectly */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('/login-bg.png')",
        }}
      />

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
                className="pl-11 h-14 rounded-xl border-slate-300 text-base shadow-sm focus:border-blue-600 focus:ring-blue-600 !bg-white !text-slate-900"
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