"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Search, FileText, Activity, ShieldAlert, AlertOctagon, X, CheckCircle2, Loader2, Stethoscope, Pill, Calendar, DollarSign } from "lucide-react";
import { StaffSidebar } from "@/components/staff/StaffSidebar";

export default function StaffDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, appointments: 0, prescriptions: 0, revenue: 0 });
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState("");
  const [breakGlassSuccess, setBreakGlassSuccess] = useState(false);
  const [staffRole, setStaffRole] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const loadRole = async () => {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data) setStaffRole(data.role);
    };
    loadRole();
  }, [user, supabase]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);

      const today = new Date().toISOString().split("T")[0];
      const [patRes, aptRes, rxRes, invRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "PATIENT"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).gte("scheduled_for", today),
        supabase.from("prescriptions").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("total").eq("status", "PAID"),
      ]);

      const revenue = (invRes.data || []).reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

      setStats({
        patients: patRes.count || 0,
        appointments: aptRes.count || 0,
        prescriptions: rxRes.count || 0,
        revenue,
      });
      setIsLoading(false);
    };
    loadData();
  }, [router, supabase]);

  const handleBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowBreakGlass(false);
    setBreakGlassSuccess(true);
    if (user) {
      await supabase.rpc("log_audit_event", {
        p_actor_id: user.id,
        p_action: "BREAK_GLASS_ACCESS",
        p_outcome: "SUCCESS",
      });
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  const staffName = user?.user_metadata?.full_name || "Doctor";
  

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {staffRole && <StaffSidebar userName={staffName} userRole={staffRole} />}

      <div className="flex-1 relative">
        {breakGlassSuccess && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg dark:bg-green-900/30 dark:border-green-900/50">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Break-Glass activated. Compliance Officer notified.</p>
            <button onClick={() => setBreakGlassSuccess(false)} className="text-green-600 hover:text-green-800"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Welcome, {staffName}</h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">Your clinical dashboard</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button onClick={() => setShowBreakGlass(true)} className="flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                <AlertOctagon className="h-4 w-4" /> Break-Glass
              </button>
              <Link href="/staff-dashboard/clinical" className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
                <Search className="h-4 w-4" /> Open EMR
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><FileText className="h-5 w-5" /></div>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-3">{stats.patients}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Patients</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"><Calendar className="h-5 w-5" /></div>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-3">{stats.appointments}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upcoming Appointments</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"><Pill className="h-5 w-5" /></div>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-3">{stats.prescriptions}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prescriptions Issued</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900/50 dark:bg-green-950/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"><DollarSign className="h-5 w-5" /></div>
              <p className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-400 mt-3">KES {stats.revenue.toLocaleString()}</p>
              <p className="text-xs text-green-700 dark:text-green-300">Revenue Collected</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/staff-dashboard/clinical" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 group">
              <Stethoscope className="h-8 w-8 text-brand-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Clinical EMR</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Record encounters, prescribe medicines, and order lab tests.</p>
            </Link>
            <Link href="/staff-dashboard/pharmacy" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 group">
              <Pill className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Pharmacy Inventory</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage drug stock, track expiry, and monitor low-stock alerts.</p>
            </Link>
            <Link href="/staff-dashboard/appointments" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 group">
              <Calendar className="h-8 w-8 text-amber-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Appointments</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Book, check-in, and complete patient visits.</p>
            </Link>
            <Link href="/staff-dashboard/billing" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 group">
              <DollarSign className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Billing</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Generate invoices and track patient payments.</p>
            </Link>
          </div>
        </div>
      </div>

      {showBreakGlass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600"><AlertOctagon className="h-6 w-6" /><h2 className="text-xl font-bold">Break-Glass Access</h2></div>
              <button onClick={() => setShowBreakGlass(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-lg bg-red-50 p-4 mb-4 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 text-sm text-red-800 dark:text-red-200">
              <strong>WARNING:</strong> This bypasses patient consent. The Compliance Officer will be immediately alerted.
            </div>
            <form onSubmit={handleBreakGlass} className="space-y-4">
              <textarea required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white min-h-[100px]" placeholder="Emergency reason..." value={breakGlassReason} onChange={(e) => setBreakGlassReason(e.target.value)}></textarea>
              <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700">
                <AlertOctagon className="h-5 w-5" /> Activate Break-Glass
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


