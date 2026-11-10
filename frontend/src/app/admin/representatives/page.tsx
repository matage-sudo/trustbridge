"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, Loader2, CheckCircle, XCircle, ShieldOff,
  AlertTriangle, UserCog, RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Status = "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
type Rep = {
  id: string;
  tenantId: string;
  patientId: string;
  authorityType: string;
  scope: string[];
  validUntil: string | null;
  verificationStatus: Status;
  initiatedBy: string;
  evidenceNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  revokedAt: string | null;
  representative: { displayName: string | null; email: string | null } | null;
  patient: { id: string; firstName: string; lastName: string; hospitalNumber: string } | null;
};

const STATUSES: Status[] = ["PENDING", "VERIFIED", "REJECTED", "REVOKED"];

const STATUS_COLORS: Record<Status, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  VERIFIED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  REVOKED: "bg-gray-100 text-gray-700 border-gray-200",
};

const AUTHORITY_LABEL: Record<string, string> = {
  PARENT: "Parent",
  LEGAL_GUARDIAN: "Legal guardian",
  NEXT_OF_KIN: "Next of kin",
  POWER_OF_ATTORNEY: "Power of attorney",
};

const SCOPE_LABEL: Record<string, string> = {
  VIEW_PROFILE: "View profile",
  EDIT_PROFILE: "Edit contact details",
  VIEW_DOCUMENTS: "View documents",
  UPLOAD_DOCUMENTS: "Upload documents",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function AdminRepresentativesPage() {
  const [items, setItems] = useState<Rep[]>([]);
  const [filter, setFilter] = useState<Status>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: "verify" | "reject"; id: string } | null>(null);
  const [dialogText, setDialogText] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);

  const load = async (status: Status) => {
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch<{ items: Rep[] }>(`/admin/representatives?status=${status}`);
      setItems(r.items);
    } catch (e: any) {
      setError(e.message === "forbidden" ? "You do not have permission to view this page." : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const openVerify = (id: string) => { setDialog({ kind: "verify", id }); setDialogText(""); };
  const openReject = (id: string) => { setDialog({ kind: "reject", id }); setDialogText(""); };
  const closeDialog = () => { if (!dialogBusy) { setDialog(null); setDialogText(""); } };

  const submitDialog = async () => {
    if (!dialog) return;
    setError(""); setNotice("");
    const text = dialogText.trim();
    if (dialog.kind === "verify" && text.length < 5) {
      setError("Evidence note is required (at least 5 characters).");
      return;
    }
    if (dialog.kind === "reject" && text.length < 3) {
      setError("Rejection reason is required (at least 3 characters).");
      return;
    }
    setDialogBusy(true);
    try {
      if (dialog.kind === "verify") {
        await apiFetch(`/admin/representatives/${dialog.id}/verify`, {
          method: "POST",
          body: JSON.stringify({ evidenceNote: text }),
        });
        setNotice("Representative verified.");
      } else {
        await apiFetch(`/admin/representatives/${dialog.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: text }),
        });
        setNotice("Representative rejected.");
      }
      closeDialog();
      await load(filter);
    } catch (e: any) {
      if (e.status === 409) setError("This grant is no longer pending.");
      else if (e.status === 403) setError("You cannot approve your own appointment as a representative.");
      else setError(e.message);
    } finally {
      setDialogBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError(""); setNotice(""); setActingId(id);
    try {
      await apiFetch(`/admin/representatives/${id}/revoke`, { method: "POST" });
      setNotice("Representative access revoked.");
      await load(filter);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="hover:text-blue-200" aria-label="Back to admin">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <UserCog className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Representative verification queue</h1>
          <button
            onClick={() => load(filter)}
            className="ml-auto inline-flex items-center gap-1 text-sm hover:text-blue-200"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
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

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                filter === s
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500 self-center">{items.length} shown</span>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No {filter.toLowerCase()} grants.</p>
          </div>
        )}

        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-900">
                      {r.representative?.displayName || r.representative?.email || "Unknown"}
                    </span>{" "}
                    acting for{" "}
                    <span className="font-medium text-gray-900">
                      {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "unknown patient"}
                    </span>
                    {r.patient?.hospitalNumber ? ` (${r.patient.hospitalNumber})` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {AUTHORITY_LABEL[r.authorityType] ?? r.authorityType} · requested {fmtDate(r.createdAt)}
                    {r.validUntil ? ` · expires ${fmtDate(r.validUntil)}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.verificationStatus]}`}>
                  {r.verificationStatus}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Permissions requested</p>
                <div className="flex flex-wrap gap-1">
                  {r.scope.map((s) => (
                    <span key={s} className="text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded px-2 py-0.5">
                      {SCOPE_LABEL[s] ?? s}
                    </span>
                  ))}
                </div>
              </div>

              {r.evidenceNote && (
                <p className="text-xs text-gray-600 mb-2">
                  <span className="font-medium">Requester note:</span> {r.evidenceNote}
                </p>
              )}
              {r.rejectionReason && (
                <p className="text-xs text-red-700 mb-2">
                  <span className="font-medium">Rejection reason:</span> {r.rejectionReason}
                </p>
              )}
              {r.approvedAt && (
                <p className="text-xs text-gray-500 mb-2">Verified {fmtDate(r.approvedAt)}</p>
              )}
              {r.revokedAt && (
                <p className="text-xs text-gray-500 mb-2">Revoked {fmtDate(r.revokedAt)}</p>
              )}

              {r.verificationStatus === "PENDING" && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => openVerify(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm px-3 py-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Verify
                  </button>
                  <button
                    onClick={() => openReject(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-sm px-3 py-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {r.verificationStatus === "VERIFIED" && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => revoke(r.id)}
                    disabled={actingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm px-3 py-1.5 disabled:opacity-50"
                  >
                    {actingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                    Revoke access
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>

      {dialog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={closeDialog}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900">
              {dialog.kind === "verify" ? "Verify representative" : "Reject request"}
            </h2>
            <p className="text-sm text-gray-600">
              {dialog.kind === "verify"
                ? "Confirm you have sighted evidence of this relationship. This will appear in the audit trail."
                : "Give a reason. The requester will see this."}
            </p>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">
                {dialog.kind === "verify" ? "Evidence note (required)" : "Reason (required)"}
              </span>
              <textarea
                className={INPUT + " mt-1"}
                rows={3}
                value={dialogText}
                onChange={(e) => setDialogText(e.target.value)}
                placeholder={dialog.kind === "verify"
                  ? "e.g. National ID sighted, relationship confirmed"
                  : "e.g. Evidence insufficient"}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={closeDialog} disabled={dialogBusy} className="rounded-lg border border-gray-300 text-sm px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={submitDialog}
                disabled={dialogBusy}
                className={`inline-flex items-center gap-1.5 rounded-lg text-white text-sm px-4 py-1.5 disabled:opacity-50 ${
                  dialog.kind === "verify" ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {dialogBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {dialog.kind === "verify" ? "Confirm verify" : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}