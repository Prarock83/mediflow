"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import {
  DoctorProfile,
  PatientProfileData,
  Appointment,
  ApiError,
  fetchDoctorById,
  fetchPatientProfile,
  createAppointment,
} from "@/lib/api";

// Date & Time Utility Helpers preserving UTC backend conventions
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

function AppointmentConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const doctorId = searchParams.get("doctorId");
  const dateStr = searchParams.get("date") || "";
  const startTime = searchParams.get("startTime") || "";
  const endTime = searchParams.get("endTime") || "";
  const reason = searchParams.get("reason") || "";

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [patient, setPatient] = useState<PatientProfileData | null>(null);

  const [isLoadingDoctor, setIsLoadingDoctor] = useState<boolean>(true);
  const [isLoadingPatient, setIsLoadingPatient] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<Appointment | null>(null);

  const [is409Conflict, setIs409Conflict] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch doctor details
  useEffect(() => {
    if (!doctorId) {
      setIsLoadingDoctor(false);
      return;
    }
    setIsLoadingDoctor(true);
    fetchDoctorById(doctorId)
      .then((data) => {
        setDoctor(data);
        setIsLoadingDoctor(false);
      })
      .catch((err) => {
        console.error("Failed to load doctor profile:", err);
        setIsLoadingDoctor(false);
      });
  }, [doctorId]);

  // Fetch patient profile details
  useEffect(() => {
    setIsLoadingPatient(true);
    fetchPatientProfile()
      .then((data) => {
        setPatient(data);
        setIsLoadingPatient(false);
      })
      .catch((err) => {
        console.warn("Could not fetch patient profile:", err);
        setIsLoadingPatient(false);
      });
  }, []);

  const getDoctorInitials = (doc: DoctorProfile) => {
    if (doc.user?.firstName && doc.user?.lastName) {
      return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
    }
    return "DR";
  };

  const getPatientDisplayName = () => {
    if (patient?.user?.firstName && patient?.user?.lastName) {
      return `${patient.user.firstName} ${patient.user.lastName}`;
    }
    return "Patient Profile";
  };

  // Submit appointment request to POST /api/appointments
  const handleConfirmAppointment = async () => {
    if (!doctorId || !dateStr || !startTime || !endTime || isSubmitting) return;

    setIsSubmitting(true);
    setIs409Conflict(false);
    setGeneralError(null);

    try {
      const created = await createAppointment({
        doctorId,
        appointmentDate: startTime, // backend accepts ISO date string
        startTime,
        endTime,
        reason: reason.trim() || undefined,
      });

      setSubmittedAppointment(created);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error("Failed to submit appointment:", err);
      setIsSubmitting(false);

      if (err instanceof ApiError && err.status === 409) {
        setIs409Conflict(true);
      } else {
        setGeneralError(
          err?.message ||
            "Something went wrong while processing your appointment request. Your booking was not registered. Please try again."
        );
      }
    }
  };

  // EDGE CASE: Missing required booking params
  if (!doctorId || !dateStr || !startTime || !endTime) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h2 className="font-headline-md text-slate-900 font-bold">
          Incomplete Booking Information
        </h2>
        <p className="font-body-md text-slate-500 max-w-md">
          Some required appointment parameters were missing. Please restart the booking process by selecting a doctor and an available slot.
        </p>
        <Link
          href="/doctors"
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold rounded-xl transition-all shadow-sm"
        >
          Find a Doctor
        </Link>
      </div>
    );
  }

  // STATE 2: BOOKING SUCCESS STATE
  if (submittedAppointment) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center py-6">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[34px] font-bold">
            check_circle
          </span>
        </div>

        <h1 className="font-headline-lg text-slate-900 font-bold">
          Appointment Requested
        </h1>
        <p className="font-body-md text-slate-600 mt-1.5 max-w-lg">
          Your appointment request with{" "}
          <span className="font-semibold text-slate-900">
            Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "your doctor"}
          </span>{" "}
          has been successfully submitted.
        </p>

        {/* Prominent Pending Status Pill */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
          <span className="font-label-md text-label-md font-semibold tracking-wide">
            Status: {submittedAppointment.status || "PENDING"}
          </span>
        </div>

        <p className="font-body-sm text-slate-500 mt-2 max-w-md">
          You&apos;ll receive an update in your portal notifications as soon as the doctor responds to your request.
        </p>

        {/* Confirmed Appointment Details Card */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 mt-6 text-left flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex flex-col">
              <span className="font-label-sm text-slate-400 uppercase tracking-wider text-[11px]">
                Booking Reference ID
              </span>
              <span className="font-headline-sm text-teal-700 font-bold truncate">
                #{submittedAppointment.id}
              </span>
            </div>
            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
              Visit Requested
            </span>
          </div>

          {/* Doctor Summary Row */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
              {doctor ? getDoctorInitials(doctor) : "DR"}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-slate-900 font-bold">
                Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
              </span>
              <span className="font-body-sm text-slate-500">
                {doctor?.specialization?.name || "Medical Specialist"}
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                Scheduled Date &amp; Time
              </span>
              <span className="font-body-md text-slate-900 font-semibold">
                {formatFullDateDisplay(dateStr)}
              </span>
              <span className="font-body-sm text-teal-700 font-semibold">
                {formatUtcTimeDisplay(startTime)} – {formatUtcTimeDisplay(endTime)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                Patient Name
              </span>
              <span className="font-body-md text-slate-900 font-semibold">
                {getPatientDisplayName()}
              </span>
            </div>

            {reason && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                  Reason for Visit
                </span>
                <span className="font-body-md text-slate-700">
                  {reason}
                </span>
              </div>
            )}

            {doctor?.consultationFee !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                  Consultation Fee
                </span>
                <span className="font-headline-sm text-slate-900 font-bold">
                  ₹{doctor.consultationFee}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            href="/appointments"
            className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md rounded-xl font-semibold shadow-sm transition-all text-center"
          >
            View My Appointments
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md rounded-xl font-medium transition-colors text-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // STATE 4: HTTP 409 CONFLICT (SLOT UNAVAILABLE)
  if (is409Conflict) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center py-10">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px]">event_busy</span>
        </div>
        <h2 className="font-headline-lg text-slate-900 font-bold">
          This slot is no longer available
        </h2>
        <p className="font-body-md text-slate-600 mt-2 max-w-md">
          Another patient has reserved this time slot. Please choose another available time with{" "}
          <span className="font-semibold text-slate-900">
            Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "your doctor"}
          </span>.
        </p>

        {/* Slot Details Notice */}
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 mt-6 text-left flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-label-sm text-slate-400">Requested Slot</span>
            <span className="font-label-sm text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-semibold">
              Unavailable
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">
              schedule
            </span>
            <span className="font-body-md text-slate-500 line-through">
              {formatFullDateDisplay(dateStr)} • {formatUtcTimeDisplay(startTime)} – {formatUtcTimeDisplay(endTime)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full justify-center">
          <Link
            href={`/appointments?doctorId=${doctorId}`}
            className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md rounded-xl font-semibold shadow-sm transition-all text-center"
          >
            Choose Another Slot
          </Link>
          <Link
            href={`/doctors/${doctorId}`}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md rounded-xl font-medium transition-colors text-center"
          >
            Return to Doctor Profile
          </Link>
        </div>
      </div>
    );
  }

  // STATE 3: GENERAL ERROR STATE
  if (generalError) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center py-10">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h2 className="font-headline-lg text-slate-900 font-bold">
          Unable to book appointment
        </h2>
        <p className="font-body-md text-slate-600 mt-2 max-w-md">
          {generalError}
        </p>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleConfirmAppointment}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md rounded-xl font-semibold shadow-sm transition-all inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Try Again</span>
          </button>
          <Link
            href={`/appointments/details?doctorId=${doctorId}&date=${dateStr}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&reason=${encodeURIComponent(reason)}`}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md rounded-xl font-medium transition-colors"
          >
            Back to Details
          </Link>
        </div>
      </div>
    );
  }

  // STATE 1: REVIEW & CONFIRM (DEFAULT FORM STATE)
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 gap-space-lg">
      {/* BREADCRUMB */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-label-sm text-label-sm text-slate-400">
        <Link className="hover:text-slate-600 transition-colors" href="/dashboard">
          Portal
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link className="hover:text-slate-600 transition-colors" href="/doctors">
          Find Doctors
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link
          className="hover:text-slate-600 transition-colors"
          href={`/doctors/${doctorId}`}
        >
          Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link
          className="hover:text-slate-600 transition-colors"
          href={`/appointments?doctorId=${doctorId}`}
        >
          Book Appointment
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-slate-900 font-semibold">Review &amp; Confirm</span>
      </nav>

      {/* VISUAL BOOKING PROGRESS STEPPER */}
      <div className="w-full bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm items-center">
          {/* Step 1 */}
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-label-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-slate-400 text-xs">Step 1</span>
              <span className="font-label-md text-slate-900 font-medium truncate">Doctor Selected</span>
            </div>
          </div>
          {/* Step 2 */}
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-label-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-slate-400 text-xs">Step 2</span>
              <span className="font-label-md text-slate-900 font-medium truncate">Date &amp; Time</span>
            </div>
          </div>
          {/* Step 3 */}
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-label-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-slate-400 text-xs">Step 3</span>
              <span className="font-label-md text-slate-900 font-medium truncate">Patient Details</span>
            </div>
          </div>
          {/* Step 4 Active */}
          <div className="flex items-center gap-space-sm bg-teal-50 px-space-sm py-1.5 rounded-lg border border-teal-200/60">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-label-sm text-xs font-semibold">
              4
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-teal-700 font-semibold text-xs">STEP 4</span>
              <span className="font-label-md text-teal-800 font-semibold truncate">Review &amp; Confirm</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h1 className="font-headline-lg text-slate-900 font-bold">Review &amp; Confirm</h1>
        <p className="font-body-md text-slate-500 mt-1">
          Please review your appointment details carefully before sending your request.
        </p>
      </div>

      {/* MAIN SPLIT LAYOUT (Desktop 12 cols: 8 left, 4 right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: OVERVIEW CARDS */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Card 1: Doctor & Schedule */}
          <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-slate-100">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-teal-700 text-[22px]">
                  medical_services
                </span>
                <h2 className="font-headline-sm text-slate-900 font-semibold">Doctor &amp; Schedule</h2>
              </div>
              <Link
                href={`/appointments?doctorId=${doctorId}`}
                className="font-label-sm text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Change</span>
              </Link>
            </div>

            {isLoadingDoctor ? (
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ) : doctor ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md bg-slate-50 p-space-md rounded-xl border border-slate-100">
                <div className="flex items-center gap-space-md">
                  <div className="w-14 h-14 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {getDoctorInitials(doctor)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-slate-900 font-bold">
                      Dr. {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="bg-teal-100 text-teal-800 font-label-sm text-xs px-2 py-0.5 rounded-full font-semibold">
                        {doctor.specialization?.name || "Specialist"}
                      </span>
                      <span className="text-slate-500 font-body-sm text-xs">
                        • ₹{doctor.consultationFee} / visit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Highlighted Time Window Pill */}
            <div className="flex items-center gap-space-md bg-teal-50/80 border border-teal-200/80 p-space-md rounded-xl text-teal-900">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-teal-800 font-semibold uppercase text-[11px]">
                  Reserved Time Window
                </span>
                <span className="font-headline-sm text-slate-900 font-bold">
                  {formatFullDateDisplay(dateStr)} • {formatUtcTimeDisplay(startTime)} – {formatUtcTimeDisplay(endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Patient & Visit Information */}
          <div className="bg-white p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-slate-100">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-teal-700 text-[22px]">
                  badge
                </span>
                <h2 className="font-headline-sm text-slate-900 font-semibold">
                  Patient &amp; Visit Information
                </h2>
              </div>
              <Link
                href={`/appointments/details?doctorId=${doctorId}&date=${dateStr}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&reason=${encodeURIComponent(reason)}`}
                className="font-label-sm text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Edit Details</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="bg-slate-50 p-space-md rounded-xl flex flex-col border border-slate-100">
                <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                  Patient Name
                </span>
                <span className="font-label-md text-slate-900 font-semibold mt-1">
                  {isLoadingPatient ? "Loading..." : getPatientDisplayName()}
                </span>
              </div>

              {patient?.gender && (
                <div className="bg-slate-50 p-space-md rounded-xl flex flex-col border border-slate-100">
                  <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                    Gender
                  </span>
                  <span className="font-label-md text-slate-900 font-semibold mt-1">
                    {patient.gender}
                  </span>
                </div>
              )}
            </div>

            {/* Reason for visit box */}
            <div className="bg-slate-50 p-space-md rounded-xl flex flex-col gap-1.5 border border-slate-100">
              <span className="font-label-sm text-slate-400 font-semibold uppercase text-[11px]">
                Reason for Visit / Symptoms
              </span>
              <p className="font-body-md text-slate-800 font-medium">
                {reason.trim() || "No specific reason provided."}
              </p>
            </div>
          </div>

          {/* Subtle Booking Notice */}
          <div className="flex items-start gap-space-sm bg-slate-50 p-space-md rounded-xl border border-slate-200/60">
            <span className="material-symbols-outlined text-teal-700 text-[20px] shrink-0 mt-0.5">
              info
            </span>
            <p className="font-body-sm text-slate-600 leading-relaxed">
              By confirming this appointment, you are requesting this available appointment slot with the selected doctor. Upon confirmation, your booking request will be saved with <span className="font-semibold text-slate-900">PENDING</span> status.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY & ACTION PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
          <div className="bg-white p-space-lg rounded-xl shadow-md border border-slate-200/80 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-slate-100">
              <h3 className="font-headline-sm text-slate-900 font-semibold">Appointment Summary</h3>
            </div>

            <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Doctor</span>
                <span className="text-slate-900 font-semibold text-right">
                  Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Specialization</span>
                <span className="text-slate-900 font-medium text-right">
                  {doctor?.specialization?.name || "Specialist"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900 font-medium text-right">
                  {formatFullDateDisplay(dateStr)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Time Window</span>
                <span className="text-slate-900 font-medium text-right">
                  {formatUtcTimeDisplay(startTime)} – {formatUtcTimeDisplay(endTime)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Patient</span>
                <span className="text-slate-900 font-medium text-right">
                  {getPatientDisplayName()}
                </span>
              </div>

              {doctor?.consultationFee !== undefined && (
                <div className="flex justify-between py-1.5 bg-slate-50 px-3 rounded-lg border border-slate-100 mt-1">
                  <span className="font-label-sm text-slate-600 font-semibold">
                    Consultation Fee
                  </span>
                  <span className="font-headline-sm text-teal-700 font-bold">
                    ₹{doctor.consultationFee}
                  </span>
                </div>
              )}
            </div>

            {/* Primary Confirmation Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAppointment}
              className="w-full mt-space-sm py-3 px-space-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-md text-label-md rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all duration-150"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Confirm Appointment</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            {/* Back Navigation Button */}
            <Link
              href={`/appointments/details?doctorId=${doctorId}&date=${dateStr}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&reason=${encodeURIComponent(reason)}`}
              className="w-full py-2.5 px-space-md bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md rounded-xl font-medium text-center transition-colors block"
            >
              ← Back to Appointment Details
            </Link>

            <p className="font-body-sm text-slate-400 text-center text-xs pt-1">
              Status will be recorded as <span className="font-semibold text-slate-700">PENDING</span> upon request submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentConfirmPage() {
  return (
    <PatientLayout>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto p-8 text-center text-slate-500 animate-pulse">
            Loading appointment review screen...
          </div>
        }
      >
        <AppointmentConfirmContent />
      </Suspense>
    </PatientLayout>
  );
}
