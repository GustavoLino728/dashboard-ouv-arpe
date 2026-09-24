"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface DashboardContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDesktopOpen: boolean;
  setIsDesktopOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMobileOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsDesktopOpen((prev) => !prev);
    }
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        isDesktopOpen,
        setIsDesktopOpen,
        toggleSidebar,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
