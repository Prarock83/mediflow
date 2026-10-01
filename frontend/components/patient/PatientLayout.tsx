"use client";

import { useState } from "react";
import PatientSidebar from "./PatientSidebar";
import PatientTopbar from "./PatientTopbar";

interface PatientLayoutProps {
  children: React.ReactNode;
  unreadNotificationsCount?: number;
}

export default function PatientLayout({
  children,
  unreadNotificationsCount = 2,
}: PatientLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="bg-slate-50 font-body-md text-body-md text-on-surface antialiased relative min-h-screen selection:bg-teal-100 selection:text-teal-900">
      {/* Sidebar */}
      <PatientSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="lg:pl-64 flex flex-col min-h-screen relative z-10">
        {/* Topbar */}
        <PatientTopbar
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Page Content Container */}
        <main className="w-full pt-16 flex-1 px-space-lg py-space-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
