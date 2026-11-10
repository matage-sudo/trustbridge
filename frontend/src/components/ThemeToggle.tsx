"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button onClick={toggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
      {dark ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
    </button>
  );
}