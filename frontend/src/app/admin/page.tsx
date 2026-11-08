"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
      <div className="text-center max-w-md">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-500 mb-6">
          Signed in as a hospital administrator for tenant demo-alpha.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin/audit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Audit Logs
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-slate-300 px-6 py-2 rounded-lg hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}