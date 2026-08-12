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
} from '../../src/utils/permissions';
import {
  emptySpecialty,
  mapSpecialtyFromApi,
  validateSpecialty,
} from '../../src/utils/patientForm';

test('can()', (t) => {
  t.equal(can(['patients:read'], 'patients:read'), true);
  t.equal(can(['patients:read'], 'patients:delete'), false);
  t.equal(can(undefined, 'patients:read'), false);
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
  t.equal(validateSpecialty('URGENCE', {}), 'Emergency fields required');
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
