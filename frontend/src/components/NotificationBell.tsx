"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Header bell. Polls /me/notifications every 60 seconds for the unread count.
 * Clicking the bell navigates to the full inbox at /patient/notifications.
 */
export default function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const r = await apiFetch<{ items: unknown[]; unreadCount: number }>(
          "/me/notifications?limit=1"
        );
        if (!cancelled) setCount(r.unreadCount);
      } catch {
        if (!cancelled) setCount(null);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const showDot = count !== null && count > 0;

  return (
    <Link
      href="/patient/notifications"
      className="relative inline-flex items-center gap-1 text-sm hover:text-blue-200"
      aria-label={showDot ? `${count} unread notifications` : "Notifications"}
    >
      <Bell className="w-4 h-4" />
      <span className="hidden sm:inline">Notifications</span>
      {showDot && (
        <span className="absolute -top-1 -right-1 sm:static sm:ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
          {count! > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}