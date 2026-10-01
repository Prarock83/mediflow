"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { Prescription, fetchPatientPrescriptions } from "@/lib/api";

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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDoctorInitials(rx: Prescription): string {
  if (rx.doctor?.user?.firstName && rx.doctor?.user?.lastName) {
    return `${rx.doctor.user.firstName.charAt(0)}${rx.doctor.user.lastName.charAt(0)}`.toUpperCase();
  }
  return "DR";
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadPrescriptions = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchPatientPrescriptions()
      .then((data) => {
        setPrescriptions(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch prescriptions:", err);
        setError("We couldn't retrieve your prescriptions right now. Please try again.");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  // Dynamic Summary Metrics
  const totalPrescriptions = prescriptions.length;
  const totalMedications = prescriptions.reduce(
    (acc, rx) => acc + (rx.items?.length || 0),
    0
  );

  // Client-side search
  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    if (rx.instructions?.toLowerCase().includes(q)) {
      return true;
    }

    if (rx.doctor?.user) {
      const docName = `${rx.doctor.user.firstName} ${rx.doctor.user.lastName}`.toLowerCase();
      const specName = rx.doctor.specialization?.name?.toLowerCase() || "";
      if (docName.includes(q) || specName.includes(q)) {
        return true;
      }
    }

    if (rx.items && rx.items.length > 0) {
      const itemMatch = rx.items.some((item) => {
        const nameMatch = item.medicationName?.toLowerCase().includes(q);
        const dosageMatch = item.dosage?.toLowerCase().includes(q);
        const freqMatch = item.frequency?.toLowerCase().includes(q);
        const durationMatch = item.duration?.toLowerCase().includes(q);
        return nameMatch || dosageMatch || freqMatch || durationMatch;
      });
      if (itemMatch) return true;
    }

    return false;
  });

  // Client-side sorting
  const sortedPrescriptions = [...filteredPrescriptions].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (sortOrder === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Client-side pagination (5 per page)
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(sortedPrescriptions.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedPrescriptions.length);
  const currentPrescriptions = sortedPrescriptions.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-xl pb-12">
        {/* Breadcrumb & Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors cursor-pointer">
                Portal
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-semibold">Prescriptions</span>
            </nav>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Prescriptions
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              View and manage your prescribed medications in one place.
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col gap-space-xl animate-pulse">
            {/* Skeleton Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div className="flex flex-col gap-2.5 w-3/4">
                  <div className="h-3 bg-surface-container-high rounded w-28" />
                  <div className="h-8 bg-surface-container-high rounded w-16" />
                  <div className="h-3 bg-surface-container-high rounded w-48" />
                </div>
                <div className="w-14 h-14 rounded-xl bg-surface-container-high shrink-0" />
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div className="flex flex-col gap-2.5 w-3/4">
                  <div className="h-3 bg-surface-container-high rounded w-28" />
                  <div className="h-8 bg-surface-container-high rounded w-16" />
                  <div className="h-3 bg-surface-container-high rounded w-48" />
                </div>
                <div className="w-14 h-14 rounded-xl bg-surface-container-high shrink-0" />
              </div>
            </div>

            {/* Skeleton Search Bar */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="h-10 bg-surface-container-high rounded-lg w-full max-w-xl" />
              <div className="h-8 bg-surface-container-high rounded-full w-32 hidden lg:block" />
            </div>

            {/* Skeleton Cards */}
            <div className="flex flex-col gap-space-lg">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl shadow-sm border border-slate-200/80 p-space-lg flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high" />
                      <div className="flex flex-col gap-2">
                        <div className="h-5 bg-surface-container-high rounded w-40" />
                        <div className="h-3 bg-surface-container-high rounded w-56" />
                      </div>
                    </div>
                    <div className="h-9 bg-surface-container-high rounded-lg w-36" />
                  </div>
                  <div className="h-14 bg-surface-container rounded-lg" />
                  <div className="h-10 bg-surface-container-high rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-surface-container-lowest border border-slate-200/80 py-20 px-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-20 h-20 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-space-md">
              <span className="material-symbols-outlined text-[42px]">error_outline</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
              Unable to load prescriptions
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-lg">
              We couldn't retrieve your prescriptions right now. Please try again.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadPrescriptions}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors font-label-md text-label-md font-semibold shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Try Again</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md font-semibold"
              >
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        )}

        {/* ZERO PRESCRIPTIONS EMPTY STATE */}
        {!isLoading && !error && totalPrescriptions === 0 && (
          <div className="bg-surface-container-lowest border border-slate-200/80 py-20 px-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-20 h-20 rounded-2xl bg-surface-container text-primary flex items-center justify-center mb-space-md">
              <span className="material-symbols-outlined text-[42px]">prescriptions</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
              No prescriptions yet
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-lg">
              Prescriptions issued by your doctors will appear here once they are added to your MediFlow profile.
            </p>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors font-label-md text-label-md font-semibold shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              <span>Find a Doctor</span>
            </Link>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        {!isLoading && !error && totalPrescriptions > 0 && (
          <>
            {/* Summary Metrics (2-Card Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              {/* Metric 1 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                    Prescriptions
                  </span>
                  <span className="font-data-metric text-data-metric text-on-surface mt-1">
                    {totalPrescriptions}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Prescription records available to you
                  </span>
                </div>
                <div className="w-14 h-14 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[32px]">prescriptions</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                    Medications
                  </span>
                  <span className="font-data-metric text-data-metric text-on-surface mt-1">
                    {totalMedications}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Total prescribed medications
                  </span>
                </div>
                <div className="w-14 h-14 rounded-xl bg-surface-container text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[32px]">pill</span>
                </div>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row items-center justify-between gap-space-md">
              <div className="relative w-full lg:max-w-xl flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by medication name, dosage, frequency, or instructions..."
                  className="w-full pl-11 pr-4 py-2 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex items-center justify-between lg:justify-end gap-space-md w-full lg:w-auto">
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-secondary-container font-label-sm text-label-sm font-semibold tracking-wide">
                  {filteredPrescriptions.length} {filteredPrescriptions.length === 1 ? "Prescription Found" : "Prescriptions Found"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as "newest" | "oldest");
                      setCurrentPage(1);
                    }}
                    className="bg-surface-container-low font-label-sm text-label-sm text-on-surface py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer border border-slate-200/60"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FILTER-EMPTY STATE */}
            {sortedPrescriptions.length === 0 ? (
              <div className="bg-surface-container-lowest border border-slate-200/80 py-20 px-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
                <div className="w-20 h-20 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center mb-space-md">
                  <span className="material-symbols-outlined text-[42px]">search_off</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
                  No matching prescriptions
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-lg">
                  Try adjusting your search or clearing your filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors font-label-md text-label-md font-semibold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                  <span>Clear Filters</span>
                </button>
              </div>
            ) : (
              /* PRESCRIPTION LIST */
              <div className="flex flex-col gap-space-lg">
                {currentPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="bg-surface-container-lowest rounded-xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col transition-all hover:shadow-md"
                  >
                    {/* Card Header */}
                    <div className="p-space-lg bg-surface-container-low/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                              {formatFullDateDisplay(rx.createdAt)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                              {rx.items?.length || 0} {rx.items?.length === 1 ? "Medication" : "Medications"}
                            </span>
                          </div>

                          {/* Display doctor info if returned by API */}
                          {rx.doctor?.user && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold flex items-center justify-center">
                                {getDoctorInitials(rx)}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Prescribed by Dr. {rx.doctor.user.firstName} {rx.doctor.user.lastName}
                                {rx.doctor.specialization?.name ? `, MD • ${rx.doctor.specialization.name}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/prescriptions/${rx.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
                      >
                        <span>View Prescription</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>

                    {/* Card Content / Medication Items */}
                    <div className="p-space-lg flex flex-col gap-space-md">
                      <div className="flex flex-col gap-2">
                        {rx.items && rx.items.length > 0 ? (
                          rx.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-lg bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-2 border border-slate-200/50"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                                  medication
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                                    {item.medicationName}
                                  </span>
                                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                                    {item.dosage}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 font-body-sm text-body-sm text-on-surface-variant pl-8 md:pl-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                                  <span>{item.frequency}</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-medium text-on-surface">
                                  <span className="material-symbols-outlined text-[16px]">timelapse</span>
                                  <span>{item.duration}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm italic">
                            No medication items specified.
                          </div>
                        )}
                      </div>

                      {/* Instructions */}
                      {rx.instructions && (
                        <div className="p-3 rounded-lg bg-surface-container text-on-surface font-body-sm text-body-sm flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                            info
                          </span>
                          <div>
                            <span className="font-semibold text-on-surface">Instructions:</span>{" "}
                            {rx.instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* PAGINATION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-space-sm bg-surface-container-lowest px-space-lg rounded-xl shadow-sm border border-slate-200/80">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Showing <span className="font-semibold text-on-surface">{startIndex + 1}–{endIndex}</span> of{" "}
                    <span className="font-semibold text-on-surface">{sortedPrescriptions.length}</span> prescriptions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous Page"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant transition-colors ${
                        currentPage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-container text-on-surface cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-label-md text-label-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-primary text-on-primary font-semibold shadow-sm"
                            : "text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      aria-label="Next Page"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant transition-colors ${
                        currentPage === totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-container text-on-surface cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PatientLayout>
  );
}
