import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

jest.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, name: 'patient-create' }),
  useRouter: () => ({ push: jest.fn() }),
}));

import PatientFormView from '../../src/views/PatientFormView';

describe('PatientFormView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders common patient fields', () => {
    const wrapper = mount(PatientFormView);
    expect(wrapper.text()).toContain('New patient');
    expect(wrapper.text()).toContain('First name');
    expect(wrapper.text()).toContain('Service');
  });

  it('shows oncology fields when service is ONCOLOGIE', async () => {
    const wrapper = mount(PatientFormView);
    const select = wrapper.find('select');
    await select.setValue('ONCOLOGIE');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Tumor type');
    expect(wrapper.text()).toContain('Stage');
  });
});
