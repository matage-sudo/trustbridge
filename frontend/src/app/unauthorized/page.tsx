import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6 text-sm">
          You do not have the required permissions to view this page. If you believe this is an error, please contact your administrator.
        </p>
        <Link href="/"><Button>Return Home</Button></Link>
      </div>
    </div>
  );
}