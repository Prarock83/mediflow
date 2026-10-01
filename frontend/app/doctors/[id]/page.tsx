"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { DoctorProfile, fetchDoctorById } from "@/lib/api";

export default function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.id;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchDoctorById(doctorId)
      .then((data) => {
        setDoctor(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load doctor profile:", err);
        setError("Unable to load doctor profile. Please verify doctor ID or try again.");
        setIsLoading(false);
      });
  }, [doctorId]);

  const getInitials = (doc: DoctorProfile) => {
    if (doc.user?.firstName && doc.user?.lastName) {
      return `${doc.user.firstName.charAt(0)}${doc.user.lastName.charAt(0)}`.toUpperCase();
    }
    return "DR";
  };

  return (
    <PatientLayout>
      <div className="flex flex-col w-full gap-space-lg max-w-4xl mx-auto pb-12">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-slate-400 font-label-sm text-label-sm">
          <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
            Portal
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href="/doctors" className="hover:text-slate-600 transition-colors">
            Find Doctors
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-teal-700 font-medium">Doctor Profile</span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm animate-pulse flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-slate-200" />
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-slate-200 rounded w-48" />
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-4 bg-slate-200 rounded w-24" />
              </div>
            </div>
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>
        ) : error || !doctor ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-sm flex flex-col items-center">
            <span className="material-symbols-outlined text-[40px] text-rose-500 mb-2">
              error
            </span>
            <h2 className="font-headline-md text-slate-900 font-bold mb-1">
              Doctor Profile Not Found
            </h2>
            <p className="font-body-sm text-slate-500 mb-6">{error}</p>
            <Link
              href="/doctors"
              className="px-4 py-2 bg-teal-600 text-white rounded-xl font-label-md text-label-md hover:bg-teal-700 transition-all shadow-sm"
            >
              Back to Doctors Directory
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center font-headline-md font-bold text-2xl shadow-sm flex-shrink-0">
                  {getInitials(doctor)}
                </div>
                <div className="flex flex-col">
                  <h1 className="font-headline-lg text-slate-900 font-bold">
                    Dr. {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : "Doctor"}
                  </h1>
                  <p className="font-headline-sm text-teal-700 font-semibold mt-0.5">
                    {doctor.specialization?.name || "Medical Specialist"}
                  </p>
                  <p className="font-body-sm text-slate-500 mt-1">
                    License #{doctor.licenseNumber}
                  </p>
                </div>
              </div>

              <Link
                href={`/appointments?doctorId=${doctor.id}`}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-label-md text-label-md font-semibold rounded-xl shadow-sm transition-all"
              >
                Book Appointment
              </Link>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-teal-700 text-[24px]">
                  schedule
                </span>
                <div>
                  <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                    Experience
                  </span>
                  <p className="font-headline-sm text-slate-900 font-bold">
                    {doctor.experienceYears} Years
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-teal-700 text-[24px]">
                  payments
                </span>
                <div>
                  <span className="font-label-sm text-slate-400 uppercase text-[11px]">
                    Consultation Fee
                  </span>
                  <p className="font-headline-sm text-slate-900 font-bold">
                    ₹{doctor.consultationFee} / visit
                  </p>
                </div>
              </div>
            </div>

            {/* Biography */}
            <div className="flex flex-col gap-2">
              <h3 className="font-headline-sm text-slate-900 font-semibold">
                About Doctor
              </h3>
              <p className="font-body-md text-slate-600 leading-relaxed">
                {doctor.bio || "No detailed biography provided for this specialist profile."}
              </p>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
