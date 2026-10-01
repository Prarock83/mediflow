"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import {
  DoctorProfile,
  DoctorSlotItem,
  fetchDoctorById,
  fetchDoctorSlots,
  fetchPatientAppointments,
  Appointment,
} from "@/lib/api";

// Date & Time Utility Helpers preserving UTC backend conventions
function formatUtcDateToYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatUtcTimeDisplay(isoString: string): string {
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

function getTodayUtcMidnight(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function AppointmentBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get("doctorId");

  // If no doctorId is present in query, render appointment list view
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(!doctorId);

  // Doctor & Slot Booking States
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState<boolean>(!!doctorId);

  const [railStartDate, setRailStartDate] = useState<Date>(getTodayUtcMidnight());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    formatUtcDateToYmd(getTodayUtcMidnight())
  );

  const [slots, setSlots] = useState<DoctorSlotItem[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(!!doctorId);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<DoctorSlotItem | null>(null);

  // Fetch appointments list if no doctorId
  useEffect(() => {
    if (!doctorId) {
      setIsLoadingAppointments(true);
      fetchPatientAppointments()
        .then((res) => {
          setPatientAppointments(res);
          setIsLoadingAppointments(false);
        })
        .catch(() => {
          setIsLoadingAppointments(false);
        });
    }
  }, [doctorId]);

  // Fetch Doctor Profile when doctorId changes
  useEffect(() => {
    if (!doctorId) return;
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

  // Fetch Slots for selected date
  const loadSlotsForDate = useCallback(
    async (dateStr: string) => {
      if (!doctorId) return;
      setIsLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(null);

      try {
        const response = await fetchDoctorSlots(doctorId, dateStr);
        setSlots(response.slots || []);
        setIsLoadingSlots(false);
      } catch (err: any) {
        console.error("Failed to load doctor slots:", err);
        setSlotsError(
          err?.message || "Something went wrong while retrieving clinic slots. Please try again."
        );
        setIsLoadingSlots(false);
      }
    },
    [doctorId]
  );

  useEffect(() => {
    if (doctorId && selectedDateStr) {
      loadSlotsForDate(selectedDateStr);
    }
  }, [doctorId, selectedDateStr, loadSlotsForDate]);

  // Navigation handlers for 7-day rail
  const handlePrevWeek = () => {
    const todayMidnight = getTodayUtcMidnight();
    const newStart = new Date(railStartDate.getTime());
    newStart.setUTCDate(newStart.getUTCDate() - 7);
    if (newStart.getTime() < todayMidnight.getTime()) {
      setRailStartDate(todayMidnight);
      setSelectedDateStr(formatUtcDateToYmd(todayMidnight));
    } else {
      setRailStartDate(newStart);
      setSelectedDateStr(formatUtcDateToYmd(newStart));
    }
  };

  const handleNextWeek = () => {
    const newStart = new Date(railStartDate.getTime());
    newStart.setUTCDate(newStart.getUTCDate() + 7);
    setRailStartDate(newStart);
    setSelectedDateStr(formatUtcDateToYmd(newStart));
  };

  // Generate 7-day date tiles
  const todayMidnight = getTodayUtcMidnight();
  const dateRail = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(railStartDate.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = formatUtcDateToYmd(d);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const dayNum = String(d.getUTCDate()).padStart(2, "0");
    const isPast = d.getTime() < todayMidnight.getTime();
    const isToday = dateStr === formatUtcDateToYmd(todayMidnight);
    const isSelected = dateStr === selectedDateStr;

    return {
      dateStr,
      dayName,
      dayNum,
      isPast,
      isToday,
      isSelected,
    };
  });

  // Calculate Month Year label for date strip
  const [selY, selM, selD] = selectedDateStr.split("-").map(Number);
  const selectedDateObj = new Date(Date.UTC(selY, selM - 1, selD));
  const monthYearLabel = selectedDateObj.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Filter available slots
  const availableSlots = slots.filter((s) => s.available);
  const morningSlots = availableSlots.filter(
    (s) => new Date(s.startTime).getUTCHours() < 12
  );
  const afternoonSlots = availableSlots.filter(
    (s) => new Date(s.startTime).getUTCHours() >= 12
  );

  const getDoctorInitials = (doc: DoctorProfile) => {
    if (doc.user?.firstName && doc.user?.lastName) {
      return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
    }
    return "DR";
  };

  const handleContinueToDetails = () => {
    if (!selectedSlot || !doctorId) return;
    const query = new URLSearchParams({
      doctorId,
      date: selectedDateStr,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    }).toString();

    router.push(`/appointments/details?${query}`);
  };

  // IF NO DOCTOR SELECTED: Render Appointments Overview Page
  if (!doctorId) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-space-md">
        <div className="bg-white rounded-2xl p-space-lg border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-headline-lg text-slate-900 font-bold">
                Appointments
              </h1>
              <p className="font-body-md text-slate-600">
                View your scheduled visits or select a doctor to book a new appointment.
              </p>
            </div>
            <Link
              href="/doctors"
              className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-label-md text-label-md font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">person_search</span>
              <span>Find a Doctor & Book</span>
            </Link>
          </div>

          {isLoadingAppointments ? (
            <div className="p-8 border border-slate-200 rounded-xl animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-48" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          ) : patientAppointments.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                <span className="material-symbols-outlined text-[32px]">calendar_today</span>
              </div>
              <h3 className="font-headline-md text-slate-900 font-semibold mb-1">
                No Scheduled Appointments
              </h3>
              <p className="font-body-sm text-slate-500 max-w-md mb-6">
                You currently have no upcoming healthcare appointments. Discover doctors and select an available time slot to get started.
              </p>
              <Link
                href="/doctors"
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-label-md text-label-md font-semibold hover:bg-teal-700 transition-all shadow-sm inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Browse Doctor Directory</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {patientAppointments.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                      {app.doctor ? getDoctorInitials(app.doctor) : "DR"}
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-slate-900 font-bold">
                        {app.doctor?.user ? `Dr. ${app.doctor.user.firstName} ${app.doctor.user.lastName}` : "Doctor Visit"}
                      </h4>
                      <p className="font-body-sm text-slate-500">
                        {app.doctor?.specialization?.name || "Healthcare Specialist"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-label-md text-slate-900 font-semibold">
                        {formatFullDateDisplay(app.appointmentDate || "2026-10-01")}
                      </p>
                      <p className="font-body-sm text-teal-700 font-medium">
                        {formatUtcTimeDisplay(app.startTime)} – {formatUtcTimeDisplay(app.endTime)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full font-label-sm text-xs font-semibold">
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN #3: APPOINTMENT DATE & TIME BOOKING FLOW
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 gap-space-lg">
      {/* TOP BREADCRUMB & CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <nav className="flex items-center gap-2 font-label-sm text-label-sm text-slate-400 mb-1">
            <Link className="hover:text-slate-600 transition-colors" href="/dashboard">
              Portal
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link className="hover:text-slate-600 transition-colors" href="/doctors">
              Find Doctors
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            {doctor && (
              <>
                <Link
                  className="hover:text-slate-600 transition-colors"
                  href={`/doctors/${doctor.id}`}
                >
                  Dr. {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                </Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </>
            )}
            <span className="text-slate-900 font-semibold">Book Appointment</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-slate-900 font-semibold tracking-tight">
            Book an Appointment
          </h1>
          <p className="font-body-md text-body-md text-slate-500 mt-0.5">
            Choose a date and available time that works for you.
          </p>
        </div>
      </div>

      {/* 4-STEP BOOKING PROGRESS INDICATOR */}
      <div className="bg-white rounded-xl p-space-md shadow-sm border border-slate-200/80">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
          {/* Step 1: Doctor Selected (Completed) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px] font-bold">check</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-slate-400">Step 1</span>
              <span className="font-label-md text-label-md text-slate-900 font-semibold truncate">
                Doctor Selected
              </span>
            </div>
          </div>

          {/* Step 2: Date & Time (Active) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/30">
              <span className="font-label-sm text-label-sm font-bold">2</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-teal-700 font-semibold">
                Step 2
              </span>
              <span className="font-label-md text-label-md text-slate-900 font-semibold truncate">
                Date &amp; Time
              </span>
            </div>
          </div>

          {/* Step 3: Details (Upcoming) */}
          <div className="flex items-center gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <span className="font-label-sm text-label-sm font-medium">3</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-slate-400">Step 3</span>
              <span className="font-label-md text-label-md text-slate-600 truncate">
                Patient Details
              </span>
            </div>
          </div>

          {/* Step 4: Confirm (Upcoming) */}
          <div className="flex items-center gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <span className="font-label-sm text-label-sm font-medium">4</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-slate-400">Step 4</span>
              <span className="font-label-md text-label-md text-slate-600 truncate">
                Confirmation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT DOCTOR SUMMARY CARD */}
      <div className="bg-white rounded-xl p-space-md sm:p-space-lg shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        {isLoadingDoctor ? (
          <div className="flex items-center gap-space-md animate-pulse w-full">
            <div className="w-16 h-16 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-200 rounded w-48" />
              <div className="h-4 bg-slate-100 rounded w-32" />
            </div>
          </div>
        ) : doctor ? (
          <>
            <div className="flex items-center gap-space-md">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center font-headline-sm font-bold text-xl shadow-xs shrink-0">
                {getDoctorInitials(doctor)}
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-slate-900">
                  Dr. {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">
                    {doctor.specialization?.name || "Specialist"}
                  </span>
                  <span className="font-body-sm text-body-sm text-slate-500">
                    • {doctor.experienceYears} years experience
                  </span>
                </div>
                <div className="mt-1 font-label-md text-label-md text-slate-900">
                  Consultation Fee: <span className="font-semibold text-teal-700">₹{doctor.consultationFee}</span>
                </div>
              </div>
            </div>
            <div className="self-end sm:self-center flex items-center gap-2">
              <Link
                href="/doctors"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md font-medium transition-colors"
              >
                <span>Change Doctor</span>
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-slate-500 font-body-sm">
            Doctor information unavailable.
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: DATE & TIME SELECTOR (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Date Strip Section */}
          <div className="bg-white rounded-xl p-space-md sm:p-space-lg shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-700 text-[22px]">
                  calendar_month
                </span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-slate-900">
                  Select Date
                </h3>
                <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold">
                  {monthYearLabel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors"
                  title="Previous Week"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors"
                  title="Next Week"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* 7-Day Responsive Date Rail */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {dateRail.map((item) => {
                if (item.isPast) {
                  return (
                    <div
                      key={item.dateStr}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 opacity-45 cursor-not-allowed select-none border border-slate-100"
                    >
                      <span className="font-label-sm text-label-sm text-slate-400 uppercase">
                        {item.dayName}
                      </span>
                      <span className="font-headline-sm text-headline-sm font-semibold text-slate-400 mt-1">
                        {item.dayNum}
                      </span>
                      <span className="text-[10px] font-body-sm text-slate-400 mt-0.5">
                        Passed
                      </span>
                    </div>
                  );
                }

                if (item.isSelected) {
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDateStr(item.dateStr)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/25 transition-all"
                    >
                      {item.isToday && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[9px] font-label-sm font-bold mb-0.5">
                          TODAY
                        </span>
                      )}
                      <span className="font-label-sm text-label-sm text-teal-100 uppercase">
                        {item.dayName}
                      </span>
                      <span className="font-headline-sm text-headline-sm font-bold text-white mt-1">
                        {item.dayNum}
                      </span>
                      <span className="text-[10px] font-label-sm text-teal-100 font-semibold mt-0.5">
                        Selected
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(item.dateStr)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group border border-slate-200/60 relative"
                  >
                    {item.isToday && (
                      <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-white text-[9px] font-label-sm font-bold">
                        TODAY
                      </span>
                    )}
                    <span className="font-label-sm text-label-sm text-slate-500 group-hover:text-teal-700 uppercase mt-0.5">
                      {item.dayName}
                    </span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-slate-900 mt-1">
                      {item.dayNum}
                    </span>
                    <span className="text-[10px] font-label-sm text-teal-700 font-medium mt-0.5">
                      {isLoadingSlots ? "..." : "Available"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-space-md pt-space-sm font-body-sm text-body-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                <span>
                  Availability retrieved dynamically for{" "}
                  <strong className="text-slate-800">{formatFullDateDisplay(selectedDateStr)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Available Time Slots Section / States */}
          <div className="bg-white rounded-xl p-space-md sm:p-space-lg shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-space-lg">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-slate-900">
                  Available Time Slots
                </h3>
                <p className="font-body-sm text-body-sm text-slate-500">
                  Select an appointment window for your consultation.
                </p>
              </div>
              <div className="flex items-center gap-4 text-label-sm font-label-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                  <span className="text-slate-600">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-600" />
                  <span className="text-slate-900 font-medium">Selected</span>
                </div>
              </div>
            </div>

            {isLoadingSlots ? (
              /* LOADING SKELETON STATE */
              <div className="animate-pulse space-y-6">
                <div>
                  <div className="h-5 bg-slate-200 rounded w-36 mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-lg" />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-5 bg-slate-200 rounded w-40 mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            ) : slotsError ? (
              /* ERROR STATE WITH RETRY ACTION */
              <div className="flex flex-col items-center justify-center p-space-lg text-center max-w-lg mx-auto py-6">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-space-md">
                  <span className="material-symbols-outlined text-[28px]">warning</span>
                </div>
                <h3 className="font-headline-md text-headline-md font-semibold text-slate-900">
                  Unable to load appointment slots
                </h3>
                <p className="font-body-md text-body-md text-slate-500 mt-1.5 mb-6">
                  {slotsError}
                </p>
                <button
                  type="button"
                  onClick={() => loadSlotsForDate(selectedDateStr)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>Try Again</span>
                </button>
              </div>
            ) : availableSlots.length === 0 ? (
              /* EMPTY SLOTS STATE */
              <div className="flex flex-col items-center justify-center p-space-lg text-center max-w-lg mx-auto py-6">
                <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 mb-space-md">
                  <span className="material-symbols-outlined text-[30px]">event_busy</span>
                </div>
                <h3 className="font-headline-md text-headline-md font-semibold text-slate-900">
                  No appointments available for this date
                </h3>
                <p className="font-body-md text-body-md text-slate-500 mt-1.5 mb-6">
                  There are no open consultation slots scheduled on {formatFullDateDisplay(selectedDateStr)}. Please select another date from the rail above.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold transition-colors shadow-sm"
                  >
                    View Next Week
                  </button>
                  <Link
                    href="/doctors"
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-label-md text-label-md font-medium transition-colors"
                  >
                    View Other Doctors
                  </Link>
                </div>
              </div>
            ) : (
              /* REAL SLOTS GRID DISPLAY */
              <div className="flex flex-col gap-space-lg">
                {/* Morning Slots */}
                {morningSlots.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-space-sm">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">
                        wb_sunny
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-slate-900">
                        Morning Slots
                      </span>
                      <span className="font-body-sm text-body-sm text-slate-500">
                        ({morningSlots.length} available)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {morningSlots.map((slot) => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const timeText = formatUtcTimeDisplay(slot.startTime);

                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-teal-600 text-white font-semibold shadow-sm shadow-teal-600/30"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-900 font-medium border border-slate-200/60"
                            }`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px]">
                                check
                              </span>
                            )}
                            <span>{timeText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {afternoonSlots.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-space-sm">
                      <span className="material-symbols-outlined text-[18px] text-teal-700">
                        partly_cloudy_day
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-slate-900">
                        Afternoon &amp; Evening Slots
                      </span>
                      <span className="font-body-sm text-body-sm text-slate-500">
                        ({afternoonSlots.length} available)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {afternoonSlots.map((slot) => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const timeText = formatUtcTimeDisplay(slot.startTime);

                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-teal-600 text-white font-semibold shadow-sm shadow-teal-600/30"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-900 font-medium border border-slate-200/60"
                            }`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px]">
                                check
                              </span>
                            )}
                            <span>{timeText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY APPOINTMENT SUMMARY CARD (4 Cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 flex flex-col gap-space-md">
          <div className="bg-white rounded-xl p-space-md sm:p-space-lg shadow-sm border border-slate-200/80">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-slate-900 mb-space-md pb-space-sm border-b border-slate-100">
              Appointment Summary
            </h3>

            {/* Summary Rows */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-start justify-between">
                <span className="font-body-sm text-body-sm text-slate-500">Doctor</span>
                <div className="text-right">
                  <span className="font-label-md text-label-md text-slate-900 font-semibold block">
                    {doctor?.user ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                  </span>
                  <span className="font-body-sm text-body-sm text-teal-700">
                    {doctor?.specialization?.name || "Specialist"}
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <span className="font-body-sm text-body-sm text-slate-500">Date</span>
                <span className="font-label-md text-label-md text-slate-900 font-semibold text-right">
                  {formatFullDateDisplay(selectedDateStr)}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="font-body-sm text-body-sm text-slate-500">Time Slot</span>
                <span className="font-label-md text-label-md text-teal-700 font-semibold text-right">
                  {selectedSlot
                    ? `${formatUtcTimeDisplay(selectedSlot.startTime)} – ${formatUtcTimeDisplay(selectedSlot.endTime)}`
                    : "Select a time slot"}
                </span>
              </div>

              <div className="p-space-md rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between mt-1">
                <span className="font-label-sm text-label-sm text-slate-600 font-medium">
                  Consultation Fee
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-slate-900">
                  ₹{doctor?.consultationFee || 0}
                </span>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col gap-2.5 mt-space-lg">
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={handleContinueToDetails}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 disabled:cursor-not-allowed text-white font-label-md text-label-md font-semibold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 group"
              >
                <span>Continue to Details</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>

              <Link
                href={doctor ? `/doctors/${doctor.id}` : "/doctors"}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md font-medium transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Doctor Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <PatientLayout>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto p-8 text-center text-slate-500 animate-pulse">
            Loading appointment booking portal...
          </div>
        }
      >
        <AppointmentBookingContent />
      </Suspense>
    </PatientLayout>
  );
}
