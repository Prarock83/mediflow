"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { MedicalRecord, fetchPatientMedicalRecords } from "@/lib/api";

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

function isRecentRecord(recordDateStr: string): boolean {
  if (!recordDateStr) return false;
  const recordTime = new Date(recordDateStr).getTime();
  if (isNaN(recordTime)) return false;
  const now = Date.now();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  return now - recordTime <= sixtyDaysMs;
}

function passesDateFilter(recordDateStr: string, filter: string): boolean {
  if (filter === "all") return true;
  if (!recordDateStr) return false;

  const recDate = new Date(recordDateStr);
  const now = new Date();

  const recTime = recDate.getTime();
  const nowTime = now.getTime();

  if (isNaN(recTime)) return true;

  if (filter === "today") {
    return (
      recDate.getUTCFullYear() === now.getUTCFullYear() &&
      recDate.getUTCMonth() === now.getUTCMonth() &&
      recDate.getUTCDate() === now.getUTCDate()
    );
  }

  if (filter === "week") {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Math.abs(nowTime - recTime) <= sevenDaysMs;
  }

  if (filter === "month") {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Math.abs(nowTime - recTime) <= thirtyDaysMs;
  }

  if (filter === "year") {
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    return Math.abs(nowTime - recTime) <= yearMs;
  }

  return true;
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadRecords = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchPatientMedicalRecords()
      .then((data) => {
        setRecords(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load medical records:", err);
        setError("We couldn't retrieve your medical records right now. Please try again.");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Derived metrics
  const totalRecords = records.length;
  const recentRecordsCount = records.filter((r) => isRecentRecord(r.recordDate)).length;

  // Filter & Search
  const filteredRecords = records.filter((rec) => {
    // Search filter on title and description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = rec.title?.toLowerCase().includes(q);
      const descMatch = rec.description?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) {
        return false;
      }
    }

    // Date filter
    if (!passesDateFilter(rec.recordDate, dateFilter)) {
      return false;
    }

    return true;
  });

  // Sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const timeA = new Date(a.recordDate || a.createdAt).getTime();
    const timeB = new Date(b.recordDate || b.createdAt).getTime();
    if (sortOrder === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedRecords.length);
  const currentRecords = sortedRecords.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-md">
        {/* Header Section with Breadcrumbs */}
        <div className="flex flex-col gap-space-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <Link href="/dashboard" className="hover:text-on-surface transition-colors cursor-pointer">
              Portal
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-semibold text-primary">Medical Records</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pt-space-xs">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Medical Records
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Keep track of your medical history and clinical consultations in one place.
              </p>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col gap-space-md">
            {/* Overview Metric Cards Skeletons (2-column) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-surface-container shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3 w-28 bg-surface-container rounded" />
                  <div className="h-7 w-12 bg-surface-container rounded" />
                  <div className="h-3 w-48 bg-surface-container-low rounded" />
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-surface-container shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3 w-28 bg-surface-container rounded" />
                  <div className="h-7 w-12 bg-surface-container rounded" />
                  <div className="h-3 w-40 bg-surface-container-low rounded" />
                </div>
              </div>
            </div>

            {/* Skeleton List Items */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg"
              >
                <div className="flex items-start gap-space-md flex-1 w-full">
                  <div className="w-12 h-12 rounded-xl bg-surface-container shrink-0" />
                  <div className="flex flex-col gap-space-sm flex-1">
                    <div className="flex items-center gap-space-sm">
                      <div className="h-5 bg-surface-container rounded-md w-48" />
                      <div className="h-4 bg-surface-container-high rounded-full w-24" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="h-3.5 bg-surface-container rounded w-full" />
                      <div className="h-3.5 bg-surface-container rounded w-3/4" />
                    </div>
                  </div>
                </div>
                <div className="h-10 bg-surface-container rounded-lg w-full md:w-32 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* API ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-surface-container-lowest py-space-xl px-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center text-error mb-space-md">
              <span className="material-symbols-outlined text-[36px]">error_outline</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Unable to load medical records
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-md">
              We couldn't retrieve your medical records right now. Please try again.
            </p>
            <div className="mt-space-lg flex items-center gap-space-sm">
              <button
                type="button"
                onClick={loadRecords}
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* ZERO RECORDS EMPTY STATE */}
        {!isLoading && !error && totalRecords === 0 && (
          <div className="bg-surface-container-lowest py-space-xl px-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-space-md shadow-inner">
              <span className="material-symbols-outlined text-[36px]">folder_off</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              No medical records yet
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-md">
              Your medical records will appear here once they are added to your MediFlow profile.
            </p>
            <div className="mt-space-lg">
              <Link
                href="/doctors"
                className="inline-flex items-center gap-space-xs px-space-lg py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                <span>Book an Appointment</span>
              </Link>
            </div>
          </div>
        )}

        {/* MAIN RECORDS CONTENT */}
        {!isLoading && !error && totalRecords > 0 && (
          <>
            {/* Overview Metric Cards (2-column: Total Records & Recent Records) */}
            <section aria-label="Records Summary" className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-start gap-space-md transition hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">folder_special</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Total Records
                  </span>
                  <span className="font-data-metric text-data-metric text-on-surface tracking-tight mt-0.5">
                    {totalRecords}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    All archived consultations & clinical summaries
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 flex items-start gap-space-md transition hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Recent Records
                  </span>
                  <span className="font-data-metric text-data-metric text-on-surface tracking-tight mt-0.5">
                    {recentRecordsCount}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Added in the last 60 days
                  </p>
                </div>
              </div>
            </section>

            {/* Search & Filter Controls */}
            <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-lg text-on-surface flex-1 min-w-[280px]">
                <span className="material-symbols-outlined text-[20px] text-outline">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search medical records by title or description..."
                  className="bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-space-sm shrink-0">
                <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-lg text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-outline">calendar_month</span>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent font-label-md text-label-md text-on-surface focus:outline-none cursor-pointer pr-space-xs py-1"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">Past Year</option>
                  </select>
                </div>

                <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-lg text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-outline">sort</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as "newest" | "oldest");
                      setCurrentPage(1);
                    }}
                    className="bg-transparent font-label-md text-label-md text-on-surface focus:outline-none cursor-pointer pr-space-xs py-1"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div className="px-space-md py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold whitespace-nowrap">
                  {filteredRecords.length} {filteredRecords.length === 1 ? "Record Found" : "Records Found"}
                </div>
              </div>
            </section>

            {/* FILTER-EMPTY STATE */}
            {sortedRecords.length === 0 ? (
              <div className="bg-surface-container-lowest py-space-xl px-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-space-md">
                  <span className="material-symbols-outlined text-[36px]">search_off</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  No matching records
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-md">
                  Try adjusting your search or filters.
                </p>
                <div className="mt-space-lg">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    <span>Clear Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              /* RECORDS LIST */
              <div className="flex flex-col gap-space-md">
                {currentRecords.map((record) => (
                  <article
                    key={record.id}
                    className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg"
                  >
                    <div className="flex items-start gap-space-md flex-1">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-[24px]">folder_special</span>
                      </div>
                      <div className="flex flex-col gap-space-xs min-w-0">
                        <div className="flex flex-wrap items-center gap-space-sm">
                          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                            {record.title}
                          </h2>
                          <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                            {formatFullDateDisplay(record.recordDate)}
                          </span>
                        </div>
                        {record.description && (
                          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                            {record.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 w-full md:w-auto flex md:flex-col justify-end">
                      <Link
                        href={`/medical-records/${record.id}`}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg transition-colors shadow-xs"
                      >
                        <span>View Record</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                ))}

                {/* PAGINATION */}
                <nav
                  aria-label="Pagination"
                  className="bg-surface-container-lowest px-space-lg py-space-md rounded-xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-space-md mt-space-xs"
                >
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Showing <span className="font-semibold text-on-surface">{startIndex + 1}–{endIndex}</span> of{" "}
                    <span className="font-semibold text-on-surface">{sortedRecords.length}</span> records
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous Page"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-outline transition-colors ${
                        currentPage === 1
                          ? "cursor-not-allowed opacity-50"
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
                            ? "font-semibold bg-primary-container text-on-primary-container shadow-xs"
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
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-outline transition-colors ${
                        currentPage === totalPages
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-surface-container text-on-surface cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </PatientLayout>
  );
}
