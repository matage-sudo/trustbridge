import Link from "next/link";
import { HashChainHero } from "@/components/HashChainHero";
import { Shield, EyeOff, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand-400 opacity-20 blur-[100px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 py-20 lg:flex-row lg:py-32">
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/50 px-3 py-1 text-xs font-medium text-brand-700 backdrop-blur-sm dark:border-brand-800 dark:bg-slate-900/50 dark:text-brand-400">
            <span className="h-1.5 w-1.5 rounded-full bg-trust-green" />
            Ruiru Level 4 Hospital · DPA 2019 Compliant
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Every record. <br className="hidden sm:block" />
            <span className="text-brand-600 dark:text-brand-400">Every consent.</span> <br className="hidden sm:block" />
            Audited.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
            TrustBridge is a zero-trust data governance platform. We ensure no medical record is released without consent, and every single access is cryptographically logged.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-8 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 hover:-translate-y-0.5">
              Sign in to Portal
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800 pt-8 text-center lg:text-left">
            <div>
              <Shield className="mx-auto lg:mx-0 h-5 w-5 text-brand-600 dark:text-brand-400 mb-2" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Zero Trust</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Never trust, always verify</p>
            </div>
            <div>
              <EyeOff className="mx-auto lg:mx-0 h-5 w-5 text-brand-600 dark:text-brand-400 mb-2" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Privacy First</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Granular consent engine</p>
            </div>
            <div>
              <Activity className="mx-auto lg:mx-0 h-5 w-5 text-brand-600 dark:text-brand-400 mb-2" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">AI Monitored</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time risk alerts</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <HashChainHero />
        </div>
      </div>
    </main>
  );
}
