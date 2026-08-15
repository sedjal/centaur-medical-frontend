/**
 * UNIT FE — utils (tape)
 */
import test from 'tape';
import {
  can,
  serviceLabel,
  initials,
  formatDate,
  isCritical,
  allowedHospitalServices,
} from '../../src/utils/permissions';
import {
  emptySpecialty,
  mapSpecialtyFromApi,
  validateSpecialty,
  validatePatientForm,
  specialtyPayloadForService,
  patientFormApiMessage,
  createEmptyPatientForm,
} from '../../src/utils/patientForm';
import { occupancyPercent, serviceCountRows, formatLastUpdated } from '../../src/utils/dashboard';
import {
  validatePrescriptionForm,
  buildCreatePayload,
  prescriptionApiMessage,
  emptyMedication,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
  formatPrescriptionDate,
} from '../../src/utils/prescriptions';
import {
  medicalHistoryEventLabel,
  medicalHistoryEventVariant,
  formatMedicalHistoryDate,
  dateInputToIso,
  medicalHistoryMetadataLabel,
  medicalHistoryApiMessage,
} from '../../src/utils/medicalHistory';
import {
  notificationStatusLabel,
  notificationTypeLabel,
  isNotificationUnread,
  validateNotificationForm,
  notificationApiMessage,
  buildNotificationPayload,
} from '../../src/utils/notifications';
import { ApiError } from '../../src/api/client';

test('can()', (t) => {
  t.equal(can(['patients:read'], 'patients:read'), true);
  t.equal(can(['patients:read'], 'patients:delete'), false);
  t.equal(can(undefined, 'patients:read'), false);
  t.end();
});

test('allowedHospitalServices filtre par service:*', (t) => {
  t.deepEqual(allowedHospitalServices(['patients:read', 'service:urgence']), ['URGENCE']);
  t.deepEqual(allowedHospitalServices(['service:general', 'service:cardiologie']), [
    'GENERAL',
    'CARDIOLOGIE',
  ]);
  t.deepEqual(allowedHospitalServices(['patients:read']), []);
  t.end();
});

test('serviceLabel()', (t) => {
  t.equal(serviceLabel('URGENCE'), 'Urgences');
  t.match(serviceLabel('GENERAL'), /générale/);
  t.equal(serviceLabel('X'), 'X');
  t.end();
});

test('initials / formatDate / isCritical', (t) => {
  t.equal(initials('Ahmed', 'Benali'), 'AB');
  t.equal(formatDate('2026-08-11T00:00:00.000Z'), '2026-08-11');
  t.equal(formatDate(), '—');
  t.equal(isCritical('CRITICAL'), true);
  t.equal(isCritical('STABLE'), false);
  t.end();
});

test('patientForm: empty + map + validate', (t) => {
  t.equal(emptySpecialty().arrivalTime, '');
  const urg = mapSpecialtyFromApi('URGENCE', {
    arrival_time: '10:00',
    triage_level: '1',
    initial_severity: 'Critical',
  });
  t.equal(urg.arrivalTime, '10:00');
  t.equal(
    mapSpecialtyFromApi('ONCOLOGIE', { tumor_type: 'A', stage: 'II', current_treatment: 'chemo' })
      .tumorType,
    'A'
  );
  t.equal(
    mapSpecialtyFromApi('CARDIOLOGIE', {
      ecg_results: 'NSR',
      resting_heart_rate: 72,
      blood_pressure: '120/80',
    }).ecgResults,
    'NSR'
  );
  t.equal(mapSpecialtyFromApi('GENERAL', null).notes, '');
  t.equal(validateSpecialty('URGENCE', {}), 'Emergency fields required');
  t.equal(validateSpecialty('ONCOLOGIE', {}), 'Oncology fields required');
  t.equal(validateSpecialty('CARDIOLOGIE', {}), 'Cardiology fields required');
  t.equal(
    validateSpecialty('URGENCE', {
      arrivalTime: '1',
      triageLevel: '1',
      initialSeverity: 'ok',
    }),
    null
  );
  t.equal(validateSpecialty('GENERAL', {}), null);
  t.end();
});

