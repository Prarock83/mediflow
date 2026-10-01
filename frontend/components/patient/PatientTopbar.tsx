"use client";

import { useState } from "react";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";

interface PatientTopbarProps {
  onToggleMobileSidebar?: () => void;
  unreadNotificationsCount?: number;
}

export default function PatientTopbar({
  onToggleMobileSidebar,
  unreadNotificationsCount = 2,
}: PatientTopbarProps) {
  const user = getAuthenticatedUser();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] z-40 flex items-center justify-between px-space-lg">
      <div className="flex items-center gap-space-sm">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white/60 transition-colors mr-1"
          aria-label="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(13,148,136,0.6)] animate-pulse" />
        <span className="font-label-sm text-label-sm text-slate-600 tracking-wider font-semibold uppercase">
          Patient Portal
        </span>
      </div>

      <div className="flex items-center gap-space-md">
        {/* Search input */}
        <div className="relative hidden sm:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 md:w-64 pl-9 pr-12 py-1.5 bg-white/70 backdrop-blur-md text-on-surface placeholder:text-slate-400 font-body-sm text-body-sm rounded-xl border border-white/90 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white transition-all"
            placeholder="Search doctors, records..."
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-label-sm bg-white/90 border border-slate-200/70 text-slate-500 rounded-md shadow-sm">
            ⌘K
          </kbd>
        </div>

        {/* Notifications Icon Link */}
        <Link
          href="/notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl bg-white/60 hover:bg-white/90 border border-white/90 shadow-sm backdrop-blur-sm transition-all"
          aria-label="View Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-teal-600 text-white font-label-sm text-[10px] rounded-full shadow-sm ring-2 ring-white">
              {unreadNotificationsCount}
            </span>
          )}
        </Link>

        {/* Profile Info Area */}
        <Link
          href="/profile"
          className="flex items-center gap-space-sm pl-2 cursor-pointer py-1 px-2 rounded-xl hover:bg-white/60 border border-transparent hover:border-white/80 transition-all"
        >
          <img
            alt={`${user.firstName} ${user.lastName}`}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-teal-500/30 shadow-sm"
            src={
              user.avatarUrl ||
              "https://lh3.googleusercontent.com/aida/AEtjO1UAtIlDnycYScxbzSZCB7fWFrxhpOReucoJ_NUX7optBSoG1Qqt51kE4T3vGdADMzFPrkzjJggVPYx87t4youIJh4lThRoQw3a3a6FUUQqiLEpz5JG9ANHnpS6tKOzct_DfNoralMdibuGknXoM0OL3Gxj56FdsxJPPINg3QsBvDFhxJ02GMv_b_FL36GyDBDHYOOQpkO_ZZ4M3_Nk869A3lgR6ARaHtogxidmbqKJ3aFP1MR4MKw29eyjt"
            }
          />
          <div className="hidden md:flex flex-col text-left">
            <span className="font-label-md text-label-md text-slate-900 font-semibold leading-tight">
              {user.firstName} {user.lastName}
            </span>
            <span className="font-body-sm text-body-sm text-slate-500 leading-tight">
              Patient #{user.patientIdNumber || "MV-8921"}
            </span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[18px]">
            expand_more
          </span>
        </Link>
      </div>
    </header>
  );
}
