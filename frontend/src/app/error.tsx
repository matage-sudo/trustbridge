"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service securely
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-6 text-sm">
          We encountered an unexpected error. Our security team has been notified. Please try again or return to the dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/"><Button variant="outline">Return Home</Button></Link>
        </div>
      </div>
    </div>
  );
}