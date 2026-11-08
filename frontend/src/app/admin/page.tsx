"use client";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-500 mb-6">This is a placeholder for the SOC dashboard.</p>
        <Link href="/admin/audit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          View Audit Logs
        </Link>
      </div>
    </div>
  );
}