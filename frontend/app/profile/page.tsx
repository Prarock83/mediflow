"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  PatientProfileData,
  SavePatientProfilePayload,
  fetchPatientProfile,
  updatePatientProfile,
  createPatientProfile,
  ApiError,
} from "@/lib/api";

function formatDateToInput(dateStr?: string | Date | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim().charAt(0) || "";
  const l = lastName?.trim().charAt(0) || "";
  const res = `${f}${l}`.toUpperCase();
  return res || "P";
}

interface ToastMessage {
  id: string;
  type: "success" | "error";
  message: string;
}

export default function ProfilePage() {
  const authUser = getAuthenticatedUser();

  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [gender, setGender] = useState<string>("Male");
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // Last Loaded Values (for unsaved check and cancel reset)
  const [initialFormValues, setInitialFormValues] = useState<{
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    emergencyContact: string;
    address: string;
  }>({
    dateOfBirth: "",
    gender: "Male",
    bloodGroup: "O+",
    emergencyContact: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const toastId = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const loadProfile = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);

    fetchPatientProfile()
      .then((data) => {
        setProfile(data);
        setHasProfile(true);

        const loadedDob = formatDateToInput(data.dateOfBirth);
        const loadedGender = data.gender || "Male";
        const loadedBloodGroup = data.bloodGroup || "O+";
        const loadedEmergency = data.emergencyContact || "";
        const loadedAddress = data.address || "";

        setDateOfBirth(loadedDob);
        setGender(loadedGender);
        setBloodGroup(loadedBloodGroup);
        setEmergencyContact(loadedEmergency);
        setAddress(loadedAddress);

        setInitialFormValues({
          dateOfBirth: loadedDob,
          gender: loadedGender,
          bloodGroup: loadedBloodGroup,
          emergencyContact: loadedEmergency,
          address: loadedAddress,
        });

        setIsLoading(false);
      })
      .catch((err: any) => {
        if (err instanceof ApiError && err.status === 404) {
          // Profile does not exist yet for this patient
          setHasProfile(false);
          setProfile(null);

          const emptyState = {
            dateOfBirth: "",
            gender: "Male",
            bloodGroup: "O+",
            emergencyContact: "",
            address: "",
          };

          setDateOfBirth(emptyState.dateOfBirth);
          setGender(emptyState.gender);
          setBloodGroup(emptyState.bloodGroup);
          setEmergencyContact(emptyState.emergencyContact);
          setAddress(emptyState.address);
          setInitialFormValues(emptyState);

          setIsLoading(false);
        } else {
          console.error("Failed to load patient profile:", err);
          setLoadError("We couldn't retrieve your profile information right now. Please try again.");
          setIsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Read-only User identity values
  const firstName = profile?.user?.firstName || authUser.firstName;
  const lastName = profile?.user?.lastName || authUser.lastName;
  const email = profile?.user?.email || authUser.email;
  const role = authUser.role || "PATIENT";
  const userInitials = getInitials(firstName, lastName);

  // Unsaved changes check
  const hasUnsavedChanges =
    dateOfBirth !== initialFormValues.dateOfBirth ||
    gender !== initialFormValues.gender ||
    bloodGroup !== initialFormValues.bloodGroup ||
    emergencyContact !== initialFormValues.emergencyContact ||
    address !== initialFormValues.address;

  const handleCancel = () => {
    setDateOfBirth(initialFormValues.dateOfBirth);
    setGender(initialFormValues.gender);
    setBloodGroup(initialFormValues.bloodGroup);
    setEmergencyContact(initialFormValues.emergencyContact);
    setAddress(initialFormValues.address);
    setSaveError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveError(null);

    const payload: SavePatientProfilePayload = {
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(gender ? { gender } : {}),
      ...(bloodGroup ? { bloodGroup } : {}),
      ...(address ? { address } : {}),
      ...(emergencyContact ? { emergencyContact } : {}),
    };

    try {
      let updated: PatientProfileData;

      if (hasProfile) {
        updated = await updatePatientProfile(payload);
        addToast("Profile updated successfully.", "success");
      } else {
        updated = await createPatientProfile(payload);
        setHasProfile(true);
        addToast("Profile created successfully.", "success");
      }

      setProfile(updated);

      const savedDob = formatDateToInput(updated.dateOfBirth);
      const savedGender = updated.gender || gender;
      const savedBloodGroup = updated.bloodGroup || bloodGroup;
      const savedEmergency = updated.emergencyContact || emergencyContact;
      const savedAddress = updated.address || address;

      setDateOfBirth(savedDob);
      setGender(savedGender);
      setBloodGroup(savedBloodGroup);
      setEmergencyContact(savedEmergency);
      setAddress(savedAddress);

      setInitialFormValues({
        dateOfBirth: savedDob,
        gender: savedGender,
        bloodGroup: savedBloodGroup,
        emergencyContact: savedEmergency,
        address: savedAddress,
      });

      setIsSubmitting(false);
    } catch (err: any) {
      console.error("Save profile error:", err);
      setSaveError("Your changes couldn't be saved. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-xl pb-12 relative">
        {/* Floating Toast Notification Stack */}
        <div className="fixed top-20 right-8 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-space-sm px-space-md py-3 rounded-xl text-on-surface shadow-xl font-label-md text-label-md transition-all duration-300 ${
                t.type === "success"
                  ? "bg-slate-900 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {t.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>

        {/* Header & Breadcrumb Section */}
        <div className="flex flex-col gap-space-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <Link href="/dashboard" className="hover:text-primary transition-colors cursor-pointer">
              Portal
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Profile</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                My Profile
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Manage your verified personal identity and patient health record details.
              </p>
            </div>
          </div>
        </div>

        {/* SKELETON LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col gap-space-lg animate-pulse">
            {/* Top Overview Skeleton */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
              <div className="flex items-center gap-space-md">
                <div className="w-16 h-16 rounded-full bg-surface-container-high shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-36 rounded bg-surface-container-high" />
                    <div className="h-5 w-16 rounded-full bg-surface-container-high" />
                  </div>
                  <div className="h-4 w-48 rounded bg-surface-container-high" />
                </div>
              </div>
            </div>

            {/* 2-Column Grid Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col gap-space-lg">
                <div className="h-5 w-44 rounded bg-surface-container-high" />
                <div className="grid grid-cols-2 gap-space-md">
                  <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                  <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                </div>
                <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                <div className="grid grid-cols-2 gap-space-md">
                  <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                  <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                </div>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col gap-space-lg">
                <div className="h-5 w-44 rounded bg-surface-container-high" />
                <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                <div className="h-10 w-full rounded-lg bg-surface-container-high" />
                <div className="h-24 w-full rounded-lg bg-surface-container-high" />
              </div>
            </div>
          </div>
        )}

        {/* LOAD ERROR STATE */}
        {!isLoading && loadError && (
          <div className="p-space-lg rounded-xl bg-error-container text-on-error-container shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md max-w-2xl mx-auto my-6">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-error text-on-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">cloud_off</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold">Unable to load your profile</span>
                <p className="font-body-md text-body-md opacity-90">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadProfile}
              className="shrink-0 px-space-md py-2.5 rounded-lg bg-error text-on-error hover:opacity-90 font-label-md text-label-md font-semibold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* INCOMPLETE PROFILE BANNER */}
        {!isLoading && !loadError && !hasProfile && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md p-space-lg rounded-xl bg-surface-container-high shadow-sm border border-teal-200/60">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">assignment_ind</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Complete your profile</span>
                <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                  Add your patient information to get the most out of MediFlow.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MAIN PROFILE VIEW & FORM */}
        {!isLoading && !loadError && (
          <div className="flex flex-col gap-space-lg">
            {/* SAVE ERROR BANNER */}
            {saveError && (
              <div className="p-space-md sm:p-space-lg rounded-xl bg-error-container text-on-error-container shadow-sm flex items-start gap-space-md">
                <span className="material-symbols-outlined text-[24px] text-error mt-0.5">error</span>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-semibold">Unable to update profile</span>
                  <p className="font-body-md text-body-md opacity-90 mt-0.5">{saveError}</p>
                </div>
              </div>
            )}

            {/* Profile Overview Card */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
              <div className="flex items-center gap-space-md">
                <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-display text-2xl font-bold shadow-inner shrink-0">
                  {userInitials}
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {firstName} {lastName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-primary/10 text-primary font-semibold tracking-wide uppercase">
                      {role}
                    </span>
                  </div>
                  <span className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    {email}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Container: 2-Column Desktop Grid */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
                {/* Column 1: Personal Information Card */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col justify-between gap-space-lg">
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-center justify-between pb-space-sm border-b border-slate-100">
                      <div className="flex flex-col">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Personal Information
                        </h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Basic identity details associated with your MediFlow account.
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">badge</span>
                      </div>
                    </div>

                    {/* First Name & Last Name (Read-Only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="firstName">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          readOnly
                          disabled
                          value={firstName}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md text-body-md cursor-not-allowed border border-slate-200/60"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="lastName">
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          readOnly
                          disabled
                          value={lastName}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md text-body-md cursor-not-allowed border border-slate-200/60"
                        />
                      </div>
                    </div>

                    {/* Email Field (Read-Only) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="email">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[18px]">
                          alternate_email
                        </span>
                        <input
                          id="email"
                          type="email"
                          readOnly
                          disabled
                          value={email}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md text-body-md cursor-not-allowed border border-slate-200/60"
                        />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Email is managed by your account.
                      </p>
                    </div>

                    {/* Date of Birth & Gender (Editable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="dateOfBirth">
                          Date of Birth
                        </label>
                        <input
                          id="dateOfBirth"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="gender">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            id="gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant text-[18px] pointer-events-none">
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Patient Information Card */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col justify-between gap-space-lg">
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-center justify-between pb-space-sm border-b border-slate-100">
                      <div className="flex flex-col">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Patient Information
                        </h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Clinical details supported by your MediFlow health record.
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">medical_services</span>
                      </div>
                    </div>

                    {/* Blood Group Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between" htmlFor="bloodGroup">
                        Blood Group
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Standard ABO/Rh</span>
                      </label>
                      <div className="relative">
                        <select
                          id="bloodGroup"
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant text-[18px] pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Emergency Contact Input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="emergencyContact">
                        Emergency Contact
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[18px]">
                          contact_phone
                        </span>
                        <input
                          id="emergencyContact"
                          type="text"
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          placeholder="Name & contact phone number"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Residential Address Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="address">
                        Residential Address
                      </label>
                      <textarea
                        id="address"
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street address, city, state, postal code"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Bar */}
              <div className="mt-space-lg p-space-md sm:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm">
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-label-sm text-label-sm font-medium border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-space-sm self-end sm:self-auto">
                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="px-space-md py-2.5 rounded-lg font-label-md text-label-md text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || (!hasUnsavedChanges && hasProfile)}
                    className={`px-space-lg py-2.5 rounded-lg font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-2 ${
                      isSubmitting || (!hasUnsavedChanges && hasProfile)
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-primary hover:bg-primary-container text-on-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isSubmitting ? "sync" : "check"}
                    </span>
                    <span>
                      {isSubmitting
                        ? "Saving..."
                        : hasProfile
                        ? "Save Changes"
                        : "Create Profile"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
