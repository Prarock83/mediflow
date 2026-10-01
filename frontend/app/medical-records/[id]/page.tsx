"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { MedicalRecord, fetchPatientMedicalRecordById } from "@/lib/api";

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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function MedicalRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params?.id as string;

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(() => {
    if (!recordId) return;
    setIsLoading(true);
    setError(null);
    fetchPatientMedicalRecordById(recordId)
      .then((data) => {
        setRecord(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch medical record detail:", err);
        setError("We couldn't load this medical record. It may not exist or you may not have permission to view it.");
        setIsLoading(false);
      });
  }, [recordId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

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
            <Link href="/medical-records" className="hover:text-on-surface transition-colors cursor-pointer">
              Medical Records
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-semibold text-primary truncate max-w-[200px]">
              {record ? record.title : "Record Details"}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                {isLoading ? "Loading Record..." : record?.title || "Medical Record"}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Read-only clinical record overview
              </p>
            </div>
            <div>
              <Link
                href="/medical-records"
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Records</span>
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
                <div className="h-4 bg-surface-container-high rounded w-36" />
              </div>
            </div>
            <div className="h-24 bg-surface-container-low rounded-lg w-full" />
            <div className="h-16 bg-surface-container-low rounded-lg w-1/2" />
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-surface-container-lowest py-space-xl px-space-lg rounded-xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-space-lg">
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center text-error mb-space-md">
              <span className="material-symbols-outlined text-[36px]">error_outline</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Unable to load medical record
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-md">
              {error}
            </p>
            <div className="mt-space-lg flex items-center gap-space-sm">
              <button
                type="button"
                onClick={loadRecord}
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
                <span>Try Again</span>
              </button>
              <Link
                href="/medical-records"
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg transition-colors"
              >
                <span>Back to Medical Records</span>
              </Link>
            </div>
          </div>
        )}

        {/* RECORD DETAILS CARD */}
        {!isLoading && !error && record && (
          <div className="flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-slate-200/80 flex flex-col gap-space-lg">
              {/* Record Summary Header */}
              <div className="flex items-start gap-space-md border-b border-slate-100 pb-space-lg">
                <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">folder_special</span>
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    {record.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">event</span>
                      <span>Record Date: {formatFullDateDisplay(record.recordDate)}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-xs text-slate-400">
                      ID: {record.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Description Section */}
              <div className="flex flex-col gap-space-xs">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Clinical Summary & Description
                </h3>
                {record.description ? (
                  <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low p-space-md rounded-xl leading-relaxed whitespace-pre-wrap">
                    {record.description}
                  </p>
                ) : (
                  <p className="font-body-md text-body-md text-on-surface-variant italic bg-surface-container-low p-space-md rounded-xl">
                    No detailed description provided for this record.
                  </p>
                )}
              </div>

              {/* Record Timeline Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md bg-surface-container-lowest border border-slate-100 p-space-md rounded-xl">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Created At
                  </span>
                  <span className="font-body-md text-body-md text-on-surface font-medium mt-0.5">
                    {formatFullDateDisplay(record.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Last Updated
                  </span>
                  <span className="font-body-md text-body-md text-on-surface font-medium mt-0.5">
                    {formatFullDateDisplay(record.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Attached Documents Section (If present in API payload) */}
              {record.documents && record.documents.length > 0 && (
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Attached Documents ({record.documents.length})
                  </h3>
                  <div className="flex flex-col gap-space-xs">
                    {record.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-slate-200/60 hover:bg-surface-container transition-colors"
                      >
                        <div className="flex items-center gap-space-md min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                              {doc.fileName}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {formatBytes(doc.fileSize)} • {doc.fileType || "Document"}
                            </span>
                          </div>
                        </div>

                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-space-md py-1.5 bg-primary-container text-on-primary-container font-label-sm text-label-sm rounded-lg hover:bg-primary hover:text-on-primary transition-colors shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
