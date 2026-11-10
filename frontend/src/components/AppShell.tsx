"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ShieldAlert, LayoutDashboard, FileText, Users, Settings, LogOut, Activity, Menu, User } from "lucide-react";
import { useState } from "react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({
  children,
  portal,
}: {
  children: React.ReactNode;
  portal: "patient" | "staff" | "admin";
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const patientLinks = [
    { name: "Dashboard", href: "/patient", icon: LayoutDashboard },
    { name: "Records", href: "/patient/documents", icon: FileText },
    { name: "Representatives", href: "/patient/representatives", icon: Users },
    { name: "Security", href: "/patient/security", icon: Shield },
    { name: "My Profile", href: "/patient/profile", icon: User },
  ];

  const staffLinks = [
    { name: "Dashboard", href: "/staff", icon: LayoutDashboard },
    { name: "Emergency", href: "/staff/emergency", icon: ShieldAlert },
    { name: "Compliance", href: "/admin/compliance", icon: Settings },
  ];

  const links = portal === "staff" ? staffLinks : patientLinks;
  const brand = portal === "patient" ? "TrustBridge Patient" : portal === "staff" ? "TrustBridge Clinical" : "TrustBridge Admin";

  // Profile destination per portal
  const profileHref =
    portal === "patient" ? "/patient/profile" : portal === "staff" ? "/staff" : "/admin";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 flex flex-col`}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-700">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-lg tracking-tight">{brand}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Menu</p>
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/staff" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                }`}
              >
                <link.icon className={`w-5 h-5 ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-400"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Log out
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <button className="md:hidden p-2 -ml-2 text-gray-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
            <Link
              href={profileHref}
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
              aria-label="Go to profile"
            >
              JD
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}