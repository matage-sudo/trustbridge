"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Plus, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Consent = {
  id: string;
  purpose: string;
  noticeVersion: string;
  language: string;
  grantedAt: string;
  effectiveFrom: string;
  expiresAt: string | null;
  status: string;
  revokedAt: string | null;
  revocationReason: string | null;
  patient: { id: string; firstName: string; lastName: string; hospitalNumber: string };
};

type Patient = { id: string; firstName: string; lastName: string; hospitalNumber: string };

const PURPOSE_OPTIONS = ["TREATMENT", "RESEARCH", "DISCLOSURE", "BILLING", "TEACHING"];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  REVOKED: "bg-red-100 text-red-800",
  EXPIRED: "bg-slate-100 text-slate-600",
};

export default function ConsentsPage() {
  const [items, setItems] = useState<Consent[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    purpose: "TREATMENT",
    noticeVersion: "v1.0-2026-11",
    language: "en",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const load = () => {
    setLoading(true);
    const url = filter ? `/consents?status=${filter}` : "/consents";
    Promise.all([apiFetch<{ items: Consent[] }>(url), apiFetch<{ items: Patient[] }>("/patients")])
      .then(([c, p]) => {
        setItems(c.items);
        setPatients(p.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/consents", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ patientId: "", purpose: "TREATMENT", noticeVersion: "v1.0-2026-11", language: "en" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiFetch(`/consents/${id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason: revokeReason || "Not specified" }),
      });
      setRevoking(null);
      setRevokeReason("");
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
            <h1 className="text-2xl font-bold text-slate-900">Consents</h1>
            <p className="text-sm text-slate-500 mt-1">Record and manage patient consent grants.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "Grant Consent"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">New Consent</h2>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                <select
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {PURPOSE_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notice Version</label>
                <input
                  required
                  type="text"
                  value={form.noticeVersion}
                  onChange={(e) => setForm({ ...form, noticeVersion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Granting..." : "Grant Consent"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            {["", "ACTIVE", "REVOKED", "EXPIRED"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  filter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
              </button>
            ))}
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Purpose</th>
                <th className="px-6 py-3 font-medium">Notice</th>
                <th className="px-6 py-3 font-medium">Granted</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No consents yet.</td></tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                        {c.patient.firstName} {c.patient.lastName}
                        <span className="text-xs font-mono text-slate-400">{c.patient.hospitalNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{c.purpose}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {c.noticeVersion}
                      <div className="text-xs text-slate-400">{c.language.toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {new Date(c.grantedAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status] || "bg-slate-100 text-slate-600"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {c.status === "ACTIVE" && (
                        <button
                          onClick={() => setRevoking(c.id)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Revoke
                        </button>
                      )}
                      {c.status === "REVOKED" && c.revocationReason && (
                        <span className="text-xs text-slate-400">{c.revocationReason}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {revoking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Revoke Consent</h3>
            <p className="text-sm text-slate-600 mb-4">This will mark the consent as revoked. The action is logged.</p>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g., Patient requested withdrawal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRevoking(null); setRevokeReason(""); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revoking)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}