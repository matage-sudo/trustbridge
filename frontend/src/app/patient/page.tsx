"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogOut, FileText, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

export default function PatientPortal() {
  const router = useRouter();
  const supabase = createClient();
  const [patient, setPatient] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);

  useEffect(() => {
    // Fetch the patient profile
    apiFetch<{ items: any[] }>("/patients")
      .then((res) => {
        if (res.items.length > 0) setPatient(res.items[0]); // Simulate logged-in patient
      })
      .catch(console.error);

    // Fetch the patient's consents
    apiFetch<{ items: any[] }>("/consents")
      .then((res) => setConsents(res.items))
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">My Health Record</h1>
              <p className="text-sm text-blue-200">TrustBridge Patient Portal</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium hover:text-blue-200">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {patient ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Welcome, {patient.firstName}</h2>
            <p className="text-sm text-slate-500">Hospital Number: <span className="font-mono">{patient.hospitalNumber}</span></p>
            <p className="text-sm text-slate-500">Date of Birth: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-slate-500">Loading profile...</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">My Consents</h2>
          </div>
          {consents.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No active consents recorded.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {consents.map((c) => (
                <li key={c.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{c.purpose}</p>
                    <p className="text-xs text-slate-500">Notice Version: {c.noticeVersion}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}