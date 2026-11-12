"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, ShieldAlert, LayoutDashboard, FileText, Users, Settings, LogOut, Activity, Menu, User, Calendar, ClipboardCheck, BrainCircuit, Bell, LifeBuoy, HelpCircle, HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import ActingForBanner from "./ActingForBanner";
import { createClient } from "@/lib/supabase";
import { clearApiCache, getApiContext } from "@/lib/api";

export type Portal = "patient" | "staff" | "admin";

type NavLink = { name: string; href: string; icon: any };

const LINKS: Record<Portal, NavLink[]> = {
  patient: [
    { name: "Dashboard", href: "/patient", icon: LayoutDashboard },
    { name: "Medical Records", href: "/patient/records", icon: HeartPulse },
    { name: "Documents", href: "/patient/documents", icon: FileText },
    { name: "Access History", href: "/patient/access-history", icon: Activity },
    { name: "Representatives", href: "/patient/representatives", icon: Users },
    { name: "Announcements", href: "/patient/announcements", icon: Bell },
    { name: "Support", href: "/patient/support", icon: LifeBuoy },
    { name: "Help", href: "/patient/help", icon: HelpCircle },
    { name: "Privacy", href: "/patient/privacy", icon: Shield },
    { name: "Security", href: "/patient/security", icon: ShieldAlert },
    { name: "My Profile", href: "/patient/profile", icon: User },
  ],
  staff: [
    { name: "Dashboard", href: "/staff", icon: LayoutDashboard },
    { name: "My Schedule", href: "/staff/appointments", icon: Calendar },
    { name: "Request Access", href: "/staff/request-access", icon: ClipboardCheck },
    { name: "Emergency", href: "/staff/emergency", icon: ShieldAlert },
    { name: "AI Risk", href: "/staff/ai-risk", icon: BrainCircuit },
  ],
  admin: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Staff", href: "/admin/staff", icon: Users },
    { name: "Patients", href: "/admin/patients", icon: User },
    { name: "Appointments", href: "/admin/appointments", icon: Calendar },
    { name: "Consents", href: "/admin/consents", icon: Shield },
    { name: "Access Requests", href: "/admin/access-requests", icon: ClipboardCheck },
    { name: "Representatives", href: "/admin/representatives", icon: Users },
    { name: "Compliance", href: "/admin/compliance", icon: Settings },
    { name: "Audit Log", href: "/admin/audit", icon: Activity },
  ],
};

const BRAND: Record<Portal, string> = {
  patient: "TrustBridge Patient",
  staff: "TrustBridge Clinical",
  admin: "TrustBridge Admin",
};

function isAllowed(portal: Portal, role: string): boolean {
  if (portal === "patient") return role === "PATIENT";
  if (portal === "staff") return role === "STAFF" || role === "HOSPITAL_ADMIN";
  return role !== "PATIENT" && role !== "STAFF";
}

export default function AppShell({ children, portal }: { children: React.ReactNode; portal: Portal }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getApiContext()
      .then((ctx) => {
        if (!active) return;
        if (!isAllowed(portal, ctx.role)) {
          const target = ctx.role === "PATIENT" ? "/patient" : ctx.role === "STAFF" ? "/staff" : "/admin";
          router.replace(target);
          return;
        }
        setRole(ctx.role);
      })
      .catch((err) => {
        if (!active) return;
        if (err.message === "Session expired" || err.message === "Not authenticated") return;
        setError(err.message);
      });
    return () => { active = false; };
  }, [portal, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    clearApiCache();
    router.replace("/login");
    router.refresh();
  };

  if (error) {
    if (error.includes("403") || error.includes("Forbidden") || error.includes("no_membership")) {
      router.replace("/unauthorized");
      return null;
    }
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">System Error</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-blue-600 font-medium">Try again</button>
      </div>
    );
  }

  if (!role) return <div className="h-screen flex items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-900">Verifying secure access...</div>;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transform transition-transform md:relative md:translate-x-0 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800">
          <Activity className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg dark:text-white">{BRAND[portal]}</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {LINKS[portal].map((link) => {
            const active = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="w-5 h-5" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
          <button className="md:hidden p-2 -ml-2 text-slate-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold dark:bg-blue-900/30 dark:text-blue-400">
              {role.replace(/_/g, " ")}
            </span>
            {portal === "patient" && <NotificationBell />}
            <ThemeToggle />
          </div>
        </header>
        {portal === "patient" && <ActingForBanner />}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}