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

function formatShortDateDisplay(dateStrOrIso: string): string {
  if (!dateStrOrIso) return "";
  let d: Date;
  if (dateStrOrIso.includes("T")) {
    d = new Date(dateStrOrIso);
  } else {
    const [year, month, day] = dateStrOrIso.split("-").map(Number);
    d = new Date(Date.UTC(year, month - 1, day));
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
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

function getDoctorInitials(doc?: DoctorProfile): string {
  if (doc?.user?.firstName && doc?.user?.lastName) {
    return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
  }
  return "DR";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        className: "bg-amber-50 border border-amber-200/80 text-amber-800",
        dotColor: "bg-amber-600",
      };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        className: "bg-teal-50 border border-teal-200/80 text-teal-800",
        dotColor: "bg-teal-600",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-slate-100 border border-slate-200/80 text-slate-700",
        dotColor: "bg-slate-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-rose-50 border border-rose-200/80 text-rose-700",
        dotColor: "bg-rose-600",
      };
    case "NO_SHOW":
      return {
        label: "No Show",
        className: "bg-purple-50 border border-purple-200/80 text-purple-800",
        dotColor: "bg-purple-600",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 border border-slate-200 text-slate-700",
        dotColor: "bg-slate-400",
      };
  }
}

function AppointmentBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get("doctorId");

  // =========================================================
  // MY APPOINTMENTS LIST SCREEN STATES (When !doctorId)
  // =========================================================
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(!doctorId);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "PAST" | "CANCELLED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // =========================================================
  // DOCTOR SLOT BOOKING FLOW STATES (When doctorId exists)
  // =========================================================
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

  // Load appointments list if no doctorId
  const loadAppointments = useCallback(() => {
    if (doctorId) return;
    setIsLoadingAppointments(true);
    setAppointmentsError(null);
    fetchPatientAppointments()
      .then((res) => {
        setPatientAppointments(res);
        setIsLoadingAppointments(false);
      })
      .catch((err: any) => {
        console.error("Failed to load patient appointments:", err);
        setAppointmentsError(
          err?.message || "We couldn't retrieve your appointments right now. Please check your connection and try again."
        );
        setIsLoadingAppointments(false);
      });
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      loadAppointments();
    }
  }, [doctorId, loadAppointments]);

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

  // =========================================================
  // CALCULATIONS & DERIVED DATA FOR MY APPOINTMENTS LIST SCREEN
  // =========================================================
  const nowMs = Date.now();
  const nowDateStr = formatUtcDateToYmd(new Date());

  const isAppointmentUpcoming = (app: Appointment) => {
    if (app.status === "CANCELLED" || app.status === "NO_SHOW" || app.status === "COMPLETED") {
      return false;
    }
    const appTime = new Date(app.startTime).getTime();
    if (!isNaN(appTime)) {
      return appTime >= nowMs - 3600000;
    }
    return app.appointmentDate >= nowDateStr;
  };

  const upcomingAppointments = patientAppointments
    .filter(isAppointmentUpcoming)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const nextAppointment = upcomingAppointments[0] || null;

  const pendingCount = patientAppointments.filter((a) => a.status === "PENDING").length;
  const completedCount = patientAppointments.filter((a) => a.status === "COMPLETED").length;
  const cancelledCount = patientAppointments.filter((a) => a.status === "CANCELLED").length;
  const pastCount = patientAppointments.filter((a) => {
    if (a.status === "COMPLETED" || a.status === "NO_SHOW") return true;
    if (a.status === "CANCELLED") return false;
    const appEndTime = new Date(a.endTime || a.startTime).getTime();
    return !isNaN(appEndTime) && appEndTime < nowMs;
  }).length;
  const allCount = patientAppointments.length;
  const upcomingCount = upcomingAppointments.length;

  // Filter appointments according to active tab
  let tabBaseAppointments: Appointment[] = [];
  if (activeTab === "ALL") {
    tabBaseAppointments = patientAppointments;
  } else if (activeTab === "UPCOMING") {
    tabBaseAppointments = upcomingAppointments;
  } else if (activeTab === "PAST") {
    tabBaseAppointments = patientAppointments.filter((a) => {
      if (a.status === "COMPLETED" || a.status === "NO_SHOW") return true;
      if (a.status === "CANCELLED") return false;
      const appEndTime = new Date(a.endTime || a.startTime).getTime();
      return !isNaN(appEndTime) && appEndTime < nowMs;
    });
  } else if (activeTab === "CANCELLED") {
    tabBaseAppointments = patientAppointments.filter((a) => a.status === "CANCELLED");
  }

  // Filter by status dropdown, date dropdown, and search query
  let filteredAppointments = tabBaseAppointments.filter((app) => {
    // Status Filter
    if (statusFilter !== "ALL" && app.status !== statusFilter) {
      return false;
    }

    // Date Filter
    if (dateFilter === "TODAY") {
      const isToday = app.appointmentDate === nowDateStr || app.startTime.startsWith(nowDateStr);
      if (!isToday) return false;
    } else if (dateFilter === "THIS_WEEK") {
      const appTime = new Date(app.startTime).getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (Math.abs(appTime - nowMs) > weekMs) return false;
    } else if (dateFilter === "THIS_MONTH") {
      const appDate = new Date(app.startTime);
      const now = new Date();
      if (appDate.getUTCMonth() !== now.getUTCMonth() || appDate.getUTCFullYear() !== now.getUTCFullYear()) {
        return false;
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const docName = app.doctor?.user
        ? `${app.doctor.user.firstName} ${app.doctor.user.lastName}`.toLowerCase()
        : "";
      const specName = app.doctor?.specialization?.name?.toLowerCase() || "";
      const reasonText = app.reason?.toLowerCase() || "";
      const matches = docName.includes(q) || specName.includes(q) || reasonText.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  // Sort
  filteredAppointments.sort((a, b) => {
    const timeA = new Date(a.startTime).getTime();
    const timeB = new Date(b.startTime).getTime();
    if (sortOption === "OLDEST") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredAppointments.length);
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setActiveTab("ALL");
    setSearchQuery("");
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setSortOption("NEWEST");
    setCurrentPage(1);
  };

  // =========================================================
  // VIEW A: MY APPOINTMENTS LIST SCREEN (When !doctorId)
  // =========================================================
  if (!doctorId) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 gap-space-lg">
        {/* PAGE HEADER & ACTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col">
            <nav className="flex items-center gap-1.5 text-slate-400 font-label-sm text-label-sm mb-1">
              <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
                Portal
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-teal-700 font-semibold">My Appointments</span>
            </nav>
            <h1 className="font-headline-lg text-headline-lg text-slate-900 font-bold tracking-tight">
              My Appointments
            </h1>
            <p className="font-body-md text-slate-500 mt-0.5">
              Manage your upcoming visits and review your appointment history.
            </p>
          </div>
          <div>
            <Link
              href="/doctors"
              className="bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>

        {/* STATE 1: LOADING SKELETONS */}
        {isLoadingAppointments && (
          <div className="flex flex-col gap-space-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex items-center gap-space-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-6 w-12 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-space-sm">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-space-md flex-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-slate-200 rounded" />
                      <div className="h-3 w-64 bg-slate-100 rounded" />
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="w-24 h-9 bg-slate-200 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATE 2: API ERROR STATE */}
        {!isLoadingAppointments && appointmentsError && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-xl flex flex-col items-center justify-center text-center max-w-lg mx-auto my-12">
            <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-space-md shadow-sm">
              <span className="material-symbols-outlined text-[40px]">error_outline</span>
            </div>
            <h3 className="font-headline-md text-slate-900 font-semibold">
              Unable to load appointments
            </h3>
            <p className="font-body-md text-slate-500 mt-2 mb-space-lg">
              {appointmentsError}
            </p>
            <button
              type="button"
              onClick={loadAppointments}
              className="bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold px-6 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* STATE 3: EMPTY STATE (NO APPOINTMENTS YET) */}
        {!isLoadingAppointments && !appointmentsError && patientAppointments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-xl flex flex-col items-center justify-center text-center max-w-lg mx-auto my-12">
            <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-space-md shadow-sm">
              <span className="material-symbols-outlined text-[40px]">calendar_month</span>
            </div>
            <h3 className="font-headline-md text-slate-900 font-semibold">No appointments yet</h3>
            <p className="font-body-md text-slate-500 mt-2 mb-space-lg">
              Your appointments will appear here once you book your first visit.
            </p>
            <Link
              href="/doctors"
              className="bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold px-6 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">person_search</span>
              <span>Find a Doctor</span>
            </Link>
          </div>
        )}

        {/* STATE 4: FILTER EMPTY STATE (NO MATCHES) */}
        {!isLoadingAppointments &&
          !appointmentsError &&
          patientAppointments.length > 0 &&
          filteredAppointments.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-xl flex flex-col items-center justify-center text-center max-w-lg mx-auto my-12">
              <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-space-md shadow-sm">
                <span className="material-symbols-outlined text-[40px]">filter_list_off</span>
              </div>
              <h3 className="font-headline-md text-slate-900 font-semibold">
                No matching appointments
              </h3>
              <p className="font-body-md text-slate-500 mt-2 mb-space-lg">
                Try adjusting your filters or search query to find your appointment record.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-slate-100 hover:bg-slate-200/80 text-teal-700 font-label-md text-label-md font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                <span>Clear Filters</span>
              </button>
            </div>
          )}

        {/* STATE 5: STANDARD VIEW WITH DATA */}
        {!isLoadingAppointments && !appointmentsError && patientAppointments.length > 0 && (
          <div className="flex flex-col gap-space-lg">
            {/* 3-COLUMN METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {/* Card 1: Upcoming Visits */}
              <div className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <span className="material-symbols-outlined text-[24px]">calendar_today</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Upcoming Visits
                  </span>
                  <span className="font-headline-lg text-slate-900 font-bold leading-tight mt-0.5">
                    {upcomingCount}
                  </span>
                  <span className="font-body-sm text-slate-500 mt-1">
                    {nextAppointment
                      ? `Next visit on ${formatShortDateDisplay(nextAppointment.startTime || nextAppointment.appointmentDate)}`
                      : "No upcoming visits"}
                  </span>
                </div>
              </div>

              {/* Card 2: Pending Requests */}
              <div className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <span className="material-symbols-outlined text-[24px]">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Pending Requests
                  </span>
                  <span className="font-headline-lg text-slate-900 font-bold leading-tight mt-0.5">
                    {pendingCount}
                  </span>
                  <span className="font-body-sm text-slate-500 mt-1">
                    Awaiting clinic confirmation
                  </span>
                </div>
              </div>

              {/* Card 3: Completed Visits */}
              <div className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-slate-400 uppercase tracking-wider font-semibold text-xs">
                    Completed Visits
                  </span>
                  <span className="font-headline-lg text-slate-900 font-bold leading-tight mt-0.5">
                    {completedCount}
                  </span>
                  <span className="font-body-sm text-slate-500 mt-1">
                    Past medical consultations
                  </span>
                </div>
              </div>
            </div>

            {/* HIGHLIGHTED NEXT APPOINTMENT BANNER */}
            {nextAppointment && (
              <div className="relative bg-white rounded-xl shadow-sm border border-slate-200/80 p-space-lg overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-teal-50/60 rounded-full pointer-events-none" />
                <div className="flex items-center justify-between flex-wrap gap-2 mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-teal-800 font-label-sm text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                      NEXT APPOINTMENT
                    </span>
                    <span className="font-label-sm text-slate-400 font-mono text-xs">
                      #{nextAppointment.id}
                    </span>
                  </div>

                  {(() => {
                    const badge = getStatusBadge(nextAppointment.status);
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
                  <div className="flex items-start md:items-center gap-space-md">
                    <div className="w-16 h-16 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                      {getDoctorInitials(nextAppointment.doctor)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-headline-sm text-slate-900 font-bold">
                          Dr.{" "}
                          {nextAppointment.doctor?.user
                            ? `${nextAppointment.doctor.user.firstName} ${nextAppointment.doctor.user.lastName}`
                            : "Doctor"}
                        </h3>
                        {nextAppointment.doctor?.specialization?.name && (
                          <span className="font-label-sm text-teal-800 font-semibold bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-md text-xs">
                            {nextAppointment.doctor.specialization.name}
                          </span>
                        )}
                      </div>
                      {nextAppointment.reason && (
                        <p className="font-body-md text-slate-600 mt-0.5">
                          {nextAppointment.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-space-md text-slate-900 font-label-md text-label-md font-semibold mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-teal-700">
                            event
                          </span>
                          <span>
                            {formatFullDateDisplay(
                              nextAppointment.startTime || nextAppointment.appointmentDate
                            )}
                          </span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-teal-700">
                            schedule
                          </span>
                          <span>
                            {formatUtcTimeDisplay(nextAppointment.startTime)} –{" "}
                            {formatUtcTimeDisplay(nextAppointment.endTime)}
                          </span>
                        </div>
                        {nextAppointment.doctor?.consultationFee !== undefined && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 font-normal">Fee:</span>
                              <span>₹{nextAppointment.doctor.consultationFee}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/appointments/${nextAppointment.id}`}
                      className="bg-slate-100 hover:bg-slate-200/80 text-teal-800 font-label-md text-label-md font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TABS & FILTER BAR */}
            {filteredAppointments.length > 0 || searchQuery || statusFilter !== "ALL" || dateFilter !== "ALL" || activeTab !== "ALL" ? (
              <div className="flex flex-col gap-space-md bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80">
                {/* Tabs */}
                <div className="flex items-center gap-space-sm border-b border-slate-100 pb-space-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ALL");
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 font-label-md text-label-md font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === "ALL"
                        ? "text-teal-700 border-teal-600"
                        : "text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    <span>All Appointments</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {allCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("UPCOMING");
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 font-label-md text-label-md font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === "UPCOMING"
                        ? "text-teal-700 border-teal-600"
                        : "text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    <span>Upcoming</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {upcomingCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("PAST");
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 font-label-md text-label-md font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === "PAST"
                        ? "text-teal-700 border-teal-600"
                        : "text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    <span>Past</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {pastCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("CANCELLED");
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 font-label-md text-label-md font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === "CANCELLED"
                        ? "text-teal-700 border-teal-600"
                        : "text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    <span>Cancelled</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {cancelledCount}
                    </span>
                  </button>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by doctor or specialization..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 font-body-sm text-body-sm rounded-xl border border-slate-200/80 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
                    />
                  </div>
                  <div className="flex items-center flex-wrap gap-space-sm">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 text-slate-900 font-label-md text-label-md py-2 px-3 rounded-xl border border-slate-200/80 outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>

                    <select
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 text-slate-900 font-label-md text-label-md py-2 px-3 rounded-xl border border-slate-200/80 outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="ALL">All Dates</option>
                      <option value="TODAY">Today</option>
                      <option value="THIS_WEEK">This Week</option>
                      <option value="THIS_MONTH">This Month</option>
                    </select>

                    <select
                      value={sortOption}
                      onChange={(e) => {
                        setSortOption(e.target.value as "NEWEST" | "OLDEST");
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 text-slate-900 font-label-md text-label-md py-2 px-3 rounded-xl border border-slate-200/80 outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="NEWEST">Newest First</option>
                      <option value="OLDEST">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {/* APPOINTMENT CARDS LIST */}
            {filteredAppointments.length > 0 && (
              <div className="flex flex-col gap-space-sm">
                {paginatedAppointments.map((app) => {
                  const badge = getStatusBadge(app.status);

                  return (
                    <div
                      key={app.id}
                      className="bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-space-md"
                    >
                      <div className="flex items-start md:items-center gap-space-md">
                        <div className="w-14 h-14 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                          {getDoctorInitials(app.doctor)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-headline-sm text-slate-900 font-bold">
                              Dr.{" "}
                              {app.doctor?.user
                                ? `${app.doctor.user.firstName} ${app.doctor.user.lastName}`
                                : "Doctor"}
                            </span>
                            {app.doctor?.specialization?.name && (
                              <span className="text-slate-500 font-body-sm text-body-sm">
                                — {app.doctor.specialization.name}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                              {badge.label}
                            </span>
                          </div>

                          {app.reason && (
                            <p className="font-body-md text-slate-600 mt-0.5">{app.reason}</p>
                          )}

                          <div className="flex items-center gap-space-md text-slate-500 font-body-sm text-body-sm mt-1.5 flex-wrap">
                            <span className="font-mono text-slate-400">#{app.id}</span>
                            <span>•</span>
                            <span className="text-slate-900 font-semibold">
                              {formatFullDateDisplay(app.startTime || app.appointmentDate)}
                            </span>
                            <span>•</span>
                            <span>
                              {formatUtcTimeDisplay(app.startTime)} –{" "}
                              {formatUtcTimeDisplay(app.endTime)}
                            </span>
                            {app.doctor?.consultationFee !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-slate-900 font-semibold">
                                  ₹{app.doctor.consultationFee}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Link
                          href={`/appointments/${app.id}`}
                          className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-label-md text-label-md font-medium px-4 py-2 rounded-xl transition"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {filteredAppointments.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-white p-space-md rounded-xl shadow-sm border border-slate-200/80">
                <span className="font-body-sm text-slate-500">
                  Showing {startIndex + 1} to {endIndex} of {filteredAppointments.length} appointments
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center transition ${
                        currentPage === page
                          ? "bg-teal-600 text-white shadow-sm"
                          : "hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // VIEW B: SCREEN #3 APPOINTMENT DATE & TIME BOOKING FLOW (When doctorId exists)
  // =========================================================
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
                  {selectedDateStr}
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
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(railStartDate.getTime());
                d.setUTCDate(d.getUTCDate() + i);
                const dateStr = formatUtcDateToYmd(d);
                const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                const dayNum = String(d.getUTCDate()).padStart(2, "0");
                const todayMidnight = getTodayUtcMidnight();
                const isPast = d.getTime() < todayMidnight.getTime();
                const isToday = dateStr === formatUtcDateToYmd(todayMidnight);
                const isSelected = dateStr === selectedDateStr;

                if (isPast) {
                  return (
                    <div
                      key={dateStr}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 opacity-45 cursor-not-allowed select-none border border-slate-100"
                    >
                      <span className="font-label-sm text-label-sm text-slate-400 uppercase">
                        {dayName}
                      </span>
                      <span className="font-headline-sm text-headline-sm font-semibold text-slate-400 mt-1">
                        {dayNum}
                      </span>
                      <span className="text-[10px] font-body-sm text-slate-400 mt-0.5">
                        Passed
                      </span>
                    </div>
                  );
                }

                if (isSelected) {
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDateStr(dateStr)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/25 transition-all"
                    >
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[9px] font-label-sm font-bold mb-0.5">
                          TODAY
                        </span>
                      )}
                      <span className="font-label-sm text-label-sm text-teal-100 uppercase">
                        {dayName}
                      </span>
                      <span className="font-headline-sm text-headline-sm font-bold text-white mt-1">
                        {dayNum}
                      </span>
                      <span className="text-[10px] font-label-sm text-teal-100 font-semibold mt-0.5">
                        Selected
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(dateStr)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group border border-slate-200/60 relative"
                  >
                    {isToday && (
                      <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-white text-[9px] font-label-sm font-bold">
                        TODAY
                      </span>
                    )}
                    <span className="font-label-sm text-label-sm text-slate-500 group-hover:text-teal-700 uppercase mt-0.5">
                      {dayName}
                    </span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-slate-900 mt-1">
                      {dayNum}
                    </span>
                    <span className="text-[10px] font-label-sm text-teal-700 font-medium mt-0.5">
                      {isLoadingSlots ? "..." : "Available"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Time Slots Section */}
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
            </div>

            {isLoadingSlots ? (
              <div className="animate-pulse space-y-6">
                <div className="h-10 bg-slate-100 rounded-lg w-full" />
                <div className="h-10 bg-slate-100 rounded-lg w-full" />
              </div>
            ) : slotsError ? (
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
            ) : slots.filter((s) => s.available).length === 0 ? (
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
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {slots
                  .filter((s) => s.available)
                  .map((slot) => {
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
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        )}
                        <span>{timeText}</span>
                      </button>
                    );
                  })}
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
                <span className="font-label-md text-teal-700 font-semibold text-right">
                  {selectedSlot
                    ? `${formatUtcTimeDisplay(selectedSlot.startTime)} – ${formatUtcTimeDisplay(selectedSlot.endTime)}`
                    : "Select a time slot"}
                </span>
              </div>

              <div className="p-space-md rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between mt-1">
                <span className="font-label-sm text-slate-600 font-medium">
                  Consultation Fee
                </span>
                <span className="font-headline-sm text-slate-900 font-bold">
                  ₹{doctor?.consultationFee || 0}
                </span>
              </div>
            </div>

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
            Loading appointments...
          </div>
        }
      >
        <AppointmentBookingContent />
      </Suspense>
    </PatientLayout>
  );
}
