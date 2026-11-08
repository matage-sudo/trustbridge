"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Calendar, Plus, Clock, User, Search, Loader2, CheckCircle2, XCircle, UserCheck } from "lucide-react";

interface Patient { id: string; full_name: string; email: string; }
interface Doctor { id: string; full_name: string; email: string; }
interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department: string;
  scheduled_for: string;
  duration_minutes: number;
  status: string;
  reason: string;
  patient?: Patient;
  doctor?: Doctor;
}

export default function AppointmentsPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("TODAY");

  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    department: "General Medicine",
    scheduled_for: "",
    duration_minutes: "20",
    reason: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    const [pRes, dRes, aRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("role", "PATIENT").order("full_name"),
      supabase.from("profiles").select("id, full_name, email").eq("role", "DOCTOR").order("full_name"),
      supabase.from("appointments").select("*, patient:profiles!appointments_patient_id_fkey(id, full_name, email), doctor:profiles!appointments_doctor_id_fkey(id, full_name, email)").order("scheduled_for", { ascending: true }),
    ]);
    if (pRes.data) setPatients(pRes.data);
    if (dRes.data) setDoctors(dRes.data);
    if (aRes.data) setAppointments(aRes.data);
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("appointments").insert([{
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id || null,
      department: formData.department,
      scheduled_for: formData.scheduled_for,
      duration_minutes: parseInt(formData.duration_minutes) || 20,
      reason: formData.reason,
      status: "SCHEDULED",
    }]);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Appointment booked successfully!");
      setFormData({ patient_id: "", doctor_id: "", department: "General Medicine", scheduled_for: "", duration_minutes: "20", reason: "" });
      setShowForm(false);
      loadData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (!error) {
      setMessage(`Appointment marked as ${status}`);
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "CHECKED_IN": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "COMPLETED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "NO_SHOW": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "CANCELLED": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  // Filter appointments
  const today = new Date().toISOString().split("T")[0];
  const filteredAppointments = appointments.filter(a => {
    if (filterStatus === "TODAY") return a.scheduled_for.startsWith(today);
    if (filterStatus === "UPCOMING") return new Date(a.scheduled_for) > new Date();
    if (filterStatus === "ALL") return true;
    return a.status === filterStatus;
  });

  const stats = {
    today: appointments.filter(a => a.scheduled_for.startsWith(today)).length,
    pending: appointments.filter(a => a.status === "SCHEDULED").length,
    completed: appointments.filter(a => a.status === "COMPLETED").length,
    noShow: appointments.filter(a => a.status === "NO_SHOW").length,
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/staff-dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Appointments & Scheduling</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Book, check-in, and complete patient visits</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> {showForm ? "Close" : "New Appointment"}
          </button>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-4 text-sm font-semibold ${message.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}>
            {message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-blue-600" /><span className="text-xs text-slate-500">Today</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.today}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-slate-500">Scheduled</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-xs text-slate-500">Completed</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><XCircle className="h-4 w-4 text-red-600" /><span className="text-xs text-slate-500">No Show</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.noShow}</p>
          </div>
        </div>

        {/* New Appointment Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/30">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Book New Appointment</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select required value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="">Select Patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
              </select>
              <select value={formData.doctor_id} onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="">Select Doctor (optional)...</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
              <input required type="datetime-local" value={formData.scheduled_for} onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option>General Medicine</option><option>Pediatrics</option><option>Maternity</option><option>Dental</option><option>Surgery</option>
              </select>
              <input placeholder="Duration (min)" type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input placeholder="Reason for visit" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <button type="submit" className="md:col-span-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Book Appointment
              </button>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {["TODAY", "UPCOMING", "SCHEDULED", "CHECKED_IN", "COMPLETED", "ALL"].map((f) => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filterStatus === f ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"}`}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="mx-auto h-12 w-12 mb-4 text-slate-300" />
              <p className="text-sm">No appointments found. Click "New Appointment" to book one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{apt.patient?.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(apt.scheduled_for).toLocaleString()}</p>
                      {apt.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">"{apt.reason}"</p>}
                      {apt.doctor && <p className="text-xs text-slate-500 dark:text-slate-400">with {apt.doctor.full_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(apt.status)}`}>{apt.status}</span>
                    {apt.status === "SCHEDULED" && (
                      <button onClick={() => updateStatus(apt.id, "CHECKED_IN")} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400">
                        <UserCheck className="h-3 w-3 inline mr-1" /> Check In
                      </button>
                    )}
                    {apt.status === "CHECKED_IN" && (
                      <button onClick={() => updateStatus(apt.id, "COMPLETED")} className="rounded-lg bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" /> Complete
                      </button>
                    )}
                    {(apt.status === "SCHEDULED" || apt.status === "CHECKED_IN") && (
                      <button onClick={() => updateStatus(apt.id, "CANCELLED")} className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        <XCircle className="h-3 w-3 inline mr-1" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

