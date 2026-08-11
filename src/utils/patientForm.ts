import type { ServiceType, SpecialtyData } from '../types';

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
  const s = raw || {};
  if (service === 'URGENCE') {
    return {
      arrivalTime: s.arrivalTime || s.arrival_time || '',
      triageLevel: s.triageLevel || s.triage_level || '',
      initialSeverity: s.initialSeverity || s.initial_severity || '',
    };
  }
  if (service === 'ONCOLOGIE') {
    return {
      tumorType: s.tumorType || s.tumor_type || '',
      stage: s.stage || '',
      currentTreatment: s.currentTreatment || s.current_treatment || '',
    };
  }
  if (service === 'CARDIOLOGIE') {
    return {
      ecgResults: s.ecgResults || s.ecg_results || '',
      restingHeartRate: s.restingHeartRate ?? s.resting_heart_rate,
      bloodPressure: s.bloodPressure || s.blood_pressure || '',
    };
  }
  return { notes: s.notes || '' };
}

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
