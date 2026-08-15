import { defineComponent, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { roleDisplayLabel } from '../../utils/labels';
import { allowedHospitalServices, serviceLabel } from '../../utils/permissions';

export interface NavItem {
  name: string;
  label: string;
  icon?: string;
  visible?: boolean;
}

export default defineComponent({
  name: 'Sidebar',
  props: {
    open: { type: Boolean, default: true },
    onClose: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();

    const canReadPatients = () => auth.hasPermission('patients:read');
    const canReadPrescriptions = () => auth.hasPermission('prescriptions:read');
    const canReadMedicalHistory = () => auth.hasPermission('medical_history:read');
    const canReadNotifications = () => auth.hasPermission('notifications:read');

    const mainNav: NavItem[] = [
      { name: 'dashboard', label: 'Dashboard', icon: '▦', visible: true },
      { name: 'patients', label: 'Patients', icon: '◉', visible: canReadPatients() },
      { name: 'prescriptions', label: 'Prescriptions', icon: '℞', visible: canReadPrescriptions() },
      {
        name: 'history',
        label: 'Historique médical',
        icon: '◷',
        visible: canReadMedicalHistory(),
      },
      {
        name: 'notifications',
        label: 'Notifications',
        icon: '◔',
        visible: canReadNotifications(),
      },
    ];

    const adminNav: NavItem[] = [
      { name: 'users', label: 'Utilisateurs', visible: auth.hasPermission('users:read') },
      { name: 'roles', label: 'Rôles', visible: auth.hasPermission('roles:manage') },
      { name: 'audit', label: 'Audit', visible: auth.hasPermission('audit:read') },
    ];

    const visibleServices = () => allowedHospitalServices(auth.user?.permissions);
    const primaryService = () => visibleServices()[0];

    function isActive(name: string): boolean {
      return route.name === name;
    }

    function navigate(name: string) {
      void router.push({ name });
      props.onClose?.();
    }

    function navLink(item: NavItem) {
      if (item.visible === false) return null;
      return (
        <a
          key={item.name}
          class={`sidebar-nav-link ${isActive(item.name) ? 'active' : ''}`}
          href="#"
          onClick={(e: Event) => {
            e.preventDefault();
            navigate(item.name);
          }}
        >
          {item.icon && <span class="sidebar-nav-icon">{item.icon}</span>}
          <span>{item.label}</span>
        </a>
      );
    }

    return () => (
      <aside class={`sidebar ${props.open ? 'sidebar--open' : ''}`}>
        <div class="sidebar-brand">
          <div class="sidebar-brand-mark">CM</div>
          <div class="sidebar-brand-text">
            <strong>CENTaUR</strong>
            <span>Medical</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section">Menu principal</div>
          {mainNav.map(navLink)}

          {adminNav.some((n) => n.visible !== false) && (
            <>
              <div class="sidebar-section">Administration</div>
              {adminNav.map(navLink)}
            </>
          )}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-user-avatar">
              {(auth.user?.firstName || 'U')[0]}
              {(auth.user?.lastName || '')[0] || ''}
            </div>
            <div class="sidebar-user-info">
              <strong>{auth.fullName || 'Utilisateur'}</strong>
              <span>
                {roleDisplayLabel(auth.user?.role)}
                {primaryService() ? ` · ${serviceLabel(primaryService()!)}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="sidebar-logout"
            onClick={() => {
              auth.logout();
              void router.push({ name: 'login' });
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>
    );
  },
});
