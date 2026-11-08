import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: "--font-montserrat", 
  display: "swap" 
});

export const metadata: Metadata = {
  title: { 
    default: "TrustBridge — Secure Health Data Governance", 
    template: "%s | TrustBridge" 
  },
  description: "TrustBridge is a zero-trust data governance and access management platform for Ruiru Level 4 Hospital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
