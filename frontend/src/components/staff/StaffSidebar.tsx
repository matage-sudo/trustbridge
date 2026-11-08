"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Home, Stethoscope, Pill, Calendar, DollarSign, LogOut, Activity } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function StaffSidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const links = [
    { href: "/staff-dashboard", label: "Dashboard", icon: Home },
    { href: "/staff-dashboard/clinical", label: "Clinical EMR", icon: Stethoscope },
    { href: "/staff-dashboard/pharmacy", label: "Pharmacy", icon: Pill },
    { href: "/staff-dashboard/appointments", label: "Appointments", icon: Calendar },
    { href: "/staff-dashboard/billing", label: "Billing", icon: DollarSign },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <Link href="/staff-dashboard" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-brand-600" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">TrustBridge</span>
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Staff Portal</p>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/50">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{userRole}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
