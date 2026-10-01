"use client";

interface DashboardStatsData {
  upcomingAppointmentsCount: number;
  nextAppointmentText?: string;
  medicalRecordsCount: number;
  recordsUpdatedText?: string;
  activePrescriptionsCount: number;
  unreadNotificationsCount: number;
}

interface DashboardStatsProps {
  stats?: DashboardStatsData;
  isLoading?: boolean;
}

export default function DashboardStats({
  stats = {
    upcomingAppointmentsCount: 1,
    nextAppointmentText: "Next on Thu, Oct 8",
    medicalRecordsCount: 14,
    recordsUpdatedText: "2 updated this month",
    activePrescriptionsCount: 3,
    unreadNotificationsCount: 2,
  },
  isLoading = false,
}: DashboardStatsProps) {
  if (isLoading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-space-md flex items-start justify-between border border-slate-200/80 shadow-sm animate-pulse"
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="h-7 bg-slate-200 rounded w-12" />
              <div className="h-3 bg-slate-200 rounded w-32" />
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex-shrink-0" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
      {/* 1. Upcoming Appointments */}
      <div className="bg-white rounded-2xl p-space-md flex items-start justify-between border border-slate-200/80 shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-slate-500 uppercase tracking-wider font-semibold">
            Upcoming Appointments
          </span>
          <span className="font-data-metric text-data-metric text-slate-900 mt-1">
            {stats.upcomingAppointmentsCount}
          </span>
          <span className="font-body-sm text-body-sm text-teal-700 font-medium mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
            {stats.nextAppointmentText || "No upcoming appointment"}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 shadow-sm">
          <span className="material-symbols-outlined text-[22px]">event_upcoming</span>
        </div>
      </div>

      {/* 2. Medical Records */}
      <div className="bg-white rounded-2xl p-space-md flex items-start justify-between border border-slate-200/80 shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-slate-500 uppercase tracking-wider font-semibold">
            Medical Records
          </span>
          <span className="font-data-metric text-data-metric text-slate-900 mt-1">
            {stats.medicalRecordsCount}
          </span>
          <span className="font-body-sm text-body-sm text-slate-600 mt-0.5">
            {stats.recordsUpdatedText || "Records updated in portal"}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-sm">
          <span className="material-symbols-outlined text-[22px]">folder_shared</span>
        </div>
      </div>

      {/* 3. Active Prescriptions */}
      <div className="bg-white rounded-2xl p-space-md flex items-start justify-between border border-slate-200/80 shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-slate-500 uppercase tracking-wider font-semibold">
            Active Prescriptions
          </span>
          <span className="font-data-metric text-data-metric text-slate-900 mt-1">
            {stats.activePrescriptionsCount}
          </span>
          <span className="font-body-sm text-body-sm text-sky-700 mt-0.5 font-medium">
            Available in portal
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-700 shadow-sm">
          <span className="material-symbols-outlined text-[22px]">prescriptions</span>
        </div>
      </div>

      {/* 4. Notifications */}
      <div className="bg-white rounded-2xl p-space-md flex items-start justify-between border border-slate-200/80 shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-slate-500 uppercase tracking-wider font-semibold">
            Notifications
          </span>
          <span className="font-data-metric text-data-metric text-slate-900 mt-1">
            {stats.unreadNotificationsCount}
          </span>
          <span className="font-body-sm text-body-sm text-slate-600 mt-0.5">
            Unread updates
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700 shadow-sm">
          <span className="material-symbols-outlined text-[22px]">notifications_active</span>
        </div>
      </div>
    </section>
  );
}
