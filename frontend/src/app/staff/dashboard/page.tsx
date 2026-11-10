"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ShieldAlert, Users, Bell, ArrowLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type DashboardData = {
  stats: { pendingEmergencyReviews: number; pendingRepresentativeRequests: number; role: string };
  announcements: { id: string; title: string; content: string; createdAt: string }[];
};

export default function StaffDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/staff/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-red-600">Failed to load dashboard.</div>;

  const isAdmin = ["HOSPITAL_ADMIN", "PRIVACY_OFFICER"].includes(data.stats.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/staff" className="hover:text-blue-200"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold">Staff Dashboard</h1>
          <span className="ml-auto text-sm bg-blue-800 px-2 py-1 rounded">{data.stats.role}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold">Emergency Reviews</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.stats.pendingEmergencyReviews}</p>
            <Link href="/staff/emergency" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Review grants &rarr;</Link>
          </div>

          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold">Representative Requests</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.stats.pendingRepresentativeRequests}</p>
              <Link href="/admin/representatives" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Verify &rarr;</Link>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">Compliance</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">Data Protection Act (2019)</p>
            <Link href="/admin/compliance" className="text-sm text-blue-600 hover:underline">View assessment &rarr;</Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Announcements</h2>
          {data.announcements.length === 0 ? (
            <p className="text-sm text-gray-500">No announcements.</p>
          ) : (
            <ul className="space-y-3">
              {data.announcements.map((a) => (
                <li key={a.id} className="border-b border-gray-100 pb-2">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{a.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}