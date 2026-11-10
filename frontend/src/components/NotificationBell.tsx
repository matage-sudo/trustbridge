"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const r = await apiFetch<{ items: unknown[]; unreadCount: number }>(
          "/me/notifications?limit=1"
        );
        if (!cancelled) {
          const n = typeof r?.unreadCount === "number" ? r.unreadCount : 0;
          setCount(n);
        }
      } catch {
        if (!cancelled) setCount(null);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  const showDot = count !== null && count > 0;

  return (
    <Link
      href="/patient/notifications"
      className="relative flex items-center gap-2 text-sm font-medium hover:text-blue-200"
      aria-label={showDot ? `${count} unread notifications` : "Notifications"}
    >
      <Bell className="w-4 h-4" />
      <span>Notifications</span>
      {showDot && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
          {count! > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}