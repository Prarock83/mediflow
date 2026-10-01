"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import {
  DoctorProfile,
  DoctorPagination,
  fetchDoctors,
  DoctorQueryParams,
} from "@/lib/api";

interface SpecializationOption {
  id: string;
  name: string;
}

export default function FindDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [pagination, setPagination] = useState<DoctorPagination>({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>("");
  const [selectedExperience, setSelectedExperience] = useState<string>("");
  const [selectedMaxFee, setSelectedMaxFee] = useState<string>("");
  const [selectedSort, setSelectedSort] = useState<"newest" | "experience" | "consultationFee">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Derived Specializations collected from backend doctor profiles
  const [specializationsMap, setSpecializationsMap] = useState<Map<string, string>>(new Map());

  // Helper to extract doctor initials for clean avatar placeholder
  const getDoctorInitials = (doc: DoctorProfile) => {
    if (doc.user?.firstName && doc.user?.lastName) {
      return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
    }
    if (doc.user?.firstName) {
      return doc.user.firstName.slice(0, 2).toUpperCase();
    }
    return "DR";
  };

  // Main data fetch callback
  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const queryParams: DoctorQueryParams = {
      page: currentPage,
      limit: 6,
      sort: selectedSort,
    };

    if (activeSearch.trim()) {
      queryParams.search = activeSearch.trim();
    }
    if (selectedSpecializationId) {
      queryParams.specializationId = selectedSpecializationId;
    }
    if (selectedExperience) {
      queryParams.minExperience = Number(selectedExperience);
    }
    if (selectedMaxFee) {
      queryParams.maxFee = Number(selectedMaxFee);
    }

    try {
      const response = await fetchDoctors(queryParams);
      setDoctors(response.data);
      setPagination(response.pagination);

      // Collect unique specializations dynamically from backend responses
      setSpecializationsMap((prevMap) => {
        const nextMap = new Map(prevMap);
        response.data.forEach((doc) => {
          if (doc.specialization?.id && doc.specialization?.name) {
            nextMap.set(doc.specialization.id, doc.specialization.name);
          }
        });
        return nextMap;
      });

      setIsLoading(false);
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
      setError(err?.message || "Something went wrong while loading the doctor directory. Please verify your connection or try again.");
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedSort,
    activeSearch,
    selectedSpecializationId,
    selectedExperience,
    selectedMaxFee,
  ]);

  // Initial load & query trigger
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Search Submit
  const handleSearchSubmit = () => {
    setCurrentPage(1);
    setActiveSearch(searchInputValue);
  };

  // Clear Search Input
  const handleClearSearchInput = () => {
    setSearchInputValue("");
    setActiveSearch("");
    setCurrentPage(1);
  };

  // Filter Change Handlers
  const handleSpecializationChange = (specId: string) => {
    setSelectedSpecializationId(specId);
    setCurrentPage(1);
  };

  const handleExperienceChange = (exp: string) => {
    setSelectedExperience(exp);
    setCurrentPage(1);
  };

  const handleMaxFeeChange = (fee: string) => {
    setSelectedMaxFee(fee);
    setCurrentPage(1);
  };

  const handleSortChange = (sortVal: "newest" | "experience" | "consultationFee") => {
    setSelectedSort(sortVal);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Reset/Clear All Filters
  const handleClearFilters = () => {
    setSearchInputValue("");
    setActiveSearch("");
    setSelectedSpecializationId("");
    setSelectedExperience("");
    setSelectedMaxFee("");
    setSelectedSort("newest");
    setCurrentPage(1);
  };

  // Calculate pagination label bounds
  const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const derivedSpecializations: SpecializationOption[] = Array.from(specializationsMap.entries()).map(
    ([id, name]) => ({ id, name })
  );

  return (
    <PatientLayout>
      <div className="flex flex-col w-full gap-space-lg pb-12 max-w-7xl mx-auto">
        {/* TOP BREADCRUMB & CONTEXT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 font-label-sm text-label-sm mb-1">
              <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
                Portal
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-teal-700 font-medium">Find Doctors</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-slate-900 tracking-tight">
              Find a Doctor
            </h1>
            <p className="font-body-md text-body-md text-slate-500 mt-0.5">
              Find the right doctor for your healthcare needs.
            </p>
          </div>
        </div>

        {/* SEARCH BAR COMPONENT */}
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-sm shadow-slate-900/5 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex-1 flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[22px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                className="w-full pl-12 pr-10 py-3 bg-transparent text-slate-800 placeholder:text-slate-400 font-body-md text-body-md focus:outline-none"
                placeholder="Search doctors by name, specialty or license..."
              />
              {searchInputValue.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearchInput}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label="Clear Search Input"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto px-2 pb-1 sm:p-0">
              <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-label-sm text-[11px] px-2">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono shadow-xs border border-slate-200">
                  ↵ Enter
                </kbd>
              </div>
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-label-md text-label-md font-semibold rounded-xl shadow-sm transition-all duration-150"
              >
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* FILTER CONTROLS BAR */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm shadow-slate-900/5 border border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-center">
            {/* Specialization Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Specialization
              </label>
              <div className="relative">
                <select
                  value={selectedSpecializationId}
                  onChange={(e) => handleSpecializationChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-label-md text-label-md py-2.5 pl-3 pr-8 rounded-xl border border-slate-200/60 focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">All Specialties</option>
                  {derivedSpecializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Experience Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Experience
              </label>
              <div className="relative">
                <select
                  value={selectedExperience}
                  onChange={(e) => handleExperienceChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-label-md text-label-md py-2.5 pl-3 pr-8 rounded-xl border border-slate-200/60 focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Any Experience</option>
                  <option value="5">5+ years</option>
                  <option value="10">10+ years</option>
                  <option value="15">15+ years</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Max Fee Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Max Consultation Fee
              </label>
              <div className="relative">
                <select
                  value={selectedMaxFee}
                  onChange={(e) => handleMaxFeeChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-label-md text-label-md py-2.5 pl-3 pr-8 rounded-xl border border-slate-200/60 focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Any Fee</option>
                  <option value="100">Up to ₹100</option>
                  <option value="150">Up to ₹150</option>
                  <option value="200">Up to ₹200</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Sort By Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Sort By
              </label>
              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-label-md text-label-md py-2.5 pl-3 pr-8 rounded-xl border border-slate-200/60 focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="experience">Experience (High to Low)</option>
                  <option value="consultationFee">Consultation Fee (Low to High)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                  sort
                </span>
              </div>
            </div>

            {/* Reset / Filter Meta */}
            <div className="flex flex-row sm:flex-col justify-between sm:justify-end gap-1 h-full sm:pt-4">
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-label-md text-xs font-semibold transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Clear Filters</span>
              </button>
              <span className="font-label-sm text-xs self-center sm:self-start sm:px-3 text-slate-400">
                Showing <span className="font-semibold text-slate-700">{pagination.total}</span> available
              </span>
            </div>
          </div>
        </div>

        {/* MAIN DIRECTORY VIEW STATES */}
        {isLoading ? (
          /* SKELETON LOADING STATE */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between border border-slate-200/80 animate-pulse"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <div className="h-2.5 bg-slate-100 rounded w-full" />
                    <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                  </div>
                </div>
                <div className="pt-4 mt-6 grid grid-cols-2 gap-2 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <div className="h-8 bg-slate-200 rounded-lg" />
                  <div className="h-8 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* ERROR STATE */
          <div className="bg-white rounded-3xl p-10 text-center shadow-xs border border-slate-200/80 max-w-lg mx-auto my-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">cloud_off</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-slate-900 font-semibold mb-1">
              Unable to load doctors
            </h3>
            <p className="font-body-md text-body-md text-slate-500 mb-6">{error}</p>
            <button
              type="button"
              onClick={loadDoctors}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-label-md text-label-md font-semibold rounded-xl transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        ) : doctors.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-slate-200/80 flex flex-col items-center justify-center max-w-xl mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
              <span className="material-symbols-outlined text-[32px]">person_search</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-slate-900 font-semibold mb-1">
              No doctors found
            </h3>
            <p className="font-body-md text-body-md text-slate-500 max-w-md mb-6">
              We couldn&apos;t find any healthcare professionals matching your active filter criteria. Try adjusting your specialty or fee range.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              <span>Clear Filters &amp; Search Again</span>
            </button>
          </div>
        ) : (
          /* LIVE DIRECTORY GRID */
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc) => {
                const doctorName = doc.user
                  ? `Dr. ${doc.user.firstName} ${doc.user.lastName}`
                  : `Doctor #${doc.id}`;
                const specializationName = doc.specialization?.name || "Specialist";
                const bioText =
                  doc.bio ||
                  "Dedicated healthcare specialist committed to providing high quality and compassionate medical care.";

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between border border-slate-200/80 group"
                  >
                    <div>
                      <div className="flex items-start gap-4">
                        {/* Stylized Doctor Initials Avatar Badge */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center font-headline-sm font-bold text-lg shadow-xs flex-shrink-0">
                          {getDoctorInitials(doc)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-headline-sm text-[1.05rem] text-slate-900 font-semibold truncate group-hover:text-teal-700 transition-colors">
                              {doctorName}
                            </h3>
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-teal-50 text-teal-700 font-label-sm text-xs font-semibold rounded-md">
                            {specializationName}
                          </span>
                          <div className="flex items-center gap-3 mt-2 text-slate-500 font-body-sm text-xs">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-slate-400">
                                schedule
                              </span>
                              {doc.experienceYears} yrs exp
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-900">
                              ₹{doc.consultationFee} <span className="font-normal text-slate-400">/ visit</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="font-body-sm text-slate-600 text-xs leading-relaxed mt-4 line-clamp-2">
                        {bioText}
                      </p>
                    </div>
                    <div className="pt-4 mt-4 grid grid-cols-2 gap-2 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-100">
                      <Link
                        href={`/doctors/${doc.id}`}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-label-md text-xs font-semibold rounded-lg shadow-xs transition-all text-center block"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/appointments?doctorId=${doc.id}`}
                        className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-label-md text-xs font-semibold rounded-lg shadow-xs transition-all text-center block"
                      >
                        Book Appointment
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION BAR */}
            <div className="bg-white rounded-2xl p-4 shadow-sm shadow-slate-900/5 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-body-sm text-body-sm text-slate-500">
                Showing <span className="font-semibold text-slate-900">{showingStart}</span> to{" "}
                <span className="font-semibold text-slate-900">{showingEnd}</span> of{" "}
                <span className="font-semibold text-slate-900">{pagination.total}</span> doctors
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed font-label-md text-xs font-medium rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>Previous</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(pagination.totalPages, 1) }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg font-label-md text-xs font-semibold flex items-center justify-center transition-colors ${
                          pageNum === pagination.page
                            ? "bg-teal-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages || pagination.totalPages === 0
                  }
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed font-label-md text-xs font-semibold rounded-lg transition-colors"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
