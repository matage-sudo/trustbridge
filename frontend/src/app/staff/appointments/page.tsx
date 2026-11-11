"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Calendar } from "lucide-react";

export default function StaffAppointments() {
  const [appts, setAppts] = useState<any[]>([]);
  useEffect(() => {
    apiFetch<{items: any[]}>("/appointments").then(res => setAppts(res.items)).catch(() => {});
  }, []);

  return (
    <AppShell portal="staff">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">My Schedule</h1>
        <div className="space-y-4">
          {appts.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">No upcoming appointments.</Card>
          ) : appts.map(a => (
            <Card key={a.id} className="p-4 flex gap-4 items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-white">{a.firstName} {a.lastName}</h3>
                <p className="text-sm text-slate-500">{new Date(a.scheduledAt).toLocaleString()} • {a.durationMins} mins</p>
                <p className="text-xs text-slate-400 mt-1">Reason: {a.reason || 'General checkup'}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}