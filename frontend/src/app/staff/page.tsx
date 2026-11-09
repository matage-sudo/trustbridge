"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Calendar, Users, Activity, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  patient: { firstName: string; lastName: string; hospitalNumber: string };
};

export default function StaffDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch appointments assigned to *this* specific staff member.
    // For this demo, we fetch all appointments for the tenant.
    apiFetch<{ items: Appointment[] }>("/appointments")
      .then((res) => setAppointments(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">TrustBridge Clinical</h1>
              <p className="text-xs text-slate-500">Staff Workspace</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upcoming Appointments</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{appointments.filter(a => a.status === 'SCHEDULED').length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Patients Seen Today</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">0</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">My Schedule</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading schedule...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No appointments scheduled.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.map((appt) => (
                <li key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{appt.patient.firstName} {appt.patient.lastName}</p>
                    <p className="text-xs text-slate-500 font-mono">{appt.patient.hospitalNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-900">{new Date(appt.scheduledAt).toLocaleString()}</p>
                    <span className={`inline-flex mt-1 rounded px-2 py-0.5 text-xs font-semibold ${appt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {appt.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}