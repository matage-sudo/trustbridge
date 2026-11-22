"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Megaphone, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function StaffAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: any[] }>("/announcements")
      .then((res) => setItems(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="staff">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
            <Megaphone className="w-6 h-6 text-blue-600" /> Announcements
          </h1>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {!loading && items.length === 0 && !error && (
          <Card className="p-6">
            <p className="text-sm text-slate-500">No announcements have been posted yet.</p>
          </Card>
        )}
        <div className="space-y-4">
          {items.map((a: any) => (
            <Card key={a.id} className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-bold text-lg dark:text-white">{a.title}</h2>
                <span className="text-xs text-slate-400">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{a.body || a.content || ""}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}