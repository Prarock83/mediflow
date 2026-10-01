"use client";

import Link from "next/link";

export interface ActivityItem {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    title: "Appointment Confirmed",
    timestamp: "Yesterday, 4:15 PM",
    description: "Follow-up cardiology visit with Dr. Sarah Wilson.",
    icon: "event_available",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200/70",
    textColor: "text-teal-800",
  },
  {
    id: "act-2",
    title: "Prescription Created",
    timestamp: "2 hours ago",
    description: "Dr. Sarah Wilson issued new prescription for clinical follow-up.",
    icon: "prescriptions",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200/70",
    textColor: "text-emerald-800",
  },
  {
    id: "act-3",
    title: "Medical Record Updated",
    timestamp: "3 days ago",
    description: "Diagnostic lab results (Comprehensive Metabolic Panel) uploaded.",
    icon: "biotech",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200/70",
    textColor: "text-indigo-800",
  },
  {
    id: "act-4",
    title: "Consultation Notes Added",
    timestamp: "5 days ago",
    description: "Routine cardiovascular evaluation summary published.",
    icon: "clinical_notes",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200/70",
    textColor: "text-sky-800",
  },
  {
    id: "act-5",
    title: "Document Added",
    timestamp: "1 week ago",
    description: "Patient intake & insurance authorization document archived.",
    icon: "description",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200/70",
    textColor: "text-slate-700",
  },
];

export default function RecentActivity({
  activities = DEFAULT_ACTIVITIES,
}: RecentActivityProps) {
  return (
    <section className="bg-white rounded-2xl p-space-lg flex flex-col gap-space-md border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between pb-space-xs border-b border-slate-100">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-teal-700 text-[20px]">
            history
          </span>
          <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold">
            Recent Medical Activity
          </h3>
        </div>
        <Link
          href="/medical-records"
          className="font-label-sm text-label-sm text-teal-700 hover:text-teal-800 flex items-center gap-1 font-semibold"
        >
          <span>View Full Records</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        </Link>
      </div>

      <div className="flex flex-col gap-space-sm pt-space-xs">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-space-md p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-xl ${item.bgColor} border ${item.borderColor} flex items-center justify-center ${item.textColor} flex-shrink-0 mt-0.5 shadow-sm`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {item.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-space-sm">
                <span className="font-label-md text-label-md text-slate-900 font-semibold truncate">
                  {item.title}
                </span>
                <span className="font-label-sm text-label-sm text-slate-400 flex-shrink-0">
                  {item.timestamp}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-slate-600 mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
