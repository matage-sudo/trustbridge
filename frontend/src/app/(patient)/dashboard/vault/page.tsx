"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, ArrowLeft, Download, FileText, ChevronRight, Loader2, Inbox } from "lucide-react";
import { DLPWatermark } from "@/components/ui/DLPWatermark";

interface Record {
  id: string;
  title: string;
  type: string;
  doctor_name: string;
  status: string;
  created_at: string;
}

export default function DataVaultPage() {
  const router = useRouter();
  const supabase = createClient();
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("records")
        .select("*")
        .eq("patient_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setRecords(data);
      setIsLoading(false);
    };
    loadData();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative dark:bg-slate-950">
      <DLPWatermark />

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Patient Data Vault
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Everything the hospital holds about you ({records.length} records)
              </p>
            </div>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-brand-50 p-4 border border-brand-100 flex items-start gap-3 dark:bg-brand-900/20 dark:border-brand-900/50">
          <ShieldCheck className="h-5 w-5 text-brand-600 mt-0.5 shrink-0 dark:text-brand-400" />
          <p className="text-sm text-brand-900 leading-relaxed dark:text-brand-100">
            <strong>Privacy Notice:</strong> No record is released without consent. Any access is logged in a tamper-evident audit trail.
          </p>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Inbox className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No records yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              When a doctor uploads your lab results, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[600px] text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-medium">Date</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-medium">Type</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-medium">Title</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-medium">Doctor</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-medium">Status</th>
                  <th className="px-4 md:px-6 py-3 md:py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <FileText className="h-3 w-3" /> {record.type}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 font-medium text-slate-900 dark:text-white">
                      {record.title}
                    </td>
                    <td className="px-4 md:px-6 py-3">{record.doctor_name}</td>
                    <td className="px-4 md:px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          record.status === "Final"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right">
                      <button className="text-brand-600 dark:text-brand-400 font-medium text-sm flex items-center justify-end gap-1 w-full">
                        View <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
