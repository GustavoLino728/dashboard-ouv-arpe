"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useDashboard } from "@/components/DashboardProvider";
import { Menu as MenuIcon, Moon, Sun } from "lucide-react";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useDashboard();

  return (
    <header className="flex justify-between items-center flex-wrap gap-4 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Abrir menu"
          className="p-1.5 rounded-lg text-ink hover:text-teal hover:bg-line/10 dark:hover:bg-line/5 transition-colors focus:outline-none border-none bg-transparent cursor-pointer flex items-center justify-center"
        >
          <MenuIcon className="w-5.5 h-5.5" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-display font-bold text-[20px] text-ink leading-tight">
            Dashboard da Ouvidoria
          </h1>
          <p className="text-[12.5px] text-ink-soft mt-0.5">
            ARPE - Manifestacoes OUVE PE
          </p>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        aria-label="Alternar tema"
        className="flex items-center justify-center p-2 rounded-lg text-ink-soft hover:bg-line/10 dark:hover:bg-line/5 hover:text-ink transition-colors cursor-pointer border-none bg-transparent"
      >
        {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>
    </header>
  );
}
