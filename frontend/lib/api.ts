const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getAuthHeaders(token?: string): Record<string, string> {
  const authToken =
    token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  return authToken
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      }
    : {
        "Content-Type": "application/json",
      };
}

export interface DoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: string;
}

export interface DoctorSpecialization {
  id: string;
  name: string;
  description?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  experienceYears: number;
  bio?: string;
  consultationFee: number;
  specialization?: DoctorSpecialization;
  user?: DoctorUser;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reason?: string;
  doctor?: DoctorProfile;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DoctorQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  specializationId?: string;
  minExperience?: number;
  maxFee?: number;
  sort?: "newest" | "experience" | "consultationFee";
}

export interface DoctorPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DoctorsApiResponse {
  status: string;
  data: DoctorProfile[];
  pagination: DoctorPagination;
}

export async function fetchDoctors(
  params: DoctorQueryParams = {},
  token?: string
): Promise<DoctorsApiResponse> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", params.page.toString());
  if (params.limit !== undefined) query.set("limit", params.limit.toString());
  if (params.search) query.set("search", params.search);
  if (params.specializationId) query.set("specializationId", params.specializationId);
  if (params.minExperience !== undefined) query.set("minExperience", params.minExperience.toString());
  if (params.maxFee !== undefined) query.set("maxFee", params.maxFee.toString());
  if (params.sort) query.set("sort", params.sort);

  const queryString = query.toString();
  const url = `${API_BASE_URL}/doctors${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch doctors: ${response.status}`);
  }

  const data = await response.json();
  return {
    status: data.status || "success",
    data: data.data || [],
    pagination: data.pagination || {
      page: params.page || 1,
      limit: params.limit || 6,
      total: (data.data || []).length,
      totalPages: 1,
    },
  };
}

export async function fetchDoctorById(
  id: string,
  token?: string
): Promise<DoctorProfile> {
  const response = await fetch(`${API_BASE_URL}/doctors/${id}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch doctor profile: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

export interface DoctorSlotItem {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface DoctorSlotsResponse {
  doctorId: string;
  date: string;
  slots: DoctorSlotItem[];
}

export async function fetchDoctorSlots(
  doctorId: string,
  date: string,
  token?: string
): Promise<DoctorSlotsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/doctors/${doctorId}/slots?date=${date}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(
      errBody?.message || `Failed to fetch slots for date ${date}: ${response.status}`
    );
  }

  const data = await response.json();
  return data.data;
}


export async function fetchRecommendedDoctors(
  limit = 3,
  token?: string
): Promise<DoctorProfile[]> {
  try {
    const res = await fetchDoctors({ limit }, token);
    return res.data;

  } catch (error) {
    console.warn("API fetchRecommendedDoctors failed, using fallback:", error);
    return [];
  }
}

export async function fetchPatientAppointments(
  token?: string
): Promise<Appointment[]> {
  const response = await fetch(`${API_BASE_URL}/appointments/my`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch appointments: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data || [];
}

export async function fetchPatientAppointmentById(
  id: string,
  token?: string
): Promise<Appointment | null> {
  const appointments = await fetchPatientAppointments(token);
  return appointments.find((app) => app.id === id) || null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface PatientProfileData {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateAppointmentPayload {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export async function fetchPatientProfile(
  token?: string
): Promise<PatientProfileData> {
  const response = await fetch(`${API_BASE_URL}/patients/me`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch patient profile: ${response.status}`, response.status);
  }

  const data = await response.json();
  return data.data;
}

export async function createAppointment(
  payload: CreateAppointmentPayload,
  token?: string
): Promise<Appointment> {
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Failed to create appointment: ${response.status}`,
      response.status
    );
  }

  return data.data;
}

export async function fetchNotifications(
  token?: string
): Promise<NotificationItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/my`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn("API fetchNotifications failed, using fallback:", error);
    return [];
  }
}

export async function fetchPatientNotifications(
  token?: string
): Promise<NotificationItem[]> {
  const response = await fetch(`${API_BASE_URL}/notifications/my`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch notifications: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data || [];
}

export async function markNotificationAsRead(
  id: string,
  token?: string
): Promise<NotificationItem> {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Failed to mark notification as read: ${response.status}`,
      response.status
    );
  }

  return data.data;
}

export async function deleteNotification(
  id: string,
  token?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Failed to delete notification: ${response.status}`,
      response.status
    );
  }
}


export interface MedicalRecordDocument {
  id: string;
  medicalRecordId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface MedicalRecordPatientUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

export interface MedicalRecordPatient {
  id: string;
  userId: string;
  user?: MedicalRecordPatientUser;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  title: string;
  description?: string | null;
  recordDate: string;
  createdAt: string;
  updatedAt: string;
  patient?: MedicalRecordPatient;
  documents?: MedicalRecordDocument[];
}

export async function fetchPatientMedicalRecords(
  token?: string
): Promise<MedicalRecord[]> {
  const response = await fetch(`${API_BASE_URL}/medical-records/my`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch medical records: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data || [];
}

export async function fetchPatientMedicalRecordById(
  id: string,
  token?: string
): Promise<MedicalRecord> {
  const response = await fetch(`${API_BASE_URL}/medical-records/${id}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch medical record: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionDoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

export interface PrescriptionDoctorSpecialization {
  id: string;
  name: string;
  description?: string;
}

export interface PrescriptionDoctor {
  id: string;
  userId: string;
  licenseNumber?: string;
  experienceYears?: number;
  user?: PrescriptionDoctorUser;
  specialization?: PrescriptionDoctorSpecialization;
}

export interface Prescription {
  id: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  instructions?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: PrescriptionItem[];
  doctor?: PrescriptionDoctor;
}

export async function fetchPatientPrescriptions(
  token?: string
): Promise<Prescription[]> {
  const response = await fetch(`${API_BASE_URL}/prescriptions/my`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch prescriptions: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data || [];
}

export async function fetchPatientPrescriptionById(
  id: string,
  token?: string
): Promise<Prescription> {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${id}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch prescription: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.data;
}




