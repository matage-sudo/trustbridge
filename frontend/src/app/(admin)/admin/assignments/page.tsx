"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Users, Stethoscope, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AssignmentsPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedNurse, setSelectedNurse] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    
    if (profiles) {
      setPatients(profiles.filter(p => p.role === 'PATIENT'));
      setDoctors(profiles.filter(p => p.role === 'DOCTOR'));
      setNurses(profiles.filter(p => p.role === 'NURSE'));
    }

    const { data: assignData } = await supabase.from('patient_assignments').select('*, patient:profiles!patient_assignments_patient_id_fkey(*), doctor:profiles!patient_assignments_doctor_id_fkey(*), nurse:profiles!patient_assignments_nurse_id_fkey(*)');
    if (assignData) setAssignments(assignData);

    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setMessage("Please select a patient"); return; }

    const { error } = await supabase.from('patient_assignments').upsert({
      patient_id: selectedPatient,
      doctor_id: selectedDoctor || null,
      nurse_id: selectedNurse || null,
    }, { onConflict: 'patient_id' });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Assignment saved successfully!");
      setSelectedPatient("");
      setSelectedDoctor("");
      setSelectedNurse("");
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOC
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Care Team Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">Assign doctors and nurses to patients under their care</p>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-4 text-sm font-semibold ${message.startsWith('Error') ? 'bg-red-900/30 border border-red-900/50 text-red-400' : 'bg-green-900/30 border border-green-900/50 text-green-400'}`}>
            {message}
          </div>
        )}

        {/* Assignment Form */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-500" /> New Assignment
          </h2>
          <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} required className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white">
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white">
              <option value="">Assign Doctor (optional)</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name || d.email}</option>)}
            </select>
            <select value={selectedNurse} onChange={(e) => setSelectedNurse(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white">
              <option value="">Assign Nurse (optional)</option>
              {nurses.map(n => <option key={n.id} value={n.id}>Nurse {n.full_name || n.email}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-500">Save Assignment</button>
          </form>
        </div>

        {/* Current Assignments */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-500" /> Current Care Teams ({assignments.length})
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Assigned Doctor</th>
                <th className="px-4 py-3">Assigned Nurse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No care teams assigned yet</td></tr>
              ) : assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-white font-medium">{a.patient?.full_name || 'N/A'}</td>
                  <td className="px-4 py-3">
                    {a.doctor ? (
                      <span className="inline-flex items-center gap-2 text-blue-400">
                        <Stethoscope className="h-4 w-4" /> Dr. {a.doctor.full_name}
                      </span>
                    ) : <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.nurse ? (
                      <span className="inline-flex items-center gap-2 text-pink-400">
                        <Heart className="h-4 w-4" /> Nurse {a.nurse.full_name}
                      </span>
                    ) : <span className="text-slate-600">Unassigned</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
