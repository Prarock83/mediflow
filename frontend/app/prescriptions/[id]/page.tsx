"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { Prescription, fetchPatientPrescriptionById } from "@/lib/api";

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

export default function PrescriptionDetailPage() {
  const params = useParams();
  const rxId = params?.id as string;

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrescription = useCallback(() => {
    if (!rxId) return;
    setIsLoading(true);
    setError(null);
    fetchPatientPrescriptionById(rxId)
      .then((data) => {
        setPrescription(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch prescription details:", err);
        setError("We couldn't load this prescription. It may not exist or you may not have permission to view it.");
        setIsLoading(false);
      });
  }, [rxId]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-5xl mx-auto gap-space-lg pb-12">
        {/* Header & Breadcrumbs */}
        <div className="flex flex-col gap-space-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <Link href="/dashboard" className="hover:text-on-surface transition-colors cursor-pointer">
              Portal
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link href="/prescriptions" className="hover:text-on-surface transition-colors cursor-pointer">
              Prescriptions
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-semibold text-primary">
              Prescription Details
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Prescription
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Read-only clinical prescription overview
              </p>
            </div>
            <div>
              <Link
                href="/prescriptions"
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Prescriptions</span>
              </Link>
            </div>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-slate-200/80 animate-pulse flex flex-col gap-space-lg">
            <div className="flex items-center gap-space-md">
              <div className="w-14 h-14 rounded-xl bg-surface-container shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-surface-container rounded w-64" />
                <div className="h-4 bg-surface-container-high rounded w-40" />
              </div>
            </div>
            <div className="h-20 bg-surface-container-low rounded-lg w-full" />
            <div className="h-20 bg-surface-container-low rounded-lg w-full" />
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-surface-container-lowest py-space-xl px-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center text-error mb-space-md">
              <span className="material-symbols-outlined text-[36px]">error_outline</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Unable to load prescription
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-md">
              {error}
            </p>
            <div className="mt-space-lg flex items-center gap-space-sm">
              <button
                type="button"
                onClick={loadPrescription}
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
                <span>Try Again</span>
              </button>
              <Link
                href="/prescriptions"
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg transition-colors"
              >
                <span>Back to Prescriptions</span>
              </Link>
            </div>
          </div>
        )}

        {/* PRESCRIPTION DETAILS CARD */}
        {!isLoading && !error && prescription && (
          <div className="flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-lg">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md border-b border-slate-100 pb-space-lg">
                <div className="flex items-start gap-space-md">
                  <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-inner">
                    <span className="material-symbols-outlined text-[28px]">receipt_long</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      Prescription Issued
                    </h2>
                    <div className="flex flex-wrap items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-primary">event</span>
                        <span>Date: {formatFullDateDisplay(prescription.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Doctor information if available in response */}
                {prescription.doctor?.user && (
                  <div className="flex items-center gap-space-sm bg-surface-container-low p-space-sm rounded-xl border border-slate-200/60">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold flex items-center justify-center text-sm shrink-0">
                      {getDoctorInitials(prescription)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Prescribed by</span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        Dr. {prescription.doctor.user.firstName} {prescription.doctor.user.lastName}
                      </span>
                      {prescription.doctor.specialization?.name && (
                        <span className="font-body-sm text-body-sm text-primary">
                          {prescription.doctor.specialization.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions Section (if present) */}
              {prescription.instructions && (
                <div className="flex flex-col gap-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Physician Instructions
                  </h3>
                  <div className="p-space-md rounded-xl bg-surface-container-low border border-slate-200/60 text-on-surface font-body-md leading-relaxed">
                    {prescription.instructions}
                  </div>
                </div>
              )}

              {/* Medication Section */}
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Prescribed Medications ({prescription.items?.length || 0})
                  </h3>
                </div>

                <div className="flex flex-col gap-space-xs">
                  {prescription.items && prescription.items.length > 0 ? (
                    prescription.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-space-md rounded-xl bg-surface-container-low border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-space-md"
                      >
                        <div className="flex items-start gap-space-md min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[22px]">medication</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                              {item.medicationName}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                              Dosage: <span className="font-semibold text-on-surface">{item.dosage}</span>
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-space-lg text-on-surface-variant font-body-sm text-body-sm bg-surface-container-lowest p-space-sm rounded-lg border border-slate-100">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-400 font-semibold">
                              Frequency
                            </span>
                            <span className="font-medium text-on-surface mt-0.5">{item.frequency}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-400 font-semibold">
                              Duration
                            </span>
                            <span className="font-medium text-on-surface mt-0.5">{item.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-space-md rounded-xl bg-surface-container-low text-on-surface-variant italic">
                      No medication items listed in this prescription.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
