"use client";

import Link from "next/link";

export default function QuickActions() {
  const actions = [
    {
      href: "/doctors",
      title: "Find a Doctor",
      description: "Search by specialty, name, or clinic",
      icon: "stethoscope",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200/80",
      hoverBorderColor: "hover:border-teal-300/60",
      iconColor: "text-teal-800",
    },
    {
      href: "/appointments",
      title: "Book Appointment",
      description: "Select an available slot",
      icon: "more_time",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200/80",
      hoverBorderColor: "hover:border-sky-300/60",
      iconColor: "text-sky-800",
    },
    {
      href: "/medical-records",
      title: "Medical Records",
      description: "Lab results, imaging & history",
      icon: "lab_profile",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200/80",
      hoverBorderColor: "hover:border-indigo-300/60",
      iconColor: "text-indigo-800",
    },
    {
      href: "/prescriptions",
      title: "Prescriptions",
      description: "Active prescriptions & doctor orders",
      icon: "prescriptions",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200/80",
      hoverBorderColor: "hover:border-teal-300/60",
      iconColor: "text-emerald-800",
    },
  ];

  return (
    <section className="flex flex-col gap-space-xs">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-500 font-semibold px-1">
        Quick Clinical Actions
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-sm">
        {actions.map((act) => (
          <Link
            key={act.title}
            href={act.href}
            className={`bg-white group flex flex-col p-space-md rounded-2xl border border-slate-200/80 shadow-sm hover:translate-y-[-2px] ${act.hoverBorderColor} transition-all duration-200`}
          >
            <div
              className={`w-10 h-10 rounded-xl ${act.bgColor} border ${act.borderColor} flex items-center justify-center ${act.iconColor} mb-space-sm group-hover:scale-105 transition-transform shadow-sm`}
            >
              <span className="material-symbols-outlined text-[20px]">{act.icon}</span>
            </div>
            <span className="font-label-md text-label-md text-slate-900 group-hover:text-teal-700 transition-colors font-semibold">
              {act.title}
            </span>
            <span className="font-body-sm text-body-sm text-slate-500 mt-1 line-clamp-2">
              {act.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
