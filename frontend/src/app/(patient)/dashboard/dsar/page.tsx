"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Download, Trash2, Edit, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function DSARPage() {
  const [requestState, setRequestState] = useState<"IDLE" | "CONFIRM" | "SUBMITTED">("IDLE");
  const [selectedAction, setSelectedAction] = useState<"ERASURE" | "CORRECTION" | null>(null);

  const handleActionClick = (action: "ERASURE" | "CORRECTION") => {
    setSelectedAction(action);
    setRequestState("CONFIRM");
  };

  const submitRequest = () => {
    setRequestState("SUBMITTED");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-trust-ink dark:text-white">Data Subject Rights</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Exercise your rights under the Data Protection Act, 2019.</p>
        </div>

        {requestState === "IDLE" && (
          <div className="grid gap-4">
            <button onClick={() => handleActionClick("ERASURE")} className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-red-300 hover:shadow-md transition-all text-left group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:bg-red-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-trust-ink dark:text-white">Right to Erasure (Right to be Forgotten)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request the permanent deletion of all your medical records.</p>
              </div>
            </button>

            <button onClick={() => handleActionClick("CORRECTION")} className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                <Edit className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-trust-ink dark:text-white">Right to Rectification</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request a correction to inaccurate personal data.</p>
              </div>
            </button>

            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm opacity-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:text-slate-400">
                <Download className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-trust-ink dark:text-white">Right of Access</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Available in the Data Vault.</p>
              </div>
            </div>
          </div>
        )}

        {requestState === "CONFIRM" && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-trust-ink dark:text-white mb-2">Are you absolutely sure?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Once you submit this request, the hospital will review it. Note that medical retention laws may require us to keep certain records (e.g., for 7 years) before they can be permanently deleted.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setRequestState("IDLE")} className="rounded-xl border border-slate-200 dark:border-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950">
                Cancel
              </button>
              <button onClick={submitRequest} className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Submit Request
              </button>
            </div>
          </div>
        )}

        {requestState === "SUBMITTED" && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-trust-ink dark:text-white">Request Submitted</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tracking ID: DSAR-2026-8821</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Compliance Deadline (30 Days)</span>
                <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Clock className="h-4 w-4" /> 29 Days Left
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-[3%] bg-amber-500 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                The hospital is legally required to respond to this request by <strong>December 2, 2026</strong>. A compliance officer has been notified.
              </p>
            </div>

            <button onClick={() => setRequestState("IDLE")} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950">
              Back to Rights Panel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

