import {
  can,
  serviceLabel,
  initials,
  formatDate,
  isCritical,
} from '../../src/utils/permissions';
import {
  emptySpecialty,
  mapSpecialtyFromApi,
  validateSpecialty,
} from '../../src/utils/patientForm';

describe('permissions utils', () => {
  it('checks can()', () => {
    expect(can(['patients:read'], 'patients:read')).toBe(true);
    expect(can(['patients:read'], 'patients:delete')).toBe(false);
    expect(can(undefined, 'patients:read')).toBe(false);
  });

  it('labels services', () => {
    expect(serviceLabel('URGENCE')).toBe('Urgence');
    expect(serviceLabel('GENERAL')).toContain('Générale');
    expect(serviceLabel('X')).toBe('X');
  });

  it('builds initials and formats date', () => {
    expect(initials('Ahmed', 'Benali')).toBe('AB');
    expect(formatDate('2026-08-11T00:00:00.000Z')).toBe('2026-08-11');
    expect(formatDate()).toBe('—');
  });

  it('detects critical status', () => {
    expect(isCritical('CRITICAL')).toBe(true);
    expect(isCritical('STABLE')).toBe(false);
  });
});

describe('patientForm utils', () => {
  it('creates empty specialty', () => {
    expect(emptySpecialty().arrivalTime).toBe('');
  });

  it('maps emergency specialty from snake_case API', () => {
    const mapped = mapSpecialtyFromApi('URGENCE', {
      arrival_time: '10:00',
      triage_level: '1',
      initial_severity: 'Critical',
    });
    expect(mapped.arrivalTime).toBe('10:00');
    expect(mapped.triageLevel).toBe('1');
  });

  it('maps oncology and cardiology', () => {
    expect(
      mapSpecialtyFromApi('ONCOLOGIE', {
        tumor_type: 'x',
        stage: 'II',
        current_treatment: 'Chemo',
      }).tumorType
    ).toBe('x');
    expect(
      mapSpecialtyFromApi('CARDIOLOGIE', {
        ecg_results: 'OK',
        resting_heart_rate: 70,
        blood_pressure: '120/80',
      }).restingHeartRate
    ).toBe(70);
  });

  it('validates specialty fields', () => {
    expect(validateSpecialty('URGENCE', {})).toBe('Emergency fields required');
    expect(
      validateSpecialty('URGENCE', {
        arrivalTime: '1',
        triageLevel: '1',
        initialSeverity: 'ok',
      })
    ).toBeNull();
    expect(validateSpecialty('ONCOLOGIE', { tumorType: 'a' })).toBe(
      'Oncology fields required'
    );
    expect(
      validateSpecialty('CARDIOLOGIE', {
        ecgResults: 'ok',
        restingHeartRate: 60,
        bloodPressure: '110/70',
      })
    ).toBeNull();
    expect(validateSpecialty('GENERAL', {})).toBeNull();
  });
});
