import PatientLayout from "@/components/patient/PatientLayout";
import Link from "next/link";

export default function AppointmentsPage() {
  return (
    <PatientLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-space-md">
        <div className="bg-white rounded-2xl p-space-lg border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-headline-lg text-slate-900 font-bold">
                Appointments
              </h1>
              <p className="font-body-md text-slate-600">
                View and manage your scheduled healthcare visits.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-teal-600 text-white rounded-xl font-label-md text-label-md hover:bg-teal-700 transition-all shadow-sm"
            >
              Back to Dashboard
            </Link>
          </div>
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-500">
            <span className="material-symbols-outlined text-[48px] text-teal-600 mb-2">
              calendar_today
            </span>
            <p className="font-headline-sm text-slate-800 font-semibold mb-1">
              Scheduled Appointments
            </p>
            <p className="font-body-sm text-slate-500">
              Appointments management page ready for integration.
            </p>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
