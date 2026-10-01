"use client";

import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";

export default function DashboardHeader() {
  const user = getAuthenticatedUser();

  return (
    <section className="bg-white rounded-2xl p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-slate-200/80 shadow-sm relative overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg text-slate-900 tracking-tight">
            Good morning, {user.firstName}
          </h1>
          <span className="inline-block text-xl">✨</span>
        </div>
        <p className="font-body-md text-body-md text-slate-600 mt-1">
          Here&apos;s what&apos;s happening with your healthcare today.
        </p>
      </div>
      <div className="flex items-center gap-space-sm flex-wrap">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-space-xs px-space-md py-2.5 text-slate-700 bg-white hover:bg-slate-50 font-label-md text-label-md rounded-xl border border-slate-200/80 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px] text-teal-700">
            calendar_today
          </span>
          <span>View Appointments</span>
        </Link>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-space-xs px-space-md py-2.5 text-white bg-teal-600 hover:bg-teal-700 font-label-md text-label-md rounded-xl shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_search</span>
          <span>Find a Doctor</span>
        </Link>
      </div>
    </section>
  );
}
