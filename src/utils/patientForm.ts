import type { ServiceType, SpecialtyData, PatientFormModel } from '../types';
import { parseApiError } from '../api/client';
import { formatDateOnly, todayLocalDate } from './dates';

/** PostgreSQL TIME → valeur compatible `<input type="time">` (HH:mm). */
export function normalizeTimeForInput(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const iso = trimmed.match(/T(\d{2}):(\d{2})/);
    if (iso) return `${iso[1]}:${iso[2]}`;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const h = value.getHours().toString().padStart(2, '0');
    const m = value.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  return String(value);
}

/** HH:mm ou HH:mm:ss → HH:mm:ss pour l'API / PostgreSQL TIME. */
export function normalizeTimeForApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return trimmed;
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  const ss = match[3] ?? '00';
  return `${hh}:${mm}:${ss}`;
}

export function emptySpecialty(): SpecialtyData {
  return {
    notes: '',
    arrivalTime: '',
    triageLevel: '',
    initialSeverity: '',
    tumorType: '',
    stage: '',
    currentTreatment: '',
    ecgResults: '',
    restingHeartRate: undefined,
    bloodPressure: '',
  };
}

export function mapSpecialtyFromApi(
  service: ServiceType,
  raw: SpecialtyData | null | undefined
): SpecialtyData {
  const base = emptySpecialty();
  const s = raw || {};
  if (service === 'URGENCE') {
    return {
      ...base,
      arrivalTime: normalizeTimeForInput(s.arrivalTime ?? s.arrival_time),
      triageLevel: String(s.triageLevel ?? s.triage_level ?? '').trim(),
      initialSeverity: String(s.initialSeverity ?? s.initial_severity ?? '').trim(),
    };
  }
  if (service === 'ONCOLOGIE') {
    return {
      ...base,
      tumorType: String(s.tumorType ?? s.tumor_type ?? '').trim(),
      stage: String(s.stage ?? '').trim(),
      currentTreatment: String(s.currentTreatment ?? s.current_treatment ?? '').trim(),
    };
  }
  if (service === 'CARDIOLOGIE') {
    return {
      ...base,
      ecgResults: String(s.ecgResults ?? s.ecg_results ?? '').trim(),
      restingHeartRate: s.restingHeartRate ?? s.resting_heart_rate,
      bloodPressure: String(s.bloodPressure ?? s.blood_pressure ?? '').trim(),
    };
  }
  return { ...base, notes: String(s.notes ?? '').trim() };
}

/** Ne conserve que les champs du service courant (évite d’envoyer des données incohérentes). */
export function specialtyPayloadForService(
  service: ServiceType,
  data: SpecialtyData
): SpecialtyData {
  if (service === 'URGENCE') {
    return {
      arrivalTime: normalizeTimeForApi(data.arrivalTime?.trim() || ''),
      triageLevel: data.triageLevel?.trim() || '',
      initialSeverity: data.initialSeverity?.trim() || '',
    };
  }
  if (service === 'ONCOLOGIE') {
    return {
      tumorType: data.tumorType?.trim() || '',
      stage: data.stage?.trim() || '',
      currentTreatment: data.currentTreatment?.trim() || '',
    };
  }
  if (service === 'CARDIOLOGIE') {
    const rate =
      data.restingHeartRate == null || Number.isNaN(Number(data.restingHeartRate))
        ? undefined
        : Number(data.restingHeartRate);
    return {
      ecgResults: data.ecgResults?.trim() || '',
      restingHeartRate: rate,
      bloodPressure: data.bloodPressure?.trim() || '',
    };
  }
  return { notes: data.notes?.trim() || '' };
}

/** @deprecated préférer validatePatientForm — conservé pour compat tests unitaires */
export function validateSpecialty(service: ServiceType, data: SpecialtyData): string | null {
  if (service === 'URGENCE') {
    if (!data.arrivalTime || !data.triageLevel || !data.initialSeverity) {
      return 'Emergency fields required';
    }
  }
  if (service === 'ONCOLOGIE') {
    if (!data.tumorType || !data.stage || !data.currentTreatment) {
      return 'Oncology fields required';
    }
  }
  if (service === 'CARDIOLOGIE') {
    if (!data.ecgResults || data.restingHeartRate == null || !data.bloodPressure) {
      return 'Cardiology fields required';
    }
  }
  return null;
}

