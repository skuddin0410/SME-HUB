"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme";

/** Light/dark switch. The choice is remembered on this device; with no choice the site follows the device setting. */
export function ThemeToggle({ className = "", label = false }: { className?: string; label?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };

  const Icon = dark ? Sun : Moon;
  const text = dark ? "Light mode" : "Dark mode";
  return (
    <button type="button" onClick={flip} aria-label={`Switch to ${text.toLowerCase()}`} aria-pressed={dark} title={text} className={className}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label && <span>{text}</span>}
    </button>
  );
}
