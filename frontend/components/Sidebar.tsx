"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/components/DashboardProvider";
import { BarChart3, Upload, X } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Planilhas", href: "/planilhas", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileOpen, setIsMobileOpen, isDesktopOpen } = useDashboard();

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/45 z-40 lg:hidden transition-opacity duration-300 cursor-pointer"
        />
      )}

      <aside
        className={`bg-sidebar text-[#C3D0DC] py-5 flex flex-col shrink-0 border-r border-line/10 h-full overflow-y-auto select-none transition-all duration-300 ease-in-out
          lg:relative lg:z-30
          ${isDesktopOpen ? "lg:w-[220px] lg:opacity-100 lg:pointer-events-auto" : "lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-r-0 lg:py-0"}
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[240px] max-lg:shadow-2xl
          ${isMobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
        `}
      >
        <div className="px-5 pb-6 flex items-center justify-between max-lg:pb-4">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-arpe-negativo.png"
              alt="ARPE Painel"
              className="object-contain"
              style={{ width: "130px", height: "auto" }}
            />
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden p-1.5 rounded-lg text-[#8A9DB0] hover:text-white hover:bg-white/10 transition-colors focus:outline-none border-none bg-transparent cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col flex-1 gap-1">
          <ul className="list-none m-0 p-0 flex flex-col w-full gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className="w-full">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 py-[9px] px-5 text-[13.5px] no-underline transition-all duration-150 rounded-lg mx-2 ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-[#8A9DB0] hover:text-[#C3D0DC]"
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${isActive ? "text-teal" : ""}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
