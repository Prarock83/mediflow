"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import {
  Appointment,
  DoctorProfile,
  PatientProfileData,
  fetchPatientAppointmentById,
  fetchPatientProfile,
} from "@/lib/api";

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

function formatFullDateDisplay(dateStrOrIso: string): string {
  if (!dateStrOrIso) return "";
  let d: Date;
  if (dateStrOrIso.includes("T")) {
    d = new Date(dateStrOrIso);
  } else {
    const [year, month, day] = dateStrOrIso.split("-").map(Number);
    d = new Date(Date.UTC(year, month - 1, day));
  }
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDoctorInitials(doc?: DoctorProfile): string {
  if (doc?.user?.firstName && doc?.user?.lastName) {
    return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
  }
  return "DR";
}

function getStatusDetails(status: string) {
  switch (status) {
    case "PENDING":
      return {
        pillText: "Pending",
        pillBg: "bg-amber-50 text-amber-800 border-amber-200/80",
        dotBg: "bg-amber-500",
        cardIcon: "hourglass_top",
        cardIconBg: "bg-amber-100/70 text-amber-700",
        title: "Pending Confirmation",
        desc: "Your appointment request is awaiting confirmation.",
        lifecycle: "Pending Review",
      };
    case "CONFIRMED":
      return {
        pillText: "Confirmed",
        pillBg: "bg-teal-50 text-teal-800 border-teal-200/80",
        dotBg: "bg-teal-600",
        cardIcon: "check_circle",
        cardIconBg: "bg-teal-100/70 text-teal-700",
        title: "Appointment Confirmed",
        desc: "Your appointment has been confirmed.",
        lifecycle: "Confirmed & Scheduled",
      };
    case "COMPLETED":
      return {
        pillText: "Completed",
        pillBg: "bg-blue-50 text-blue-800 border-blue-200/80",
        dotBg: "bg-blue-500",
        cardIcon: "task_alt",
        cardIconBg: "bg-blue-100/70 text-blue-700",
        title: "Appointment Completed",
        desc: "This appointment has been completed.",
        lifecycle: "Consultation Concluded",
      };
    case "CANCELLED":
      return {
        pillText: "Cancelled",
        pillBg: "bg-rose-50 text-rose-800 border-rose-200/80",
        dotBg: "bg-rose-500",
        cardIcon: "cancel",
        cardIconBg: "bg-rose-100/70 text-rose-700",
        title: "Appointment Cancelled",
        desc: "This appointment has been cancelled.",
        lifecycle: "Cancelled",
      };
    case "NO_SHOW":
      return {
        pillText: "No Show",
        pillBg: "bg-slate-100 text-slate-800 border-slate-200/80",
        dotBg: "bg-slate-500",
        cardIcon: "person_off",
        cardIconBg: "bg-slate-200/80 text-slate-700",
        title: "Marked as No Show",
        desc: "This appointment was marked as a no-show.",
        lifecycle: "Unattended",
      };
    default:
      return {
        pillText: status,
        pillBg: "bg-slate-100 text-slate-800 border-slate-200",
        dotBg: "bg-slate-400",
        cardIcon: "info",
        cardIconBg: "bg-slate-100 text-slate-700",
        title: `Status: ${status}`,
        desc: "Appointment record overview.",
        lifecycle: status,
      };
  }
}

export default function AppointmentDetailsViewPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = typeof params?.id === "string" ? params.id : "";

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfileData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const loadData = useCallback(() => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchPatientAppointmentById(appointmentId),
      fetchPatientProfile().catch(() => null),
    ])
      .then(([appData, profileData]) => {
        setAppointment(appData);
        setPatientProfile(profileData);
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to load appointment details:", err);
        setError("We couldn't retrieve this appointment right now. Please try again.");
        setIsLoading(false);
      });
  }, [appointmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyUuid = () => {
    if (!appointment?.id) return;
    navigator.clipboard.writeText(appointment.id).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    });
  };

  const doctor = appointment?.doctor;
  const statusDetails = getStatusDetails(appointment?.status || "PENDING");

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 gap-space-lg">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs font-body-sm text-body-sm text-slate-400 mb-1">
          <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
            Portal
          </Link>
          <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
          <Link href="/appointments" className="hover:text-slate-600 transition-colors">
            Appointments
          </Link>
          <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
          <span className="text-teal-700 font-semibold">Appointment Details</span>
        </nav>

        {/* STATE 1: LOADING SKELETON STATE */}
        {isLoading && (
          <div className="flex flex-col w-full gap-space-lg animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-slate-200 rounded-lg" />
                <div className="h-4 w-96 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-8 w-28 bg-slate-200 rounded-full" />
            </div>

            <div className="h-28 w-full bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-200 rounded" />
                  <div className="h-4 w-72 bg-slate-100 rounded" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                <div className="h-44 bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg space-y-4" />
                <div className="h-48 bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg space-y-4" />
              </div>
              <div className="lg:col-span-5 flex flex-col gap-space-lg">
                <div className="h-52 bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg space-y-4" />
                <div className="h-36 bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg space-y-4" />
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: API ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-space-md shadow-sm">
              <span className="material-symbols-outlined text-[32px]">cloud_off</span>
            </div>
            <h2 className="font-headline-md text-slate-900 font-semibold">Unable to load appointment</h2>
            <p className="font-body-md text-slate-500 mt-2 mb-space-lg">{error}</p>
            <div className="flex flex-col sm:flex-row items-center gap-space-sm w-full">
              <button
                type="button"
                onClick={loadData}
                className="w-full py-2.5 px-space-md rounded-xl bg-teal-600 text-white font-label-md text-label-md font-semibold hover:bg-teal-700 transition-all shadow-sm"
              >
                Try Again
              </button>
              <Link
                href="/appointments"
                className="w-full py-2.5 px-space-md rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-label-md text-label-md font-medium text-center transition-colors"
              >
                Back to Appointments
              </Link>
            </div>
          </div>
        )}

        {/* STATE 3: NOT FOUND STATE */}
        {!isLoading && !error && !appointment && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-space-md shadow-sm">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
            </div>
            <h2 className="font-headline-md text-slate-900 font-semibold">Appointment not found</h2>
            <p className="font-body-md text-slate-500 mt-2 mb-space-lg">
              This appointment could not be found or is no longer available to your account.
            </p>
            <Link
              href="/appointments"
              className="w-full py-2.5 px-space-md rounded-xl bg-teal-600 text-white font-label-md text-label-md font-semibold hover:bg-teal-700 transition-all shadow-sm text-center"
            >
              Back to Appointments
            </Link>
          </div>
        )}

        {/* STATE 4: STANDARD APPOINTMENT VIEW */}
        {!isLoading && !error && appointment && (
          <div className="flex flex-col w-full gap-space-lg">
            {/* Header Block */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="flex flex-col">
                <h1 className="font-headline-lg text-headline-lg text-slate-900 font-bold tracking-tight">
                  Appointment Details
                </h1>
                <p className="font-body-md text-slate-500 mt-0.5">
                  View the details and current status of your appointment.
                </p>
              </div>
              <div className="flex items-center self-start sm:self-auto">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md font-label-md border shadow-sm font-semibold ${statusDetails.pillBg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusDetails.dotBg} animate-pulse`} />
                  <span>{statusDetails.pillText}</span>
                </span>
              </div>
            </header>

            {/* Top Appointment Status & Reference Card */}
            <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 relative overflow-hidden transition-all duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
                <div className="flex items-start gap-space-md">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusDetails.cardIconBg}`}
                  >
                    <span className="material-symbols-outlined text-[26px]">
                      {statusDetails.cardIcon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className="font-headline-sm text-slate-900 font-semibold">
                        {statusDetails.title}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-label-sm text-slate-500 text-xs">Record Overview</span>
                    </div>
                    <p className="font-body-md text-slate-600 mt-1">{statusDetails.desc}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end justify-center bg-slate-50 lg:bg-transparent p-space-md lg:p-0 rounded-xl border border-slate-100 lg:border-none">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider text-xs mb-1">
                    Appointment Reference
                  </span>
                  <div className="flex items-center gap-space-xs">
                    <code className="font-mono text-body-sm text-slate-900 font-medium bg-white lg:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60 select-all">
                      #{appointment.id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUuid}
                      className="p-1 text-slate-500 hover:text-teal-700 rounded-md hover:bg-slate-100 transition-colors relative"
                      title="Copy Appointment ID"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      {copiedToast && (
                        <span className="absolute -top-7 right-0 px-2 py-0.5 bg-slate-900 text-white text-[10px] rounded font-label-sm opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Copied
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-slate-500 font-label-sm text-xs">
                    <span>Appointment Status</span>
                    <span className="text-teal-700 font-bold">●</span>
                    <span className="text-slate-900 font-medium">{statusDetails.lifecycle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Two-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Left Column: Primary Clinical Details (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                {/* Doctor Information Card */}
                <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-sm border-b border-slate-100">
                    <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                      Practitioner Details
                    </span>
                    <span className="inline-flex items-center gap-1 text-teal-700 font-label-sm text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                      Consultant
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-space-md">
                    <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
                      {getDoctorInitials(doctor)}
                    </div>
                    <div className="flex flex-col flex-1">
                      <h2 className="font-headline-md text-slate-900 font-bold">
                        Dr.{" "}
                        {doctor?.user
                          ? `${doctor.user.firstName} ${doctor.user.lastName}`
                          : "Medical Specialist"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-slate-600 font-body-md text-body-md">
                        {doctor?.specialization?.name && (
                          <span className="text-slate-900 font-semibold">
                            {doctor.specialization.name}
                          </span>
                        )}
                        {doctor?.specialization?.name && doctor?.experienceYears !== undefined && (
                          <span>•</span>
                        )}
                        {doctor?.experienceYears !== undefined && (
                          <span>{doctor.experienceYears} years experience</span>
                        )}
                      </div>
                      {doctor?.consultationFee !== undefined && (
                        <div className="mt-2 text-label-sm font-label-sm text-slate-500">
                          Consultation Fee:{" "}
                          <span className="font-bold text-slate-900">₹{doctor.consultationFee}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule & Timing Card */}
                <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Schedule &amp; Timing
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    {/* Date block */}
                    <div className="flex items-center gap-space-md p-space-md rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-lg bg-white text-teal-700 border border-slate-200/60 flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[22px]">calendar_today</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-slate-400 text-xs">Consultation Date</span>
                        <span className="font-headline-sm text-slate-900 font-bold">
                          {formatFullDateDisplay(
                            appointment.startTime || appointment.appointmentDate
                          )}
                        </span>
                      </div>
                    </div>
                    {/* Time block */}
                    <div className="flex items-center gap-space-md p-space-md rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-lg bg-white text-teal-700 border border-slate-200/60 flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[22px]">schedule</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-slate-400 text-xs">Assigned Window</span>
                        <span className="font-headline-sm text-slate-900 font-bold">
                          {formatUtcTimeDisplay(appointment.startTime)} –{" "}
                          {formatUtcTimeDisplay(appointment.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs text-slate-500 font-body-sm text-xs mt-1">
                    <span className="material-symbols-outlined text-[16px] text-teal-700">info</span>
                    <span>All timestamps follow UTC standard coordinates. Please join punctually.</span>
                  </div>
                </div>

                {/* Reason for Visit Card */}
                <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-sm">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Reason for Visit
                  </span>
                  <div className="p-space-md rounded-xl bg-slate-50 border border-slate-100 font-body-md text-slate-800">
                    <p className={appointment.reason ? "font-medium" : "text-slate-400 italic"}>
                      {appointment.reason || "No reason provided."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Patient & Consultation Overview (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-space-lg">
                {/* Patient Information Card */}
                <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                      Patient Information
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">badge</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center py-1">
                      <span className="font-body-md text-slate-500">Full Name</span>
                      <span className="font-body-md text-slate-900 font-semibold">
                        {patientProfile?.user
                          ? `${patientProfile.user.firstName} ${patientProfile.user.lastName}`
                          : "Patient"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-50">
                      <span className="font-body-md text-slate-500">Date of Birth</span>
                      <span className="font-body-md text-slate-900 font-medium">
                        {patientProfile?.dateOfBirth
                          ? formatFullDateDisplay(patientProfile.dateOfBirth)
                          : "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-50">
                      <span className="font-body-md text-slate-500">Gender</span>
                      <span className="font-body-md text-slate-900 font-medium">
                        {patientProfile?.gender || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consultation Overview Card */}
                <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Consultation Overview
                  </span>
                  {doctor?.consultationFee !== undefined && (
                    <div className="flex items-baseline justify-between p-space-md rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-slate-500 text-xs">Consultation Fee</span>
                        <span className="font-label-sm text-slate-400 text-[11px]">Standard rate</span>
                      </div>
                      <div className="font-headline-sm text-teal-700 font-bold text-xl">
                        ₹{doctor.consultationFee}
                      </div>
                    </div>
                  )}

                  <div className="p-space-md rounded-xl bg-teal-50/60 border border-teal-200/60 flex items-start gap-space-sm text-slate-600">
                    <span className="material-symbols-outlined text-teal-700 text-[20px] shrink-0 mt-0.5">
                      verified_user
                    </span>
                    <p className="font-body-sm text-xs leading-relaxed text-slate-700">
                      This is an official record of your booked appointment with{" "}
                      <strong className="text-slate-900">MediFlow Healthcare</strong>.
                    </p>
                  </div>
                </div>

                {/* Read-Only Navigation Actions */}
                <div className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center gap-space-sm">
                  <Link
                    href="/appointments"
                    className="w-full sm:flex-1 py-2.5 px-space-md rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Back to Appointments</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto py-2.5 px-space-md rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md font-medium text-center transition-colors block"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
