import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';

jest.mock('../../src/services/patients', () => ({
  listPatients: jest.fn().mockResolvedValue([
    {
      id: '1',
      patient_code: 'PT-000124',
      first_name: 'Ahmed',
      last_name: 'Benali',
      hospitalization_date: '2026-08-11',
      service: 'URGENCE',
      status: 'CRITICAL',
    },
  ]),
  deletePatient: jest.fn(),
}));

jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import PatientsView from '../../src/views/PatientsView';

describe('PatientsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.user = {
      email: 'x@y.com',
      role: 'ADMIN',
      permissions: [
        'patients:read',
        'patients:create',
        'patients:update',
        'patients:delete',
      ],
      firstName: 'A',
      lastName: 'B',
    };
  });

  it('shows patients heading and create button for admin', async () => {
    const wrapper = mount(PatientsView);
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.text()).toContain('Patients');
    expect(wrapper.text()).toContain('New patient');
  });

  it('hides create button without permission', async () => {
    const auth = useAuthStore();
    auth.user = {
      email: 'd@y.com',
      role: 'DIRECTION',
      permissions: ['patients:read'],
      firstName: 'D',
      lastName: 'I',
    };
    const wrapper = mount(PatientsView);
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.text()).not.toContain('New patient');
  });
});

describe('Permission helper', () => {
  it('checks permission correctly', () => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.user = {
      email: 's@y.com',
      role: 'SECRETAIRE',
      permissions: ['patients:read', 'patients:create'],
      firstName: 'S',
      lastName: 'E',
    };
    expect(auth.hasPermission('patients:create')).toBe(true);
    expect(auth.hasPermission('patients:delete')).toBe(false);
  });
});

// silence unused
void defineComponent;
