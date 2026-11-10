"use client";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

export default function StaffAppointmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/staff" className="text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Schedule</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Appointments module</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">The full appointment calendar is part of the next development phase. Staff can request access via the Patient Directory on the dashboard.</p>
          <Link href="/staff" className="mt-6 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to dashboard</Link>
        </div>
      </main>
    </div>
  );
}