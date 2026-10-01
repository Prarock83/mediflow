"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PatientSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PatientSidebar({ isOpen = false, onClose }: PatientSidebarProps) {
  const pathname = usePathname();

  const mainNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
    { href: "/doctors", label: "Find Doctors", icon: "person_search" },
    { href: "/appointments", label: "Appointments", icon: "calendar_today" },
    { href: "/medical-records", label: "Medical Records", icon: "folder_shared" },
    { href: "/prescriptions", label: "Prescriptions", icon: "prescriptions" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
  ];

  const bottomNavItems = [
    { href: "/profile", label: "Profile", icon: "account_circle" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white/65 backdrop-blur-xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.03)] z-50 flex flex-col justify-between pt-space-lg pb-space-lg transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <div className="px-space-lg mb-space-xl flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-space-sm">
              <img
                alt="MediFlow Wordmark Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1XD_D4ceJ0_-Hvl5YUaJeO3Oj8CM7DPw3AakcTfMIja1uF5Lv7PHeXK9-jJHSzwnQVwoPqyrg8ds78BzltVoS6NbAUYCRQj5D8ifdjKXJ_7KJOCrEeFEM3XvqeqHnjXnlh7NMsOw_A2nYhlJ_jjMJ8Xg-tta5Ax0Yxb95Zmcx-_LOh7hZgzuruWDUVt5mzIZJ7eNTO3SKaXp7MoN3bAEzRMdKHACCFQGco9p-BConPPI-spGddDN8ppYUM"
              />
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* Main Navigation Group */}
          <nav className="flex flex-col gap-1.5 px-space-md">
            {mainNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-space-md px-space-md py-space-sm transition-all duration-200 rounded-xl ${
                    isActive
                      ? "bg-teal-600 text-white font-label-md text-label-md shadow-md shadow-teal-600/25 border border-teal-400/30 backdrop-blur-md"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-white/80"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation Group */}
        <div className="flex flex-col gap-1 px-space-md pt-space-md border-t border-white/60">
          <nav className="flex flex-col gap-1.5">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-space-md px-space-md py-space-sm transition-all duration-150 rounded-xl ${
                    isActive
                      ? "bg-teal-600 text-white font-label-md text-label-md shadow-md shadow-teal-600/25 border border-teal-400/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-white/80"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/dashboard"
              className="flex items-center gap-space-md px-space-md py-space-sm rounded-xl text-rose-600 hover:bg-rose-50/80 transition-colors border border-transparent hover:border-rose-100"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-label-md text-label-md">Logout</span>
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}
