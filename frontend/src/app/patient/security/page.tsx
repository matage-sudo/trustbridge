"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Shield, Monitor, Smartphone, Loader2,
  LogOut, AlertTriangle, CheckCircle, MapPin, Clock
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  device: { label: string; platform: string; trusted: boolean } | null;
};

type Alert = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  description: string;
  acknowledged: boolean;
  createdAt: string;
  metadata: any;
};

export default function SecurityCentrePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState("");

  
  const acknowledgeAlert = async (id: string) => {
    try {
      await apiFetch(`/me/security/alerts/${id}/acknowledge`, { method: "POST" });
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    }
  };const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ items: Session[] }>("/security/sessions"),
      apiFetch<{ items: Alert[] }>("/security/alerts"),
    ])
      .then(([s, a]) => {
        setSessions(s.items);
        setAlerts(a.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Sign out of this device? You will need to log in again on that device.")) return;
    setActioning(id);
    try {
      await apiFetch(`/security/sessions/${id}/revoke`, { method: "POST" });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setActioning(null); }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Sign out of all sessions? You will need to log in again on every device.")) return;
    setRevokingAll(true);
    try {
      await apiFetch("/security/sessions/revoke-all", {
        method: "POST",
        body: JSON.stringify({}),
      });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setRevokingAll(false); }
  };

  const handleAcknowledge = async (id: string) => {
    setActioning(id);
    try {
      await apiFetch(`/security/alerts/${id}/acknowledge`, { method: "POST" });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setActioning(null); }
  };

  const getDeviceIcon = (platform: string | null | undefined) => {
    if (!platform) return <Monitor className="h-4 w-4" />;
    const p = platform.toLowerCase();
    if (p.includes("ios") || p.includes("android")) return <Smartphone className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/patient" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Health Record
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Security Centre</h1>
            <p className="text-sm text-slate-500">Manage your active sessions, devices, and security alerts.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SECTION 1: ALERTS */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Security Alerts ({alerts.length})
            </h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={`h-4 w-4 ${alert.severity === "HIGH" ? "text-red-600" : "text-amber-600"}`} />
                        <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{alert.description}</p>
                      <p className="text-xs text-slate-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatRelativeTime(alert.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actioning === alert.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 disabled:opacity-50 whitespace-nowrap"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {actioning === alert.id ? "..." : "Was this you? Yes"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: ACTIVE SESSIONS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Active Sessions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Devices currently logged into your TrustBridge account.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                <LogOut className="h-3 w-3" />
                {revokingAll ? "Signing out..." : "Sign out all devices"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No active sessions. Your sessions expire after inactivity.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((session, index) => (
                <li key={session.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-slate-100 text-slate-600">
                        {getDeviceIcon(session.device?.platform)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900">
                            {session.device?.label ?? "Unknown device"}
                          </p>
                          {index === 0 && (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                              This device
                            </span>
                          )}
                          {session.device?.trusted && (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                              Trusted
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          {session.ipAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {session.location ?? session.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Active {formatRelativeTime(session.lastSeenAt)}
                          </span>
                        </div>
                        {session.userAgent && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-md font-mono">
                            {session.userAgent}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(session.id)}
                      disabled={actioning === session.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      <LogOut className="h-3 w-3" />
                      {actioning === session.id ? "..." : "Sign out"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SECTION 3: SECURITY TIPS */}
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4" /> Security Tips
          </h3>
          <ul className="text-xs text-indigo-800 space-y-1.5">
            <li>• If you see a device or session you do not recognise, sign it out immediately and change your password.</li>
            <li>• Never share your TrustBridge password with anyone, including hospital staff.</li>
            <li>• Use a unique password for your health record that you do not use on other sites.</li>
            <li>• Sign out of public or shared computers after each session.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}