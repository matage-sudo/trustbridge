"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMins: number;
  reason: string | null;
  status: string;
  patient: { id: string; firstName: string; lastName: string; hospitalNumber: string };
  staff: { id: string; user: { displayName: string | null; email: string } };
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  hospitalNumber: string;
};

type StaffRow = {
  id: string;
  user: { displayName: string | null; email: string };
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-amber-100 text-amber-800",
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    staffId: "",
    scheduledAt: "",
    durationMins: 30,
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const url = filter ? `/appointments?status=${filter}` : "/appointments";
    Promise.all([
      apiFetch<{ items: Appointment[] }>(url),
      apiFetch<{ items: Patient[] }>("/patients"),
      apiFetch<{ items: StaffRow[] }>("/staff"),
    ])
      .then(([appts, pts, st]) => {
        setItems(appts.items);
        setPatients(pts.items);
        setStaff(st.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        patientId: form.patientId,
        staffId: form.staffId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMins: Number(form.durationMins),
        reason: form.reason || null,
      };
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setShowForm(false);
      setForm({ patientId: "", staffId: "", scheduledAt: "", durationMins: 30, reason: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">Schedule and manage patient appointments.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "Book Appointment"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h2 className="text-base font-semibold text-slate-900 mb-4">New Appointment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Patient</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.hospitalNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff</label>
                <select
                  required
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select staff...</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.displayName || s.user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date &amp; Time</label>
                <input
                  required
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={form.durationMins}
                  onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g., Annual check-up"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Booking..." : "Book Appointment"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            {["", "SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  filter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s ? STATUS_LABEL[s] : "All"}
              </button>
            ))}
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Staff</th>
                <th className="px-6 py-3 font-medium">Reason</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No appointments {filter ? `with status "${STATUS_LABEL[filter]}"` : "yet"}.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(a.scheduledAt).toLocaleString("en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="text-xs text-slate-400">· {a.durationMins}m</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-900 font-medium">
                      {a.patient.firstName} {a.patient.lastName}
                      <div className="text-xs text-slate-400 font-mono">
                        {a.patient.hospitalNumber}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {a.staff.user.displayName || a.staff.user.email}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{a.reason || "—"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[a.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {a.status === "SCHEDULED" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(a.id, "COMPLETED")}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleStatusChange(a.id, "CANCELLED")}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}