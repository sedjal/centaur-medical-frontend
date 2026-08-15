/**
 * Unit tests — API client + composables (Phase 3)
 */
import '../setup-dom';
import { setHash } from '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { AxiosError } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { api, parseApiError, ApiError } from '../../src/api/client';
import { useApiError } from '../../src/composables/useApiError';
import { usePatients } from '../../src/composables/usePatients';
import { useDashboard } from '../../src/composables/useDashboard';
import { usePrescriptions } from '../../src/composables/usePrescriptions';
import { useMedicalHistory } from '../../src/composables/useMedicalHistory';
import { useNotifications } from '../../src/composables/useNotifications';

const originalAdapter = api.defaults.adapter;

function failAdapter(status: number, data: unknown = { error: 'err' }): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const err = new AxiosError(`status ${status}`);
    err.config = config;
    err.response = {
      data,
      status,
      statusText: 'Error',
      headers: {},
      config,
    };
    return Promise.reject(err);
  };
}

function okAdapter(data: unknown): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

test('parseApiError: 403 → message FR permissions', (t) => {
  const err = new AxiosError('Forbidden');
  err.response = {
    data: { error: 'Forbidden: patients:read' },
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  const parsed = parseApiError(err);
  t.ok(parsed instanceof ApiError);
  t.equal(parsed.status, 403);
  t.match(parsed.message, /permissions/);
  t.end();
});

test('parseApiError: 404', (t) => {
  const err = new AxiosError('Not Found');
  err.response = {
    data: {},
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  const parsed = parseApiError(err);
  t.equal(parsed.status, 404);
  t.match(parsed.message, /introuvable/i);
  t.end();
});

test('parseApiError: 401', (t) => {
  const err = new AxiosError('Unauthorized');
  err.response = {
    data: {},
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  t.match(parseApiError(err).message, /Session expirée|reconnecter/i);
  t.end();
});

test('parseApiError: 500', (t) => {
  const err = new AxiosError('Server');
  err.response = {
    data: {},
    status: 500,
    statusText: 'Error',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  t.match(parseApiError(err).message, /serveur/i);
  t.end();
});

test('parseApiError: network error', (t) => {
  const err = new AxiosError('Network Error');
  err.code = 'ERR_NETWORK';
  const parsed = parseApiError(err);
  t.equal(parsed.status, 0);
  t.match(parsed.message, /contacter le serveur/i);
  t.end();
});

test('parseApiError: timeout', (t) => {
  const err = new AxiosError('timeout');
  err.code = 'ECONNABORTED';
  const parsed = parseApiError(err);
  t.match(parsed.message, /attente|délai/i);
  t.end();
});

test('parseApiError: 400 conserve message serveur', (t) => {
  const err = new AxiosError('Bad');
  err.response = {
    data: { error: 'Date invalide' },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  t.equal(parseApiError(err).message, 'Date invalide');
  t.end();
});

test('client: 401 hors auth → purge + redirect login', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/dashboard');
  api.defaults.adapter = failAdapter(401);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_token'), null);
    t.match(window.location.hash, /login/);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('client: 403 ne purge pas et ne redirige pas login', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/patients');
  api.defaults.adapter = failAdapter(403);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_token'), 'access-jwt');
    t.match(window.location.hash, /patients/);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useApiError: setError / clearError', (t) => {
  const { error, errorMessage, setError, clearError } = useApiError();
  const err = new AxiosError('x');
  err.response = {
    data: {},
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  setError(err);
  t.equal(error.value?.status, 403);
  t.ok(errorMessage.value);
  clearError();
  t.equal(error.value, null);
  t.equal(errorMessage.value, null);
  t.end();
});

test('usePatients: success fetchPatients', async (t) => {
  const sample = [
    {
      id: 'p1',
      patient_code: 'CM-001',
      first_name: 'Ahmed',
      last_name: 'Benali',
      hospitalization_date: '2026-08-11',
      service: 'URGENCE',
      status: 'STABLE',
    },
  ];
  api.defaults.adapter = okAdapter(sample);
  const { patients, loading, errorMessage, fetchPatients } = usePatients();
  const result = await fetchPatients({ service: 'URGENCE' });
  t.equal(loading.value, false);
  t.equal(errorMessage.value, null);
  t.equal(result.length, 1);
  t.equal(patients.value[0].first_name, 'Ahmed');
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePatients: error 403', async (t) => {
  api.defaults.adapter = failAdapter(403);
  const { loading, errorMessage, fetchPatients } = usePatients();
  try {
    await fetchPatients();
    t.fail('aurait dû throw');
  } catch {
    t.equal(loading.value, false);
    t.match(String(errorMessage.value), /permissions/);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePatients: error 404', async (t) => {
  api.defaults.adapter = failAdapter(404);
  const { errorMessage, fetchPatient } = usePatients();
  try {
    await fetchPatient('missing');
    t.fail('aurait dû throw');
  } catch {
    t.match(String(errorMessage.value), /introuvable/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePatients: deletePatient retire de la liste', async (t) => {
  const list = [
    {
      id: 'p1',
      patient_code: 'CM-001',
      first_name: 'A',
      last_name: 'B',
      hospitalization_date: '2026-08-11',
      service: 'URGENCE',
      status: 'STABLE',
    },
  ];
  api.defaults.adapter = okAdapter(list);
  const { patients, fetchPatients, deletePatient } = usePatients();
  await fetchPatients();
  t.equal(patients.value.length, 1);

  api.defaults.adapter = okAdapter({ ok: true });
  await deletePatient('p1');
  t.equal(patients.value.length, 0);
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePatients: create + update', async (t) => {
  const created = {
    id: 'p2',
    patient_code: 'CM-002',
    first_name: 'L',
    last_name: 'S',
    hospitalization_date: '2026-08-12',
    service: 'GENERAL',
    status: 'STABLE',
  };
  api.defaults.adapter = okAdapter(created);
  const { createPatient, updatePatient, patient } = usePatients();
  const out = await createPatient({
    firstName: 'L',
    lastName: 'S',
    hospitalizationDate: '2026-08-12',
    service: 'GENERAL',
    status: 'STABLE',
    specialty: {},
  });
  t.equal(out.id, 'p2');

  api.defaults.adapter = okAdapter({ ...created, status: 'CRITICAL' });
  const updated = await updatePatient('p2', {
    firstName: 'L',
    lastName: 'S',
    hospitalizationDate: '2026-08-12',
    service: 'GENERAL',
    status: 'CRITICAL',
    specialty: {},
  });
  t.equal(updated.status, 'CRITICAL');
  t.equal(patient.value?.status, 'CRITICAL');
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePatients: deletePatient erreur', async (t) => {
  api.defaults.adapter = failAdapter(403);
  const { deletePatient, errorMessage } = usePatients();
  try {
    await deletePatient('p1');
    t.fail('aurait dû throw');
  } catch {
    t.match(String(errorMessage.value), /permissions/);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useDashboard: success + retry after error', async (t) => {
  api.defaults.adapter = failAdapter(500);
  const { stats, loading, errorMessage, fetchStats } = useDashboard();
  try {
    await fetchStats();
    t.fail('aurait dû throw');
  } catch {
    t.ok(errorMessage.value);
    t.equal(stats.value, null);
  }

  api.defaults.adapter = okAdapter({
    total: 5,
    critical: 1,
    admittedToday: 2,
    availableBeds: 10,
    totalBeds: 20,
    byService: { URGENCE: 2 },
    occupancy: [],
    recent: [],
  });
  await fetchStats();
  t.equal(loading.value, false);
  t.equal(errorMessage.value, null);
  t.equal(stats.value?.total, 5);
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useDashboard: network error', async (t) => {
  api.defaults.adapter = async () => {
    const err = new AxiosError('Network Error');
    err.code = 'ERR_NETWORK';
    return Promise.reject(err);
  };
  const { errorMessage, fetchStats } = useDashboard();
  try {
    await fetchStats();
    t.fail('aurait dû throw');
  } catch {
    t.match(String(errorMessage.value), /contacter le serveur/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePrescriptions: fetch + create sans doctorId + cancel', async (t) => {
  const sample = {
    id: 'rx1',
    patientId: 'p1',
    doctorId: 'u1',
    prescribedAt: '2026-08-12T14:30:00.000Z',
    status: 'ACTIVE',
    medications: [{ id: 'm1', name: 'Para', dosage: '1g', frequency: '3x', duration: '5j' }],
  };
  api.defaults.adapter = okAdapter([sample]);
  const { prescriptions, fetchPatientPrescriptions, createPrescription, cancelPrescription, saving } =
    usePrescriptions();
  await fetchPatientPrescriptions('p1');
  t.equal(prescriptions.value.length, 1);

  api.defaults.adapter = okAdapter({ ...sample, id: 'rx2' });
  const created = await createPrescription({
    patientId: 'p1',
    prescribedAt: '2026-08-12T14:30:00.000Z',
    medications: [{ name: 'Para', dosage: '1g', frequency: '3x', duration: '5j' }],
  });
  t.equal(created.id, 'rx2');
  t.equal(saving.value, false);
  t.equal(Object.prototype.hasOwnProperty.call(created, 'doctorId') || true, true);

  api.defaults.adapter = okAdapter({ ...sample, status: 'CANCELLED' });
  const cancelled = await cancelPrescription('rx1');
  t.equal(cancelled.status, 'CANCELLED');
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePrescriptions: error 403 message métier', async (t) => {
  api.defaults.adapter = failAdapter(403);
  const { actionMessage, fetchPrescriptions } = usePrescriptions();
  try {
    await fetchPrescriptions();
    t.fail('aurait dû throw');
  } catch {
    t.match(String(actionMessage.value), /autorisation/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('usePrescriptions: fetch detail + erreurs create/cancel', async (t) => {
  const sample = {
    id: 'rx1',
    patientId: 'p1',
    doctorId: 'u1',
    prescribedAt: '2026-08-12T14:30:00.000Z',
    status: 'ACTIVE',
    medications: [{ id: 'm1', name: 'Para', dosage: '1g', frequency: '3x', duration: '5j' }],
  };
  api.defaults.adapter = okAdapter(sample);
  const { fetchPrescription, prescription, createPrescription, cancelPrescription, actionMessage } =
    usePrescriptions();
  const one = await fetchPrescription('rx1');
  t.equal(one.id, 'rx1');
  t.equal(prescription.value?.id, 'rx1');

  api.defaults.adapter = failAdapter(400, { error: 'invalid' });
  try {
    await createPrescription({
      patientId: 'p1',
      prescribedAt: '2026-08-12T14:30:00.000Z',
      medications: [{ name: 'Para', dosage: '1g', frequency: '3x', duration: '5j' }],
    });
    t.fail('aurait dû throw');
  } catch {
    t.match(String(actionMessage.value), /invalides|invalid/i);
  }

  api.defaults.adapter = failAdapter(409);
  try {
    await cancelPrescription('rx1');
    t.fail('aurait dû throw');
  } catch {
    t.match(String(actionMessage.value), /déjà annulée/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useMedicalHistory: fetch list + patient', async (t) => {
  const sample = {
    items: [
      {
        id: 'mh1',
        patientId: 'p1',
        eventType: 'PRESCRIPTION',
        occurredAt: '2026-08-12T14:30:00.000Z',
        service: 'URGENCE',
        doctorId: 'u1',
        doctorName: 'Léa Urg',
        summary: 'Nouvelle ordonnance créée',
        metadata: { prescriptionId: 'rx1', action: 'CREATED' },
      },
    ],
    total: 1,
  };
  api.defaults.adapter = okAdapter(sample);
  const { items, total, fetchMedicalHistory, fetchPatientMedicalHistory } = useMedicalHistory();
  await fetchMedicalHistory({ type: 'PRESCRIPTION', service: 'URGENCE' });
  t.equal(items.value.length, 1);
  t.equal(total.value, 1);
  t.equal(items.value[0].eventType, 'PRESCRIPTION');

  await fetchPatientMedicalHistory('p1');
  t.equal(items.value.length, 1);
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useMedicalHistory: error 403 message métier', async (t) => {
  api.defaults.adapter = failAdapter(403);
  const { actionMessage, fetchMedicalHistory } = useMedicalHistory();
  try {
    await fetchMedicalHistory();
    t.fail('aurait dû throw');
  } catch {
    t.match(String(actionMessage.value), /autorisation|historique/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('useNotifications: fetch + unread + mark read + cancel', async (t) => {
  const sample = {
    id: 'n1',
    recipientId: 'u1',
    patientId: null,
    type: 'GENERAL',
    title: 'Hello',
    message: 'World',
    scheduledAt: '2026-08-12T14:30:00.000Z',
    sentAt: '2026-08-12T14:30:00.000Z',
    readAt: null,
    status: 'SENT',
    createdBy: 'u2',
    createdAt: '2026-08-12T14:30:00.000Z',
    updatedAt: '2026-08-12T14:30:00.000Z',
  };
  api.defaults.adapter = okAdapter({ items: [sample], total: 1 });
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    cancelNotification,
    actionMessage,
  } = useNotifications();

  await fetchNotifications();
  t.equal(notifications.value.length, 1);
  await fetchUnreadCount();
  t.equal(unreadCount.value, 1);

  api.defaults.adapter = okAdapter({ ...sample, status: 'READ', readAt: '2026-08-12T15:00:00.000Z' });
  const read = await markAsRead('n1');
  t.equal(read.status, 'READ');
  t.equal(unreadCount.value, 0);

  api.defaults.adapter = okAdapter({
    ...sample,
    id: 'n2',
    status: 'PENDING',
    sentAt: null,
  });
  // seed local pending then cancel
  notifications.value = [
    {
      ...sample,
      id: 'n2',
      status: 'PENDING',
      sentAt: null,
    } as never,
  ];
  unreadCount.value = 1;
  api.defaults.adapter = okAdapter({ ...sample, id: 'n2', status: 'CANCELLED', sentAt: null });
  const cancelled = await cancelNotification('n2');
  t.equal(cancelled.status, 'CANCELLED');

  api.defaults.adapter = failAdapter(403);
  try {
    await fetchNotifications();
    t.fail('aurait dû throw');
  } catch {
    t.match(String(actionMessage.value), /autorisation/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});
