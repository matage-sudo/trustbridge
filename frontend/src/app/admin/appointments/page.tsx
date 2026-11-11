"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import PatientSearch from "@/components/PatientSearch";

export default function AdminAppointments() {
  const [form, setForm] = useState({ patientId: "", patientName: "", staffId: "", scheduledAt: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({ ...form, durationMins: 30 }),
      });
      setMessage("✅ Appointment booked successfully!");
      setForm({ patientId: "", patientName: "", staffId: "", scheduledAt: "", reason: "" });
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell portal="admin">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Book Appointment</h1>
        
        <Card className="p-6">
          <form onSubmit={handleBook} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Search Patient</label>
              <PatientSearch onSelect={(id, name) => setForm({ ...form, patientId: id, patientName: name })} />
              {form.patientName && <p className="text-sm text-green-600 mt-1">Selected: {form.patientName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Staff Member ID</label>
              <input type="text" required placeholder="Paste Staff ID here..." className="w-full border p-2 rounded text-black" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Date & Time</label>
              <input type="datetime-local" required className="w-full border p-2 rounded text-black" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason</label>
              <input type="text" placeholder="Routine checkup..." className="w-full border p-2 rounded text-black" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <Button type="submit" disabled={loading || !form.patientId} className="w-full">
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </form>

          {message && <div className="mt-4 p-3 bg-slate-50 text-slate-800 rounded font-medium text-center">{message}</div>}
        </Card>
      </div>
    </AppShell>
  );
}