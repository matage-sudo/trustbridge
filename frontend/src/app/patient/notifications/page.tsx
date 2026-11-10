"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bell, BellOff, Loader2, Check, CheckCheck,
  AlertTriangle, CheckCircle, ShieldCheck, FileText, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "document.uploaded": FileText,
  "representative.verified": Users,
  "representative.revoked": Users,
  "representative.requested": Users,
  "access.granted": ShieldCheck,
  "access.denied": ShieldCheck,
  "dsr.updated": Bell,
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch<{ items: Notification[]; unreadCount: number }>("/me/notifications");
      setItems(r.items);
      setUnread(r.unreadCount);
    } catch (e: any) {
      setError(e.message === "no_patient_linked" ? "No patient record is linked to this account." : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markOne = async (id: string) => {
    setError(""); setNotice(""); setMarkingId(id);
    try {
      await apiFetch(`/me/notifications/${id}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMarkingId(null);
    }
  };

  const markAll = async () => {
    setError(""); setNotice(""); setMarkingAll(true);
    try {
      const r = await apiFetch<{ updated: number }>("/me/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      setNotice(`Marked ${r.updated} notification${r.updated === 1 ? "" : "s"} as read.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/patient" className="hover:text-blue-200" aria-label="Back to portal">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Bell className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unread > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">
              {unread} unread
            </span>
          )}
          <button
            onClick={load}
            className="ml-auto text-sm hover:text-blue-200"
            aria-label="Refresh"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{notice}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            You get a notification when a document is uploaded for you, when a representative is verified or revoked, or when a privacy request changes state.
          </p>
          {unread > 0 && (
            <button
              onClick={markAll}
              disabled={markingAll}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <BellOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No notifications yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Activity on your record will appear here.
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li
                key={n.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${
                  n.isRead ? "border-gray-200" : "border-blue-300 bg-blue-50/30"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <Icon className={`w-5 h-5 ${n.isRead ? "text-gray-400" : "text-blue-700"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${n.isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1.5" aria-label="unread" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{fmtDate(n.createdAt)}</span>
                    {!n.isRead && (
                      <button
                        onClick={() => markOne(n.id)}
                        disabled={markingId === n.id}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline disabled:opacity-50"
                      >
                        {markingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}