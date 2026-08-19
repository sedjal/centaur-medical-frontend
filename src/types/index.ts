export type SystemRoleName = 'ADMIN' | 'DIRECTION' | 'MEDECIN' | 'SECRETAIRE';
export type RoleName = SystemRoleName | (string & {});
export type ServiceType = 'GENERAL' | 'URGENCE' | 'ONCOLOGIE' | 'CARDIOLOGIE';
export type Permission =
  | 'patients:read'
  | 'patients:create'
  | 'patients:update'
  | 'patients:delete'
  | 'prescriptions:read'
  | 'prescriptions:create'
  | 'prescriptions:cancel'
  | 'medical_history:read'
  | 'documents:read'
  | 'documents:create'
  | 'documents:delete'
  | 'notifications:read'
  | 'notifications:create'
  | 'notifications:read_all'
  | 'notifications:cancel'
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
  | 'reports:read'
  | 'reports:create';

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

export interface ServiceOccupancy {
  service: ServiceType;
  label: string;
  occupied: number;
  capacity: number;
  available: number;
  percent: number;
  load: 'Disponible' | 'Forte charge' | 'Saturé';
}

export interface DashboardStats {
  total: number;
  critical: number;
  admittedToday: number;
  availableBeds: number;
  totalBeds: number;
  byService: Record<string, number>;
  occupancy: ServiceOccupancy[];
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
  must_change_password?: boolean;
  role: RoleName;
  created_at: string;
}

export interface AppRole {
  id: string;
  name: string;
  created_at: string;
  is_system: boolean;
  user_count: number;
  permissions: string[];
}

export interface AppPermission {
  id: string;
  code: string;
  description: string | null;
}

export type PrescriptionStatus = 'ACTIVE' | 'CANCELLED';

export interface PrescriptionMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId?: string | null;
  doctorName?: string | null;
  prescribedAt: string;
  status: PrescriptionStatus;
  notes?: string | null;
  medications: PrescriptionMedication[];
  createdAt?: string;
  updatedAt?: string;
  prescriptionNumber?: number;
  patientAge?: string | null;
  patientGender?: string | null;
}

export interface PrescriptionMedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export interface PrescriptionCreatePayload {
  patientId: string;
  prescribedAt: string;
  notes?: string | null;
  medications: PrescriptionMedicationInput[];
  patientAge?: string | null;
  patientGender?: string | null;
  doctorName?: string | null;
}

export type MedicalHistoryEventType =
  | 'HOSPITALIZATION'
  | 'CONSULTATION'
  | 'DIAGNOSIS'
  | 'PRESCRIPTION'
  | 'RECORD_UPDATE'
  | 'DOCUMENT_ADDED'
  | 'CLINICAL_NOTE';

export interface MedicalHistoryItem {
  id: string;
  patientId: string;
  eventType: MedicalHistoryEventType;
  occurredAt: string;
  service: ServiceType;
  doctorId: string | null;
  doctorName: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
}

export interface MedicalHistoryList {
  items: MedicalHistoryItem[];
  total: number;
}

export type NotificationType =
  | 'GENERAL'
  | 'PATIENT'
  | 'PRESCRIPTION'
  | 'MEDICAL_HISTORY'
  | 'REMINDER';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'CANCELLED';

export interface AppNotification {
  id: string;
  recipientId: string;
  patientId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  scheduledAt: string;
  sentAt: string | null;
  readAt: string | null;
  status: NotificationStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  total: number;
}

export interface NotificationCreatePayload {
  recipientId: string;
  patientId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  scheduledAt: string;
}

export type DocumentType = 'ECG' | 'CARTE_GROUPE' | 'ORDONNANCE' | 'AUTRE';

export interface PatientDocument {
  id: string;
  patientId: string;
  docType: DocumentType;
  filename: string;
  mimeType: string;
  byteSize: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  title: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface ClinicalNoteCreatePayload {
  title: string;
  body: string;
}
