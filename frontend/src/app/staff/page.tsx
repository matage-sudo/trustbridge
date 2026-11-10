"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Users, Search, Calendar, CheckCircle, ArrowRight , ShieldAlert } from "lucide-react"
import { apiFetch } from "@/lib/api";

type Patient = { id: string; firstName: string; lastName: string; hospitalNumber: string };
type Appt = { id: string; patient: { firstName: string; lastName: string; hospitalNumber: string }; scheduledAt: string; status: string };

export default function StaffPortalPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatients = apiFetch<any>("/patients")
      .then((r) => {
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.items)) return r.items;
        if (Array.isArray(r?.data)) return r.data;
        if (Array.isArray(r?.results)) return r.results;
        console.warn("Unexpected /patients response shape:", r);
        return [];
      })
      .catch(() => []);

    const loadAppts = apiFetch<any>("/staff/appointments")
      .then((r) => {
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.items)) return r.items;
        return [];
      })
      .catch(() => []);

    Promise.all([loadPatients, loadAppts])
      .then(([p, a]) => {
        setPatients(p);
        setAppointments(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName} ${p.hospitalNumber}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white border-b border-blue-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-300" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">TrustBridge Clinical</h1>
              <p className="text-xs text-blue-200">Staff Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/staff/dashboard" className="text-sm font-medium hover:text-blue-200 flex items-center gap-1">
              Staff Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-sm font-medium hover:text-blue-200">Sign out</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 text-blue-700 mb-2">
              <Calendar className="w-5 h-5" />
              <h2 className="font-semibold text-sm">Upcoming</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">{appointments.filter(a => a.status === 'SCHEDULED').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 text-green-700 mb-2">
              <CheckCircle className="w-5 h-5" />
              <h2 className="font-semibold text-sm">Completed Today</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">{appointments.filter(a => a.status === 'COMPLETED').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Patient Directory</h2>
            <p className="text-xs text-gray-500 mt-1">Search for a patient to request access to their records.</p>
          </div>
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or MRN..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="divide-y divide-gray-100">
            {loading && <li className="px-5 py-4 text-sm text-gray-500">Loading patients...</li>}
            {!loading && filteredPatients.length === 0 && (
              <li className="px-5 py-4 text-sm text-gray-500">No patients found.</li>
            )}
            {filteredPatients.map((p) => (
              <li key={p.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-gray-500">{p.hospitalNumber}</p>
                </div>
                <Link 
                  href={`/staff/request-access?patientId=${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Request Access
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Schedule</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {loading && <li className="px-5 py-4 text-sm text-gray-500">Loading...</li>}
            {!loading && appointments.length === 0 && (
              <li className="px-5 py-4 text-sm text-gray-500">No appointments scheduled.</li>
            )}
            {appointments.map((a) => (
              <li key={a.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.patient?.firstName} {a.patient?.lastName}</p>
                  <p className="text-xs text-gray-500">{a.patient?.hospitalNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{new Date(a.scheduledAt).toLocaleString()}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}