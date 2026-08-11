import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginView from '../../src/views/LoginView';

jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders email and password fields', () => {
    const wrapper = mount(LoginView);
    expect(wrapper.text()).toContain('Sign in');
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
  });

  it('shows Centaur Medical brand', () => {
    const wrapper = mount(LoginView);
    expect(wrapper.text()).toContain('Centaur Medical');
  });
});
