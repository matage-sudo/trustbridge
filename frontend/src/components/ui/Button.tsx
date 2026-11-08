import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500",
      outline: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-500",
      ghost: "hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6 text-sm font-semibold",
      lg: "h-14 px-8 text-base font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
