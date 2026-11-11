"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Loader2, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: any[] }>("/me/notifications?limit=50")
      .then((r) => setNotifications(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="patient">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Bell className="w-6 h-6 text-blue-600" /> Notifications</h1>
        </div>

        <Card>
          {loading ? <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div> : notifications.length === 0 ? <div className="p-8 text-center text-slate-500">You have no new notifications.</div> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <li key={n.id} className={`p-4 ${n.read ? "opacity-60" : "bg-blue-50/50 dark:bg-blue-900/10"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${n.read ? "bg-slate-100 text-slate-400" : "bg-blue-100 text-blue-600"}`}>
                      {n.read ? <CheckCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm ${n.read ? "text-slate-600 dark:text-slate-400" : "font-medium text-slate-900 dark:text-white"}`}>{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}