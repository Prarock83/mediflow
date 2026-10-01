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

export async function fetchRecommendedDoctors(
  limit = 3,
  token?: string
): Promise<DoctorProfile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/doctors?limit=${limit}`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch doctors: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
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
