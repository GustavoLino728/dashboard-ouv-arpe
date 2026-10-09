"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/components/DashboardProvider";
import {
  Check,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Sun,
} from "lucide-react";
import {
  Menu as HeadlessMenu,
  MenuButton,
  MenuItems,
  MenuItem,
} from "@headlessui/react";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toggleSidebar } = useDashboard();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="flex justify-between items-center flex-wrap gap-4 select-none">
      {/* Esquerda: sanduíche + título */}
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

      {/* Direita: atalho de tema + menu do usuário */}
      <div className="flex items-center gap-2 text-[13px] text-ink-soft">
        {/* Botão avulso de tema (atalho) */}
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          suppressHydrationWarning
          className="flex items-center justify-center p-2 rounded-lg text-ink-soft hover:bg-line/10 dark:hover:bg-line/5 hover:text-ink transition-colors cursor-pointer border-none bg-transparent"
        >
          {theme === "dark" ? (
            <Moon className="w-5 h-5" suppressHydrationWarning />
          ) : (
            <Sun className="w-5 h-5" suppressHydrationWarning />
          )}
        </button>

        {/* Menu suspenso do usuário */}
        <HeadlessMenu as="div" className="relative inline-block text-left">
          <MenuButton className="flex items-center gap-2.5 cursor-pointer rounded-lg p-1.5 hover:bg-line/10 dark:hover:bg-line/5 transition-colors focus:outline-none select-none border-none bg-transparent text-left">
            <div className="w-8 h-8 rounded-full bg-teal/15 text-teal flex items-center justify-center text-[13px] font-bold select-none uppercase">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[12.5px] font-semibold text-ink leading-tight">
                {user?.name ?? "Usuário"}
              </span>
              <span className="text-[11px] text-ink-soft leading-tight">
                {user?.email ?? ""}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
          </MenuButton>

          <MenuItems
            transition
            className="absolute right-0 z-55 mt-2 w-48 origin-top-right rounded-lg bg-panel border border-line p-1 shadow-lg focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            {/* Modo escuro */}
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={toggleTheme}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium text-left cursor-pointer border-none bg-transparent transition-colors ${
                    focus ? "bg-bg text-ink" : "text-ink-soft"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-teal" />
                    ) : (
                      <Sun className="w-4 h-4 text-ink-soft" />
                    )}
                    Modo escuro
                  </span>
                  {theme === "dark" && (
                    <Check className="w-4 h-4 text-teal" />
                  )}
                </button>
              )}
            </MenuItem>

            <div className="my-1 h-px bg-line/40" />

            {/* Sair */}
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-left cursor-pointer border-none bg-transparent transition-colors ${
                    focus
                      ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                      : "text-ink-soft"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </HeadlessMenu>
      </div>
    </header>
  );
}