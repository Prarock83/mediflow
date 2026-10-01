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
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/my`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn("API fetchPatientAppointments failed, using fallback:", error);
    return [];
  }
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