test('patientForm: validatePatientForm champs obligatoires FR', (t) => {
  const errors = validatePatientForm({
    firstName: '',
    lastName: '',
    hospitalizationDate: '',
    service: 'GENERAL',
    status: '',
    specialty: {},
  });
  t.match(errors.lastName, /nom.*obligatoire/i);
  t.match(errors.firstName, /prénom.*obligatoire/i);
  t.match(errors.hospitalizationDate, /hospitalisation.*obligatoire/i);
  t.match(errors.status, /statut.*obligatoire/i);

  const noService = validatePatientForm({
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '12/08/2026',
    service: '' as never,
    status: 'STABLE',
    specialty: {},
  });
  t.match(noService.service, /service.*obligatoire/i);
  t.match(noService.hospitalizationDate, /invalide/i);

  const urgErr = validatePatientForm({
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '2026-08-12',
    service: 'URGENCE',
    status: 'STABLE',
    specialty: {},
  });
  t.match(urgErr.arrivalTime, /arrivée/i);
  t.match(urgErr.triageLevel, /triage/i);
  t.match(urgErr.initialSeverity, /sévérité/i);

  const oncoErr = validatePatientForm({
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '2026-08-12',
    service: 'ONCOLOGIE',
    status: 'STABLE',
    specialty: {},
  });
  t.match(oncoErr.tumorType, /tumeur/i);
  t.match(oncoErr.stage, /stade/i);
  t.match(oncoErr.currentTreatment, /traitement/i);

  const cardioErr = validatePatientForm({
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '2026-08-12',
    service: 'CARDIOLOGIE',
    status: 'STABLE',
    specialty: { ecgResults: '', restingHeartRate: 0, bloodPressure: '' },
  });
  t.match(cardioErr.ecgResults, /ECG/i);
  t.match(cardioErr.restingHeartRate, /positive/i);
  t.match(cardioErr.bloodPressure, /pression/i);

  const cardio = specialtyPayloadForService('CARDIOLOGIE', {
    ecgResults: 'ok',
    restingHeartRate: 70,
    bloodPressure: '120/80',
    notes: 'ignore',
  });
  t.equal(cardio.notes, undefined);
  t.equal(cardio.ecgResults, 'ok');
  t.equal(
    specialtyPayloadForService('URGENCE', {
      arrivalTime: ' 08:00 ',
      triageLevel: '2',
      initialSeverity: 'ok',
    }).arrivalTime,
    '08:00'
  );
  t.equal(
    specialtyPayloadForService('ONCOLOGIE', { tumorType: 'X', stage: 'I', currentTreatment: 'Y' })
      .tumorType,
    'X'
  );
  t.equal(specialtyPayloadForService('GENERAL', { notes: '  n  ' }).notes, 'n');
  t.equal(
    specialtyPayloadForService('CARDIOLOGIE', { restingHeartRate: Number.NaN }).restingHeartRate,
    undefined
  );
  t.end();
});

test('patientForm: api messages + empty form', (t) => {
  t.match(patientFormApiMessage(new ApiError('x', 404), 'load'), /introuvable/i);
  t.match(patientFormApiMessage(new ApiError('x', 403), 'load'), /consulter/i);
  t.match(patientFormApiMessage(new ApiError('', 500), 'load'), /charger/i);
  t.match(patientFormApiMessage(new ApiError('x', 400), 'create'), /invalides/i);
  t.match(patientFormApiMessage(new ApiError('x', 403), 'create'), /créer/i);
  t.match(patientFormApiMessage(new ApiError('x', 403), 'update'), /modifier/i);
  t.match(patientFormApiMessage(new ApiError('x', 404), 'update'), /introuvable/i);
  t.match(patientFormApiMessage(new ApiError('x', 409), 'update'), /Conflit/i);
  t.match(patientFormApiMessage(new ApiError('x', 500), 'update'), /enregistrement/i);
  t.match(patientFormApiMessage(new ApiError('fallback', 418), 'update'), /fallback|erreur/i);
  const empty = createEmptyPatientForm('URGENCE');
  t.equal(empty.service, 'URGENCE');
  t.equal(empty.status, 'STABLE');
  t.equal(empty.firstName, '');
  t.end();
});

test('dashboard utils: occupancyPercent + serviceCountRows', (t) => {
  t.equal(occupancyPercent(8, 10, 80), 80);
  t.equal(occupancyPercent(8, 10), 80);
  t.equal(occupancyPercent(1, 0), 0);
  t.equal(occupancyPercent(0, 0, null), 0);

  t.deepEqual(serviceCountRows({}), []);
  const rows = serviceCountRows({ GENERAL: 2, URGENCE: 1 });
  t.equal(rows.length, 4);
  t.equal(rows.find((r) => r.service === 'GENERAL')?.count, 2);
  t.equal(rows.find((r) => r.service === 'CARDIOLOGIE')?.count, 0);
  t.equal(formatLastUpdated(null), null);
  t.match(String(formatLastUpdated(new Date('2026-08-13T14:00:00'))), /\d{2}:\d{2}/);
  t.end();
});

test('prescriptions: validatePrescriptionForm + payload sans doctorId', (t) => {
  const errors = validatePrescriptionForm({
    prescribedAt: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
  });
  t.match(errors.prescribedAt, /date.*obligatoire/i);
  t.match(errors['med-0-name'], /nom.*obligatoire/i);
  t.match(errors['med-0-dosage'], /dosage.*obligatoire/i);
  t.match(errors['med-0-frequency'], /fréquence.*obligatoire/i);
  t.match(errors['med-0-duration'], /durée.*obligatoire/i);

  const emptyMeds = validatePrescriptionForm({ prescribedAt: '2026-08-12T10:00:00.000Z', medications: [] });
  t.match(emptyMeds.medications, /au moins un/i);

  const payload = buildCreatePayload(
    'p1',
    '2026-08-12T10:00',
    '  note  ',
    [{ name: ' Para ', dosage: '1g', frequency: '3x', duration: '5j', instructions: '' }]
  );
  t.equal(payload.patientId, 'p1');
  t.equal(Object.prototype.hasOwnProperty.call(payload, 'doctorId'), false);
  t.equal(payload.medications[0].name, 'Para');
  t.equal(payload.notes, 'note');

  const invalidDate = validatePrescriptionForm({
    prescribedAt: 'not-a-date',
    medications: [{ name: 'Para', dosage: '1g', frequency: '3x', duration: '5j' }],
  });
  t.match(invalidDate.prescribedAt, /invalide/i);
  t.end();
});

