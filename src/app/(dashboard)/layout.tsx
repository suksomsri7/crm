"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/layout/sidebar").then(m => ({ default: m.Sidebar })), { ssr: false });
const Topbar = dynamic(() => import("@/components/layout/topbar").then(m => ({ default: m.Topbar })), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
