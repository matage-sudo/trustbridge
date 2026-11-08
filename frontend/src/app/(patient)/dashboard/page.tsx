"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, FileText, Activity, Key, Clock, ChevronRight, LogOut, Bot, Calendar, Pill, DollarSign, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AccessibleModeButton } from "@/components/ui/AccessibleMode";
import { RightsCarousel } from "@/components/ui/RightsCarousel";

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ consents: 0, encounters: 0, appointments: 0, prescriptions: 0, outstanding: 0 });

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);

      const [cRes, eRes, aRes, pRes, iRes] = await Promise.all([
        supabase.from("consents").select("*", { count: "exact", head: true }).eq("patient_id", session.user.id).eq("status", "ACTIVE"),
        supabase.from("encounters").select("*", { count: "exact", head: true }).eq("patient_id", session.user.id),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", session.user.id).eq("status", "SCHEDULED"),
        supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("patient_id", session.user.id),
        supabase.from("invoices").select("total").eq("patient_id", session.user.id).in("status", ["ISSUED", "PARTIAL"]),
      ]);

      const outstanding = (iRes.data || []).reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

      setStats({
        consents: cRes.count || 0,
        encounters: eRes.count || 0,
        appointments: aRes.count || 0,
        prescriptions: pRes.count || 0,
        outstanding,
      });
      setIsLoading(false);
    };
    loadData();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative dark:bg-slate-950">
      <AccessibleModeButton />
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">Patient Portal</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Welcome, {user?.user_metadata?.full_name || "Patient"}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Your health, your data, your control.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Consents", value: stats.consents, icon: FileText, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Visits", value: stats.encounters, icon: Activity, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Appointments", value: stats.appointments, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Prescriptions", value: stats.prescriptions, icon: Pill, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "Outstanding", value: `KES ${stats.outstanding}`, icon: DollarSign, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-base md:text-xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link href="/dashboard/vault" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Data Vault</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">View your medical records.</p>
          </Link>
          <Link href="/dashboard/consent" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Consent Manager</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage who sees your data.</p>
          </Link>
          <Link href="/dashboard/chatbot" className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-900/20">
            <h3 className="font-bold text-brand-900 dark:text-brand-100 mb-2 flex items-center gap-2"><Bot className="h-4 w-4" /> AI Assistant</h3>
            <p className="text-sm text-brand-700 dark:text-brand-300">Ask about your health.</p>
          </Link>
        </div>

        <div className="mt-6">
          <RightsCarousel />
        </div>
      </div>
    </div>
  );
}
