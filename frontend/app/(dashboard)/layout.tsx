"use client";

import React, { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DashboardProvider } from "@/components/DashboardProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardProvider>
        <div className="flex h-screen bg-bg text-ink transition-colors duration-200 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 h-full min-w-0">
            <div className="shrink-0 pt-[22px] px-[30px] pb-[18px] max-lg:px-[20px] max-md:px-4">
              <Topbar />
            </div>
            <main className="flex-1 overflow-y-auto px-[30px] pb-[60px] max-lg:px-[20px] max-md:px-4 max-md:pb-12">
              {children}
            </main>
          </div>
        </div>
      </DashboardProvider>
    </Suspense>
  );
}
