"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { DoctorProfile, fetchDoctorById } from "@/lib/api";

function formatUtcTimeDisplay(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${strHours}:${minutes} ${ampm}`;
}

function formatFullDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function AppointmentDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date") || "";
  const startTime = searchParams.get("startTime") || "";
  const endTime = searchParams.get("endTime") || "";

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState<boolean>(!!doctorId);
  const [reason, setReason] = useState<string>("");

  const handleProceedToConfirmation = () => {
    if (!doctorId || !date || !startTime || !endTime) return;
    const query = new URLSearchParams({
      doctorId,
      date,
      startTime,
      endTime,
    });
    if (reason.trim()) {
      query.set("reason", reason.trim());
    }
    router.push(`/appointments/confirm?${query.toString()}`);
  };

  useEffect(() => {
    if (doctorId) {
      setIsLoadingDoctor(true);
      fetchDoctorById(doctorId)
        .then((data) => {
          setDoctor(data);
          setIsLoadingDoctor(false);
        })
        .catch(() => {
          setIsLoadingDoctor(false);
        });
    }
  }, [doctorId]);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-12 gap-space-lg">
      {/* TOP BREADCRUMB */}
      <div className="flex items-center gap-2 text-slate-400 font-label-sm text-label-sm">
        <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
          Portal
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href="/doctors" className="hover:text-slate-600 transition-colors">
          Find Doctors
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link
          href={`/appointments?doctorId=${doctorId}`}
          className="hover:text-slate-600 transition-colors"
        >
          Date &amp; Time
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-teal-700 font-medium">Patient Details</span>
      </div>

      <h1 className="font-headline-lg text-slate-900 font-bold tracking-tight">
        Step 3: Patient Details
      </h1>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6">
        {/* Selected Slot Summary */}
        <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-label-sm uppercase tracking-wider text-teal-800 font-bold text-xs">
              Selected Appointment Slot
            </span>
            <p className="font-headline-sm text-slate-900 font-bold mt-0.5">
              {formatFullDateDisplay(date)}
            </p>
            <p className="font-body-md text-teal-800 font-semibold mt-0.5">
              {formatUtcTimeDisplay(startTime)} – {formatUtcTimeDisplay(endTime)}
            </p>
          </div>
          {doctor && (
            <div className="text-right">
              <span className="font-label-md text-slate-900 font-bold block">
                Dr. {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
              </span>
              <span className="font-body-sm text-slate-500">
                {doctor.specialization?.name} • Fee: ₹{doctor.consultationFee}
              </span>
            </div>
          )}
        </div>

        {/* Reason / Notes Input Form */}
        <div className="flex flex-col gap-2">
          <label className="font-headline-sm text-slate-900 font-semibold">
            Reason for Visit / Symptoms (Optional)
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe any symptoms, reason for consultation, or notes for the doctor..."
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-body-md focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            href={`/appointments?doctorId=${doctorId}`}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md font-medium rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Slot Selection</span>
          </Link>
          <button
            type="button"
            onClick={handleProceedToConfirmation}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>Proceed to Confirmation</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentDetailsPage() {
  return (
    <PatientLayout>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto p-8 text-center text-slate-500 animate-pulse">
            Loading details...
          </div>
        }
      >
        <AppointmentDetailsContent />
      </Suspense>
    </PatientLayout>
  );
}
