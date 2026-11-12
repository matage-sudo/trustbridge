"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export default function MfaPrompt() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("mfa_prompt_dismissed") === "true") {
      return;
    }

    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      // If they have 0 TOTP factors, show the prompt
      if (data && data.totp.length === 0) {
        setShow(true);
      }
    });
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 dark:border-slate-800">
        <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold dark:text-white mb-2">Secure Your Account</h2>
        <p className="text-sm text-slate-500 mb-6">
          Take a moment to enable Two-Factor Authentication. This adds an essential extra layer of security to protect your data.
        </p>
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={() => router.push("/mfa-setup")}
          >
            Set Up 2FA Now
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => {
              sessionStorage.setItem("mfa_prompt_dismissed", "true");
              setShow(false);
            }}
          >
            Remind Me Later
          </Button>
        </div>
      </div>
    </div>
  );
}