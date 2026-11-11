"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle, AlertTriangle } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

const CONTROLS = [
  { name: "Access Control (Zero Trust)", status: "COMPLIANT", desc: "Role-based access is strictly enforced at the API layer." },
  { name: "Audit Logging", status: "COMPLIANT", desc: "All sensitive actions are immutably logged." },
  { name: "Data Encryption", status: "COMPLIANT", desc: "Data is encrypted at rest and in transit." },
  { name: "Consent Management", status: "COMPLIANT", desc: "Patient consent is required for non-emergency access." },
  { name: "Breach Notification", status: "PENDING", desc: "Automated breach alerts require configuration." },
];

export default function AdminCompliancePage() {
  return (
    <AppShell portal="admin">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-blue-600" /> Compliance Centre</h1><p className="text-sm text-slate-500">Data Protection Impact Assessment (DPIA) Status</p></div>
        </div>

        <div className="grid gap-4 mb-6">
          {CONTROLS.map((c, i) => (
            <Card key={i} className="p-5 flex items-start gap-4">
              <div className={`mt-0.5 p-2 rounded-full ${c.status === "COMPLIANT" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                {c.status === "COMPLIANT" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold dark:text-white flex items-center gap-2">
                  {c.name}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${c.status === "COMPLIANT" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {c.status}
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}