export interface PatientUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  patientIdNumber?: string;
  avatarUrl?: string;
}

export const DEFAULT_PATIENT_USER: PatientUser = {
  id: "pat-default-uuid",
  firstName: "Elena",
  lastName: "Vance",
  email: "elena.vance@mediflow.com",
  role: "PATIENT",
  patientIdNumber: "MV-8921",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida/AEtjO1UAtIlDnycYScxbzSZCB7fWFrxhpOReucoJ_NUX7optBSoG1Qqt51kE4T3vGdADMzFPrkzjJggVPYx87t4youIJh4lThRoQw3a3a6FUUQqiLEpz5JG9ANHnpS6tKOzct_DfNoralMdibuGknXoM0OL3Gxj56FdsxJPPINg3QsBvDFhxJ02GMv_b_FL36GyDBDHYOOQpkO_ZZ4M3_Nk869A3lgR6ARaHtogxidmbqKJ3aFP1MR4MKw29eyjt",
};

export function getAuthenticatedUser(): PatientUser {
  return DEFAULT_PATIENT_USER;
}
