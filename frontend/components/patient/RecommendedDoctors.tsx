"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DoctorProfile, fetchRecommendedDoctors } from "@/lib/api";

interface RecommendedDoctorsProps {
  initialDoctors?: DoctorProfile[];
}

export default function RecommendedDoctors({
  initialDoctors = [],
}: RecommendedDoctorsProps) {
  const [doctors, setDoctors] = useState<DoctorProfile[]>(initialDoctors);
  const [isLoading, setIsLoading] = useState<boolean>(initialDoctors.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (initialDoctors.length === 0) {
      setIsLoading(true);
      fetchRecommendedDoctors(3)
        .then((res) => {
          if (isMounted) {
            setDoctors(res);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to load recommended doctors:", err);
            setError("Unable to load recommended doctors at this time.");
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [initialDoctors]);

  // Static fallback presentation list matching Stitch visual design if API has 0 records
  const fallbackList = [
    {
      id: "doc-1",
      name: "Dr. Sarah Wilson, MD",
      specialization: "Cardiologist",
      experienceYears: 12,
      consultationFee: 150,
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB6FE1KGyLAXHqJnUZaZwRaGmdomKJEcrwOUYPMbI4LyPPoSxrQMRbiNXJHxVptqTpXFDLbpyPtLMnKV013FQollAnlWlIghjH65uJlwxSQeYUJf2Yb1DWoXYsraqxKmcUlPggYUoXP9xHpcdvJFOidizOzq11wed7pjxs1_u2fTg10540sZyeV4TeY0cOohxq4Wt_I_VceerB7VuCu_reHGCx6VKq6f2WmtxY7YmRGCr86MJkYLSaR_w",
    },
    {
      id: "doc-2",
      name: "Dr. Michael Chang, MD",
      specialization: "Primary Care / Internist",
      experienceYears: 15,
      consultationFee: 120,
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuApoSzgU2Z3BfaYrH_VNrhIhjpE8DX461VCTn27PUr2wpsDjb7_atf9ilX5N2Ho2tRUjXoyO8jpBNaUe2x-7GLu_xu92Xn6kVK1eVLMj8nfuWe60_86I3E2-8MV3DBaM0titSmIIbwKyBZc3kzS0DFGlKGlFgUDCTcXNR0GZI_LsKIYNtdR13DSopckVyX_NNA0vXFSErpcwTjpVFbuw3aj9D1ObFbi7OtIUOGL0bdrjMzR48hVAx7Pdw",
    },
    {
      id: "doc-3",
      name: "Dr. Elena Rostova, MD",
      specialization: "Dermatologist",
      experienceYears: 9,
      consultationFee: 140,
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuACLYdkhttYnJON6Mpv0X8hgLr4wQObJJM-7oldRAu6JHPFWtgaVVHWRPpvLa1t9JbM19v9yve_tji0zqRj_RVVg7AQF8XQOesfgMJ-nOPuUouTW1BAUhNw2B1CF1SnmnbmSX23koxBOmIEp4so3KAvAivyoGx9iv5IToxvB9kcpyp2HEHwWntbzAEl7JYB4RSVyfJfaa0MmDEyR5fa3oAM23-1p9vqqWg5lEhV9Hi5ZU3YnuvT_vHxhQ",
    },
  ];

  const displayList =
    doctors.length > 0
      ? doctors.map((doc, idx) => ({
          id: doc.id,
          name: doc.user ? `Dr. ${doc.user.firstName} ${doc.user.lastName}, MD` : `Doctor #${doc.id}`,
          specialization: doc.specialization?.name || "Specialist",
          experienceYears: doc.experienceYears || 0,
          consultationFee: doc.consultationFee || 0,
          avatarUrl: fallbackList[idx % fallbackList.length]?.avatarUrl,
        }))
      : fallbackList;

  return (
    <section className="bg-white rounded-2xl p-space-lg flex flex-col gap-space-md border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between pb-space-xs border-b border-slate-100">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-teal-700 text-[20px]">
            stars
          </span>
          <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold">
            Recommended Doctors
          </h3>
        </div>
        <Link
          href="/doctors"
          className="font-label-sm text-label-sm text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-0.5"
        >
          <span>View All</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-space-md">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-space-sm rounded-xl bg-slate-50/70 border border-slate-200/70 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-200" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-24" />
                </div>
              </div>
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-slate-50 text-center border border-slate-200/70">
          <p className="font-body-sm text-slate-500 mb-2">{error}</p>
          <Link
            href="/doctors"
            className="font-label-sm text-teal-700 font-semibold hover:underline"
          >
            Browse Doctors Catalog
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {displayList.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-teal-200 transition-colors"
            >
              <div className="flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm min-w-0">
                  <img
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200"
                    alt={doc.name}
                    src={doc.avatarUrl}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-slate-900 font-semibold truncate">
                      {doc.name}
                    </span>
                    <span className="font-body-sm text-body-sm text-slate-500 truncate">
                      {doc.specialization}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-label-sm">
                      <span>{doc.experienceYears} yrs exp</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-teal-800">
                        ${doc.consultationFee} / visit
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/doctors"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 font-label-sm text-label-sm rounded-lg flex-shrink-0 transition-all shadow-sm"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-space-xs border-t border-slate-100">
        <Link
          href="/doctors"
          className="w-full py-2.5 px-space-md bg-teal-50 hover:bg-teal-100/70 border border-teal-200/80 text-teal-800 font-label-md text-label-md rounded-xl transition-all flex items-center justify-center gap-1.5 font-semibold shadow-sm"
        >
          <span>Explore All Doctors & Specialties</span>
          <span className="material-symbols-outlined text-[16px]">search</span>
        </Link>
      </div>
    </section>
  );
}
