"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function AdminRepresentativesPage() {
  return (
    <AppShell portal="admin">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold dark:text-white">Representatives Directory</h1>
        </div>
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold dark:text-white mb-2">Manage Representatives</h2>
          <p className="text-sm text-slate-500">Review and verify patient-designated representatives.</p>
        </Card>
      </div>
    </AppShell>
  );
}