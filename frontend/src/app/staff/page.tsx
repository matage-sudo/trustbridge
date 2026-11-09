"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Calendar, Users, Activity, CheckCircle, Search, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  reason: string | null;
  patient: { firstName: string; lastName: string; hospitalNumber: string };
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  hospitalNumber: string;
};

export default function StaffDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [updatingAppt, setUpdatingAppt] = useState<string | null>(null);

  // Patient Directory State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const loadAppointments = () => {
    setLoadingAppts(true);
    apiFetch<{ items: Appointment[] }>("/appointments?mine=true")
      .then((res) => setAppointments(res.items))
      .catch(console.error)
      .finally(() => setLoadingAppts(false));
  };

  const loadPatients = (searchQuery: string) => {
    setLoadingPatients(true);
    apiFetch<{ items: Patient[] }>(`/patients?search=${encodeURIComponent(searchQuery)}`)
      .then((res) => setPatients(res.items))
      .catch(console.error)
      .finally(() => setLoadingPatients(false));
  };

  useEffect(() => {
    loadAppointments();
    const timer = setTimeout(() => loadPatients(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const markComplete = async (id: string) => {
    setUpdatingAppt(id);
    try {
      await apiFetch(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) });
      loadAppointments();
    } catch (e: any) { alert(e.message); } 
    finally { setUpdatingAppt(null); }
  };

  const requestAccess = async (patientId: string, patientName: string) => {
    setRequestingId(patientId);
    setRequestSuccess(null);
    try {
      await apiFetch("/access-requests", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          purpose: "TREATMENT",
          reason: "Clinical review required",
          requestedDurationHours: 4
        })
      });
      setRequestSuccess(`Request sent for ${patientName}. Awaiting admin approval.`);
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setRequestingId(null); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const upcoming = appointments.filter((a) => a.status === "SCHEDULED");
  const completedToday = appointments.filter(
    (a) => a.status === "COMPLETED" && new Date(a.scheduledAt).toDateString() === new Date().toDateString()
  );

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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upcoming</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{upcoming.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed Today</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{completedToday.length}</div>
          </div>
        </div>

        {/* Patient Directory Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Patient Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Search for a patient to request access to their records.</p>
          </div>
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or MRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>
            {requestSuccess && (
               <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                 <CheckCircle className="h-4 w-4" /> {requestSuccess}
               </div>
            )}
          </div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {loadingPatients ? (
                <tr><td className="px-6 py-4 text-center text-slate-500">Searching...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td className="px-6 py-4 text-center text-slate-500">No patients found.</td></tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {p.firstName} {p.lastName}
                      <div className="text-xs text-slate-500 font-mono">{p.hospitalNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => requestAccess(p.id, `${p.firstName} ${p.lastName}`)}
                        disabled={requestingId === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-3 w-3" /> 
                        {requestingId === p.id ? "Requesting..." : "Request Access"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Schedule Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">My Schedule</h2>
          </div>
          {loadingAppts ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No appointments.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.map((appt) => (
                <li key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{appt.patient.firstName} {appt.patient.lastName}</p>
                    <p className="text-xs text-slate-500 font-mono">{appt.patient.hospitalNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-slate-900">{new Date(appt.scheduledAt).toLocaleString()}</p>
                      <span className={`inline-flex mt-1 rounded px-2 py-0.5 text-xs font-semibold ${
                        appt.status === "SCHEDULED" ? "bg-blue-100 text-blue-800" :
                        appt.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}>{appt.status}</span>
                    </div>
                    {appt.status === "SCHEDULED" && (
                      <button onClick={() => markComplete(appt.id)} disabled={updatingAppt === appt.id} className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700">
                        Complete
                      </button>
                    )}
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