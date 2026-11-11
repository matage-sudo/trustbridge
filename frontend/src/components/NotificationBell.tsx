"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await apiFetch<{ items: any[] }>("/me/notifications?limit=5");
        const unread = res.items.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/patient/notifications" className="relative p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      )}
    </Link>
  );
}
