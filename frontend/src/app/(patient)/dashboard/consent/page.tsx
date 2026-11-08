"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Consent {
  id: string;
  granted_to: string;
  purpose: string;
  scope: string;
  status: "ACTIVE" | "REVOKED";
  granted_at: string;
}

export default function ConsentManagerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadConsents = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("consents")
      .select("*")
      .eq("patient_id", session.user.id)
      .order("granted_at", { ascending: false });

    if (!error && data) setConsents(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const handleRevoke = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from("consents")
      .update({ status: "REVOKED" })
      .eq("id", id);

    if (!error) {
      // Audit log entry
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.rpc("log_audit_event", {
        p_actor_id: session?.user.id,
        p_action: "CONSENT_REVOKED",
        p_outcome: "SUCCESS",
      });
      loadConsents();
    }
    setProcessingId(null);
  };

  const handleReactivate = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from("consents")
      .update({ status: "ACTIVE" })
      .eq("id", id);

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.rpc("log_audit_event", {
        p_actor_id: session?.user.id,
        p_action: "CONSENT_REACTIVATED",
        p_outcome: "SUCCESS",
      });
      loadConsents();
    }
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Consent Manager
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {consents.length} consent records on file
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Grant New Consent
          </button>
        </div>

        {consents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No consents yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Once the admin assigns you a doctor and they request access, consents will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {consents.map((consent) => {
              const isProcessing = processingId === consent.id;
              return (
                <div
                  key={consent.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        consent.status === "ACTIVE"
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {consent.status === "ACTIVE" ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <ShieldAlert className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {consent.purpose}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        To: {consent.granted_to}
                      </p>
                      <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <span>Scope: {consent.scope}</span>
                        <span>
                          Date: {new Date(consent.granted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 md:flex-none rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      View
                    </button>
                    {consent.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleRevoke(consent.id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Revoke
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(consent.id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-600 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
