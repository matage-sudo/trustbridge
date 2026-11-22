"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Users, FileText, ArrowLeftRight, AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function AdminDoctorProfile() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<any>(`/staff/${id}/profile`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell portal="admin">
        <div className="max-w-5xl mx-auto py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
        </div>
      </AppShell>
    );
  }
  if (error) {
    return (
      <AppShell portal="admin">
        <div className="max-w-5xl mx-auto p-6">
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        </div>
      </AppShell>
    );
  }
  if (!data) return null;

  const { doctor, patientsUnderCare, notesAuthored, transfersOut, transfersIn } = data;
  const transferCount = (transfersOut?.length || 0) + (transfersIn?.length || 0);

  return (
    <AppShell portal="admin">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              {doctor.user?.displayName || doctor.user?.email?.split("@")[0] || "Doctor"}
            </h1>
            <p className="text-sm text-slate-500">{doctor.user?.email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${doctor.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {doctor.active ? "ACTIVE" : "INACTIVE"}
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">{doctor.role}</span>
            {doctor.department && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {doctor.department.name}
              </span>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold dark:text-white">{patientsUnderCare?.length || 0}</p>
                <p className="text-xs text-slate-500">Patients under care</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold dark:text-white">{notesAuthored?.length || 0}</p>
                <p className="text-xs text-slate-500">Notes authored (recent)</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold dark:text-white">{transferCount}</p>
                <p className="text-xs text-slate-500">Transfers (in + out)</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Patients under care */}
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold flex items-center gap-2 dark:text-white">
              <Users className="w-5 h-5 text-blue-600" /> Patients under care
            </h2>
          </div>
          {patientsUnderCare?.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No patients currently assigned.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {patientsUnderCare.map((p: any) => (
                <div key={p.id} className="p-4 flex justify-between items-center">
                  <div>
                    <Link href={`/staff/patients/${p.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                      {p.firstName} {p.lastName}
                    </Link>
                    <p className="text-xs text-slate-500 font-mono">MRN: {p.hospitalNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notes authored */}
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold flex items-center gap-2 dark:text-white">
              <FileText className="w-5 h-5 text-amber-600" /> Recent clinical notes authored
            </h2>
          </div>
          {notesAuthored?.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No notes authored yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notesAuthored.map((n: any) => (
                <div key={n.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${n.type === "MEDICATION" ? "bg-amber-100 text-amber-800" : n.type === "DIAGNOSIS" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                      {n.type}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="font-semibold text-sm dark:text-white">{n.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{n.content}</p>
                  {n.patient && (
                    <p className="text-xs text-slate-500 mt-2">
                      Patient: <Link href={`/staff/patients/${n.patient.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{n.patient.name}</Link>{" "}
                      <span className="font-mono">({n.patient.hospitalNumber})</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Transfers */}
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold flex items-center gap-2 dark:text-white">
              <ArrowLeftRight className="w-5 h-5 text-purple-600" /> Transfer history
            </h2>
          </div>
          {transferCount === 0 ? (
            <p className="p-6 text-sm text-slate-500">No transfers recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transfersOut.map((t: any) => (
                <div key={`out-${t.id}`} className="p-4 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">OUT</span>
                    <p className="text-sm dark:text-white mt-1">
                      {t.patient ? (
                        <>
                          <Link href={`/staff/patients/${t.patient.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{t.patient.name}</Link>
                          {" "}<span className="text-xs text-slate-500 font-mono">({t.patient.hospitalNumber})</span>
                        </>
                      ) : (
                        <span className="text-slate-500">Patient unavailable</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {transfersIn.map((t: any) => (
                <div key={`in-${t.id}`} className="p-4 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">IN</span>
                    <p className="text-sm dark:text-white mt-1">
                      {t.patient ? (
                        <>
                          <Link href={`/staff/patients/${t.patient.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{t.patient.name}</Link>
                          {" "}<span className="text-xs text-slate-500 font-mono">({t.patient.hospitalNumber})</span>
                        </>
                      ) : (
                        <span className="text-slate-500">Patient unavailable</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}