export type PatientFormFieldErrors = Record<string, string>;

export function validatePatientForm(form: PatientFormModel): PatientFormFieldErrors {
  const errors: PatientFormFieldErrors = {};

  if (!String(form.firstName || '').trim()) {
    errors.firstName = 'Le prénom est obligatoire.';
  }
  if (!String(form.lastName || '').trim()) {
    errors.lastName = 'Le nom est obligatoire.';
  }
  if (!form.service) {
    errors.service = 'Le service est obligatoire.';
  }
  if (!String(form.status || '').trim()) {
    errors.status = 'Le statut est obligatoire.';
  }
  const date = String(form.hospitalizationDate || '').trim();
  if (!date) {
    errors.hospitalizationDate = "La date d'hospitalisation est obligatoire.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.hospitalizationDate = "La date d'hospitalisation est invalide.";
  }

  const sp = form.specialty || {};
  if (form.service === 'URGENCE') {
    if (!String(sp.arrivalTime || '').trim()) {
      errors.arrivalTime = "L'heure d'arrivée est obligatoire.";
    }
    if (!String(sp.triageLevel || '').trim()) {
      errors.triageLevel = 'Le niveau de triage est obligatoire.';
    }
    if (!String(sp.initialSeverity || '').trim()) {
      errors.initialSeverity = 'La sévérité initiale est obligatoire.';
    }
  } else if (form.service === 'ONCOLOGIE') {
    if (!String(sp.tumorType || '').trim()) {
      errors.tumorType = 'Le type de tumeur est obligatoire.';
    }
    if (!String(sp.stage || '').trim()) {
      errors.stage = 'Le stade est obligatoire.';
    }
    if (!String(sp.currentTreatment || '').trim()) {
      errors.currentTreatment = 'Le traitement actuel est obligatoire.';
    }
  } else if (form.service === 'CARDIOLOGIE') {
    if (!String(sp.ecgResults || '').trim()) {
      errors.ecgResults = 'Les résultats ECG sont obligatoires.';
    }
    if (sp.restingHeartRate == null || String(sp.restingHeartRate).trim() === '') {
      errors.restingHeartRate = 'La fréquence cardiaque est obligatoire.';
    } else if (Number(sp.restingHeartRate) <= 0) {
      errors.restingHeartRate = 'La fréquence cardiaque doit être positive.';
    }
    if (!String(sp.bloodPressure || '').trim()) {
      errors.bloodPressure = 'La pression artérielle est obligatoire.';
    }
  }

  return errors;
}

export function patientFormApiMessage(
  err: unknown,
  context: 'load' | 'create' | 'update'
): string {
  const parsed = parseApiError(err);
  const status = parsed.status;

  if (context === 'load') {
    if (status === 404) return 'Patient introuvable.';
    if (status === 403) return "Vous n'avez pas l'autorisation de consulter ce patient.";
    return parsed.message || 'Impossible de charger le patient.';
  }

  if (status === 400) return 'Les données du patient sont invalides.';
  if (status === 403) {
    return context === 'create'
      ? "Vous n'avez pas l'autorisation de créer ce patient."
      : "Vous n'avez pas l'autorisation de modifier ce patient.";
  }
  if (status === 404) return 'Patient introuvable.';
  if (status === 409) return "Conflit : l'enregistrement n'est pas possible dans cet état.";
  if (status >= 500) return "Une erreur est survenue lors de l'enregistrement.";
  return parsed.message || "Une erreur est survenue lors de l'enregistrement.";
}

export function createEmptyPatientForm(service: ServiceType = 'GENERAL'): PatientFormModel {
  return {
    firstName: '',
    lastName: '',
    hospitalizationDate: todayLocalDate(),
    service,
    status: 'STABLE',
    specialty: emptySpecialty(),
  };
}