test('prescriptions: helpers date + emptyMedication', (t) => {
  t.equal(emptyMedication().name, '');
  t.equal(toDatetimeLocalValue('not-a-date'), '');
  t.match(toDatetimeLocalValue('2026-08-12T10:30:00.000Z'), /2026-08-12T/);
  t.equal(fromDatetimeLocalValue('not-a-date'), '');
  t.equal(formatPrescriptionDate(null), '—');
  t.equal(formatPrescriptionDate('not-a-date').slice(0, 10), 'not-a-date');
  t.match(formatPrescriptionDate('2026-08-12T10:00:00.000Z'), /2026/);
  t.end();
});

test('prescriptions: prescriptionApiMessage statuts', (t) => {
  t.match(prescriptionApiMessage(new ApiError('x', 403), 'create'), /autorisation/i);
  t.match(prescriptionApiMessage(new ApiError('x', 404), 'load'), /introuvable/i);
  t.match(prescriptionApiMessage(new ApiError('x', 409), 'cancel'), /déjà annulée/i);
  t.match(prescriptionApiMessage(new ApiError('bad', 400), 'create'), /bad|invalides/i);
  t.match(prescriptionApiMessage(new ApiError('x', 500), 'load'), /charger/i);
  t.match(prescriptionApiMessage(new ApiError('x', 500), 'create'), /enregistrement/i);
  t.match(prescriptionApiMessage(new ApiError('autre', 418), 'create'), /autre|erreur/i);
  t.end();
});

test('medicalHistory: labels + dates + metadata', (t) => {
  t.equal(medicalHistoryEventLabel('PRESCRIPTION'), 'Prescription');
  t.equal(medicalHistoryEventLabel('RECORD_UPDATE'), 'Modification du dossier');
  t.equal(medicalHistoryEventVariant('PRESCRIPTION'), 'info');
  t.equal(medicalHistoryEventVariant('UNKNOWN'), 'default');
  t.equal(formatMedicalHistoryDate(null), '—');
  t.match(formatMedicalHistoryDate('2026-08-12T14:30:00.000Z'), /2026/);
  t.equal(dateInputToIso(''), undefined);
  t.equal(dateInputToIso('2026-08-10'), '2026-08-10T00:00:00.000Z');
  t.equal(dateInputToIso('2026-08-10', true), '2026-08-10T23:59:59.999Z');
  t.match(
    String(medicalHistoryMetadataLabel({ prescriptionId: 'rx-abcdef12', action: 'CREATED' })),
    /Ordonnance|Création/
  );
  t.equal(medicalHistoryMetadataLabel(null), null);
  t.end();
});

test('medicalHistory: medicalHistoryApiMessage', (t) => {
  t.match(medicalHistoryApiMessage(new ApiError('x', 403)), /autorisation/i);
  t.match(medicalHistoryApiMessage(new ApiError('x', 404)), /introuvable/i);
  t.match(medicalHistoryApiMessage(new ApiError('bad', 400)), /bad|Filtres/i);
  t.match(medicalHistoryApiMessage(new ApiError('x', 500)), /historique/i);
  t.end();
});

test('notifications: labels + unread + validation', (t) => {
  t.equal(notificationStatusLabel('PENDING'), 'Planifiée');
  t.equal(notificationStatusLabel('SENT'), 'Envoyée');
  t.equal(notificationTypeLabel('REMINDER'), 'Rappel');
  t.equal(isNotificationUnread('SENT'), true);
  t.equal(isNotificationUnread('READ'), false);
  const errors = validateNotificationForm({
    recipientId: '',
    type: '',
    title: '',
    message: '',
    scheduledAtLocal: '',
  });
  t.ok(errors.recipientId);
  t.ok(errors.title);
  const payload = buildNotificationPayload({
    recipientId: 'u1',
    type: 'GENERAL',
    title: 'T',
    message: 'M',
    scheduledAtLocal: '2026-08-12T10:00',
  });
  t.equal(payload.recipientId, 'u1');
  t.match(payload.scheduledAt, /2026-08-12/);
  t.end();
});

test('notifications: notificationApiMessage', (t) => {
  t.match(notificationApiMessage(new ApiError('x', 403), 'create'), /autorisation/i);
  t.match(notificationApiMessage(new ApiError('x', 404), 'load'), /introuvable/i);
  t.match(notificationApiMessage(new ApiError('x', 409), 'cancel'), /PENDING|planifiées/i);
  t.match(notificationApiMessage(new ApiError('x', 500), 'load'), /charger/i);
  t.end();
});
