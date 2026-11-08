"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState({ fullName: "", nationalId: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({
      email: formData.email, 
      password: formData.password,
      options: { data: { full_name: formData.fullName, national_id: formData.nationalId, user_type: "PATIENT" } },
    });
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
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
            <h2 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">Create an account</h2>
          </div>
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">{error}</div>}
            <Input label="Full Name" type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="John Doe" />
            <Input label="National ID" type="text" required value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} placeholder="12345678" />
            <Input label="Email address" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
            <Input label="Password" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            <div className="flex items-start mt-4">
              <input id="terms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-slate-700 dark:bg-slate-900" />
              <label htmlFor="terms" className="ml-3 text-sm text-slate-600 dark:text-slate-400">I agree to the Privacy Notice under DPA 2019.</label>
            </div>
            <Button type="submit" className="w-full mt-6" isLoading={isLoading}>Create account <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">Already registered?{" "}<Link href="/login" className="font-semibold text-brand-600 dark:text-brand-400">Sign in</Link></p>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2680&auto=format&fit=crop')" }} />
        <div className="absolute inset-0 bg-brand-900/80 mix-blend-multiply dark:bg-slate-950/90" />
      </div>
    </div>
  );
}
