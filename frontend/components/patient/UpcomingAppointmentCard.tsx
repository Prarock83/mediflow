"use client";

import Link from "next/link";
import { Appointment } from "@/lib/api";

interface UpcomingAppointmentCardProps {
  appointment?: Appointment | null;
  isLoading?: boolean;
  error?: string | null;
}

export default function UpcomingAppointmentCard({
  appointment = null,
  isLoading = false,
  error = null,
}: UpcomingAppointmentCardProps) {
  // Status mapping helper
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pending",
          className: "bg-amber-50 border-amber-200/70 text-amber-800",
          dotClassName: "bg-amber-600",
        };
      case "CONFIRMED":
        return {
          label: "Confirmed Visit",
          className: "bg-teal-50 border-teal-200/70 text-teal-800",
          dotClassName: "bg-teal-600",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          className: "bg-blue-50 border-blue-200/70 text-blue-800",
          dotClassName: "bg-blue-600",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          className: "bg-rose-50 border-rose-200/70 text-rose-800",
          dotClassName: "bg-rose-600",
        };
      case "NO_SHOW":
        return {
          label: "No Show",
          className: "bg-slate-100 border-slate-200/70 text-slate-700",
          dotClassName: "bg-slate-500",
        };
      default:
        return {
          label: "Confirmed Visit",
          className: "bg-teal-50 border-teal-200/70 text-teal-800",
          dotClassName: "bg-teal-600",
        };
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-space-lg border border-slate-200/80 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="flex gap-4 items-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 bg-slate-200 rounded w-40" />
            <div className="h-4 bg-slate-200 rounded w-32" />
          </div>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl mb-4" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-2xl p-space-lg border border-slate-200/80 shadow-sm text-center py-8">
        <span className="material-symbols-outlined text-rose-500 text-[32px] mb-2">
          error
        </span>
        <p className="font-headline-sm text-slate-800 font-semibold mb-1">
          Unable to load appointment
        </p>
        <p className="font-body-sm text-slate-500 mb-4">{error}</p>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl font-label-md text-label-md hover:bg-teal-700 transition-all"
        >
          View Appointments List
        </Link>
      </section>
    );
  }

  // Fallback presentation data matching Stitch design if no active backend appointment
  const doctorName = appointment?.doctor?.user
    ? `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}, MD`
    : "Dr. Sarah Wilson, MD";
  const doctorSpecialization =
    appointment?.doctor?.specialization?.name || "Cardiologist · Cardiology & Heart Health";
  const statusBadge = getStatusBadge(appointment?.status || "CONFIRMED");
  const appointmentReason = appointment?.reason || "Routine cardiovascular evaluation, resting ECG analysis & blood pressure review.";

  return (
    <section className="bg-white rounded-2xl p-space-lg border border-slate-200/80 shadow-sm relative overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-space-xs border-b border-slate-100">
        <div className="flex items-center gap-space-sm">
          <span className="font-headline-sm text-headline-sm text-slate-900 font-bold">
            Next Scheduled Appointment
          </span>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-label-sm text-label-sm font-semibold ${statusBadge.className}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusBadge.dotClassName}`} />
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* Doctor Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md pt-space-md pb-space-md">
        <img
          className="w-16 h-16 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
          alt="Doctor portrait"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGmNpZQ3XafVRsRPrW5PprGsvpBDXNU04yLlanE-wixC_NGCqHX33fHgLWMmIklDJy4YXZleZgYNTWY7z6DPjls0kEIbblLfZqerNnb1TFXWxgCpjnpVWzWVAeY3u5QDWEaXfzBmOmvkTKgSBhsGj4Brd9-6KugNDgRkWVOtvRwaf9UV-O-aXvwEnOsK9gxZwP1UWDPEq735ebKmivPLMAdh0IdL_JTAK93WePGgW1r5DhNJKhcHoYBw"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-md text-headline-md text-slate-900 font-bold">
              {doctorName}
            </h2>
            <span
              className="material-symbols-outlined text-teal-600 text-[18px]"
              title="Verified Specialist"
            >
              verified
            </span>
          </div>
          <p className="font-body-md text-body-md text-slate-600 font-medium">
            {doctorSpecialization}
          </p>
        </div>
      </div>

      {/* Date, Time, Location Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm p-space-md bg-slate-50/80 border border-slate-100 rounded-xl mb-space-md">
        <div className="flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-teal-700 text-[20px] mt-0.5">
            calendar_month
          </span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-slate-500">Date</span>
            <span className="font-label-md text-label-md text-slate-900 font-semibold">
              Thursday, Oct 8, 2025
            </span>
          </div>
        </div>
        <div className="flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-teal-700 text-[20px] mt-0.5">
            schedule
          </span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-slate-500">Time & Duration</span>
            <span className="font-label-md text-label-md text-slate-900 font-semibold">
              10:30 AM (45 min)
            </span>
          </div>
        </div>
        <div className="flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-teal-700 text-[20px] mt-0.5">
            pin_drop
          </span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-slate-500">Location</span>
            <span className="font-label-md text-label-md text-slate-900 font-semibold">
              St. Jude Medical Center, Room 402, Building B
            </span>
          </div>
        </div>
      </div>

      {/* Visit Objective Note */}
      <div className="p-space-sm px-space-md rounded-xl bg-slate-50 border border-slate-200/70 mb-space-md flex items-center gap-space-xs text-slate-700 font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-[18px] text-teal-700 flex-shrink-0">
          info
        </span>
        <span>
          <strong>Visit Objective:</strong> {appointmentReason}
        </span>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
        <div className="flex items-center gap-space-sm flex-wrap">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-space-xs px-space-md py-2 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md rounded-xl transition-all shadow-sm"
          >
            <span>View Appointment Details</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-space-xs px-space-md py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-label-md text-label-md rounded-xl transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-600">
              edit_calendar
            </span>
            <span>Add to Calendar</span>
          </button>
        </div>
        <Link
          href="/appointments"
          className="font-label-md text-label-md text-slate-600 hover:text-rose-600 transition-colors px-2 py-1"
        >
          Reschedule
        </Link>
      </div>
    </section>
  );
}
