"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DLPWatermark() {
  const [email, setEmail] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    // Get the real logged-in user
    const supabase = createClient();
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "guest@trustbridge.ke");
    };
    getUser();

    // Update timestamp every second
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("en-KE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTimestamp(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden opacity-[0.04] select-none">
      <div className="absolute inset-0 flex flex-wrap gap-16 -rotate-12 scale-125">
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} className="text-xl font-bold whitespace-nowrap text-slate-900 dark:text-white">
            CONFIDENTIAL · {email || "loading..."} · {timestamp}
          </span>
        ))}
      </div>
    </div>
  );
}
