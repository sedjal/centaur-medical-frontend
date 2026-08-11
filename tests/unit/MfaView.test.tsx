import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MfaView from '../../src/views/MfaView';

jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('MfaView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders MFA code input', () => {
    const wrapper = mount(MfaView);
    expect(wrapper.text()).toContain('Two-factor authentication');
    expect(wrapper.find('input').exists()).toBe(true);
  });
});
