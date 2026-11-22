"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Users, Calendar, ShieldAlert, FileText, CheckCircle, Clock, ChevronRight, BrainCircuit } from "lucide-react";
import { ArrowRightLeft, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function StaffDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Transfer Patient State
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    apiFetch<any>("/staff/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch assigned patients
    apiFetch<any>("/patients")
      .then((res) => {
        // Filter patients where primaryDoctorId matches the current doctor
        // (The backend returns primaryDoctorId in the patient object)
        const assigned = res.items.filter((p: any) => p.primaryDoctorId);
        setMyPatients(assigned);
      })
      .catch(console.error);

    // Fetch available doctors for transfer
    apiFetch<any>("/staff")
      .then((res) => setDoctors(res.items.filter((s: any) => s.role === "STAFF" || s.role === "NURSE")))
      .catch(console.error);
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId) return;
    setTransferLoading(true);
    try {
      await apiFetch("/patients/assignment/transfer", {
        method: "POST",
        body: JSON.stringify({ patientId: selectedPatient.id, newDoctorMembershipId: selectedDoctorId })
      });
      alert("Patient transferred successfully. Notifications sent.");
      setTransferModalOpen(false);
      setSelectedDoctorId("");
      // Refresh the list by reloading the page
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || "Failed to transfer patient");
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) return <AppShell portal="staff"><div className="p-8 text-slate-500">Loading clinical dashboard...</div></AppShell>;
  if (error) return <AppShell portal="staff"><div className="p-8 text-red-500">Error: {error}</div></AppShell>;

  return (
    <AppShell portal="staff">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Department Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {data?.stats?.role?.replace("_", " ") || "Staff"}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/appointments" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors">
            <Calendar className="w-4 h-4" /> Schedule
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Scheduled Today", value: data?.stats?.scheduledToday?.toString() || "0", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Completed", value: data?.stats?.completedToday?.toString() || "0", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { title: "At-Risk", value: data?.stats?.atRisk?.toString() || "0", icon: Activity, color: "text-red-600", bg: "bg-red-50" },
          { title: "Total Patients", value: data?.stats?.totalPatients?.toString() || "0", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((card, i) => (
          <Card key={i} className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${card.bg} flex items-center justify-center dark:bg-opacity-20`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold dark:text-white">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* MY ASSIGNED PATIENTS */}
          <Card className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold dark:text-white">My Assigned Patients</h2>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {myPatients.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">You have no patients assigned to you.</li>
              ) : (
                myPatients.map((p: any) => (
                  <li key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div>
                      <Link href={`/staff/patients/${p.id}`} className="font-medium text-sm text-blue-600 hover:underline dark:text-blue-400">
                        {p.firstName} {p.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">MRN: {p.hospitalNumber}</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedPatient(p); setTransferModalOpen(true); }}
                      className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded hover:bg-amber-200 flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Transfer
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold dark:text-white">Today&apos;s Schedule</h2>
              <Link href="/staff/appointments" className="text-sm font-medium text-blue-600 hover:underline">View All</Link>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(!data?.todaySchedule || data.todaySchedule.length === 0) ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">No appointments scheduled for today.</li>
              ) : data.todaySchedule.map((apt: any, i: number) => (
                <li key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-20 text-sm font-semibold text-slate-600 dark:text-slate-300">{apt.time}</div>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{apt.patientName}</p>
                      <p className="text-xs text-slate-500">{apt.reason}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${apt.status === "Confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{apt.status}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-hidden border-red-200 dark:border-red-900">
            <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-red-900 dark:text-red-400 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Emergency Reviews</h2>
              <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{data?.stats?.pendingEmergencyReviews || 0} Pending</span>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Emergency break-glass events require administrative review within 24 hours.</p>
              <Link href="/staff/emergency" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline">Review grants <ChevronRight className="w-4 h-4" /></Link>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Link href="/staff/ai-risk" className="block bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl shadow-sm p-6 hover:opacity-95 transition-opacity">
            <div className="flex items-center gap-3 mb-2"><BrainCircuit className="w-6 h-6" /><h2 className="font-bold text-lg">AI Risk</h2></div>
            <p className="text-sm text-indigo-100 mb-4">Model-assisted risk scoring for the patients on today&apos;s schedule.</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium">Open dashboard <ChevronRight className="w-4 h-4" /></span>
          </Link>

          <Card className="p-6">
            <h2 className="font-bold mb-4 dark:text-white">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/staff/request-access" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors">
                <FileText className="w-5 h-5 text-blue-600 mb-2" /><span className="text-xs font-medium dark:text-white text-center">Request Access</span>
              </Link>
              <Link href="/staff/emergency" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors">
                <ShieldAlert className="w-5 h-5 text-purple-600 mb-2" /><span className="text-xs font-medium dark:text-white text-center">Emergency</span>
              </Link>
              <Link href="/staff/appointments" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors">
                <Clock className="w-5 h-5 text-amber-600 mb-2" /><span className="text-xs font-medium dark:text-white text-center">My Schedule</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {transferModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold dark:text-white">Transfer {selectedPatient.firstName}</h2>
              <button onClick={() => setTransferModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleTransfer} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Select New Doctor</label>
                <select 
                  required 
                  value={selectedDoctorId} 
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  <option value="">-- Select a Doctor --</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.user.displayName || d.user.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={transferLoading}>Transfer Patient</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}