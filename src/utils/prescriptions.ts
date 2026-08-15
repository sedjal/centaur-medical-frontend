import { parseApiError } from '../api/client';
import type { PrescriptionCreatePayload, PrescriptionMedicationInput } from '../types';

export type PrescriptionFormFieldErrors = Record<string, string>;

export function emptyMedication(): PrescriptionMedicationInput {
  return {
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  };
}

export function toDatetimeLocalValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export function formatPrescriptionDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function validatePrescriptionForm(
  payload: Pick<PrescriptionCreatePayload, 'prescribedAt' | 'medications'>
): PrescriptionFormFieldErrors {
  const errors: PrescriptionFormFieldErrors = {};

  if (!String(payload.prescribedAt || '').trim()) {
    errors.prescribedAt = 'La date de prescription est obligatoire.';
  } else if (Number.isNaN(Date.parse(payload.prescribedAt))) {
    errors.prescribedAt = 'La date de prescription est invalide.';
  }

  const meds = payload.medications || [];
  if (meds.length < 1) {
    errors.medications = 'Ajoutez au moins un médicament.';
  }

  meds.forEach((med, index) => {
    if (!String(med.name || '').trim()) {
      errors[`med-${index}-name`] = 'Le nom du médicament est obligatoire.';
    }
    if (!String(med.dosage || '').trim()) {
      errors[`med-${index}-dosage`] = 'Le dosage est obligatoire.';
    }
    if (!String(med.frequency || '').trim()) {
      errors[`med-${index}-frequency`] = 'La fréquence est obligatoire.';
    }
    if (!String(med.duration || '').trim()) {
      errors[`med-${index}-duration`] = 'La durée est obligatoire.';
    }
  });

  return errors;
}

export function buildCreatePayload(
  patientId: string,
  prescribedAtLocal: string,
  notes: string,
  medications: PrescriptionMedicationInput[]
): PrescriptionCreatePayload {
  return {
    patientId,
    prescribedAt: fromDatetimeLocalValue(prescribedAtLocal),
    notes: notes.trim() ? notes.trim() : null,
    medications: medications.map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage.trim(),
      frequency: m.frequency.trim(),
      duration: m.duration.trim(),
      instructions: m.instructions?.trim() ? m.instructions.trim() : null,
    })),
  };
}

export function prescriptionApiMessage(
  err: unknown,
  context: 'load' | 'create' | 'cancel'
): string {
  const parsed = parseApiError(err);
  const status = parsed.status;

  if (status === 403) {
    return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  }
  if (status === 404) {
    return 'Patient ou ordonnance introuvable.';
  }
  if (status === 409) {
    return "L'ordonnance est déjà annulée.";
  }
  if (status === 400) {
    return parsed.message || "Les données de l'ordonnance sont invalides.";
  }
  if (status >= 500) {
    return context === 'load'
      ? 'Impossible de charger les ordonnances.'
      : "Une erreur est survenue lors de l'enregistrement.";
  }
  return parsed.message || 'Une erreur est survenue.';
}
