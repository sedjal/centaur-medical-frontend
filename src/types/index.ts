export type RoleName = 'ADMIN' | 'DIRECTION' | 'MEDECIN' | 'SECRETAIRE';
export type ServiceType = 'GENERAL' | 'URGENCE' | 'ONCOLOGIE' | 'CARDIOLOGIE';
export type Permission =
  | 'patients:read'
  | 'patients:create'
  | 'patients:update'
  | 'patients:delete'
  | 'service:general'
  | 'service:urgence'
  | 'service:oncologie'
  | 'service:cardiologie'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'roles:manage'
  | 'audit:read'
  | 'reports:read';

export interface AuthUser {
  sub?: string;
  id?: string;
  email: string;
  role: RoleName;
  permissions: Permission[];
  firstName: string;
  lastName: string;
  first_name?: string;
  last_name?: string;
}

export interface SpecialtyData {
  notes?: string | null;
  arrivalTime?: string;
  triageLevel?: string;
  initialSeverity?: string;
  tumorType?: string;
  stage?: string;
  currentTreatment?: string;
  ecgResults?: string;
  restingHeartRate?: number;
  bloodPressure?: string;
  // API snake_case variants
  arrival_time?: string;
  triage_level?: string;
  initial_severity?: string;
  tumor_type?: string;
  current_treatment?: string;
  ecg_results?: string;
  resting_heart_rate?: number;
  blood_pressure?: string;
}

export interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  hospitalization_date: string;
  service: ServiceType;
  status: string;
  specialty?: SpecialtyData | null;
  medicalRecord?: { id: string; service: ServiceType } | null;
}

export interface PatientFormModel {
  firstName: string;
  lastName: string;
  hospitalizationDate: string;
  service: ServiceType;
  status: string;
  specialty: SpecialtyData;
}

export interface DashboardStats {
  total: number;
  critical: number;
  byService: Record<string, number>;
  recent: Patient[];
}

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  patient_name: string | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

export interface AppUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  mfa_required: boolean;
  role: RoleName;
  created_at: string;
}
