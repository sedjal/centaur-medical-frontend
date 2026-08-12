import { defineComponent, onMounted, ref, computed } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getDashboardStats } from '../services/patients';
import type { ServiceType } from '../types';
import { serviceLabel } from '../utils/permissions';

const SERVICES: Array<{ key: ServiceType; icon: string }> = [
  { key: 'GENERAL', icon: '▣' },
  { key: 'URGENCE', icon: '▣' },
  { key: 'ONCOLOGIE', icon: '▣' },
  { key: 'CARDIOLOGIE', icon: '▣' },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  MEDECIN: 'Médecin',
  SECRETAIRE: 'Secrétaire',
};

export default defineComponent({
  name: 'AppLayout',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const serviceCounts = ref<Record<string, number>>({});

    onMounted(async () => {
      try {
        const stats = await getDashboardStats();
        serviceCounts.value = stats.byService || {};
      } catch {
        /* sidebar counts are optional */
      }
    });

    function link(name: string, label: string, visible = true) {
      if (!visible) return null;
      const active =
        route.name === name &&
        (name !== 'patients' || !route.query.service);
      return (
        <a
          class={`nav-link ${active ? 'active' : ''}`}
          href="#"
          onClick={(e: Event) => {
            e.preventDefault();
            void router.push({ name });
          }}
        >
          {label}
        </a>
      );
    }

    function serviceLink(service: ServiceType) {
      const count = serviceCounts.value[service] ?? 0;
      const active = route.name === 'patients' && route.query.service === service;
      return (
        <a
          class={`nav-link nav-link-service ${active ? 'active' : ''}`}
          href="#"
          onClick={(e: Event) => {
            e.preventDefault();
            void router.push({ name: 'patients', query: { service } });
          }}
        >
          <span class="nav-service-label">
            <span class="nav-service-icon">▣</span>
            {serviceLabel(service)}
          </span>
          <span class="nav-count">{count}</span>
        </a>
      );
    }

    const roleLabel = computed(
      () => ROLE_LABELS[auth.user?.role || ''] || auth.user?.role || ''
    );

    return () => (
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>CENTAUR MEDICAL</strong>
              <span>Gestion des dossiers</span>
            </div>
          </div>

          <div class="nav-section">Menu</div>
          {link('dashboard', 'Dashboard')}
          {link('patients', 'Patients')}

          <div class="nav-section">Services</div>
          {SERVICES.map((s) => serviceLink(s.key))}

          <div class="nav-section">Administration</div>
          {link('users', 'Utilisateurs', auth.hasPermission('users:read'))}
          {link('roles', 'Rôles & permissions', auth.hasPermission('roles:manage'))}
          {link('audit', 'Historique', auth.hasPermission('audit:read'))}

          <div style="flex:1" />
          <button
            class="btn btn-ghost"
            style="margin:8px 12px"
            onClick={() => {
              auth.logout();
              void router.push({ name: 'login' });
            }}
          >
            Déconnexion
          </button>
        </aside>

        <div class="main">
          <header class="topbar">
            <div>
              <div style="font-weight:600">{String(route.meta.title || 'Centaur Medical')}</div>
              <div style="font-size:13px;color:var(--muted)">
                {String(route.meta.subtitle || roleLabel.value)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;color:var(--muted)">
              <span>
                {auth.fullName}
                {roleLabel.value ? `, ${roleLabel.value}` : ''}
              </span>
              <div class="avatar">
                {(auth.user?.firstName || 'U')[0]}
                {(auth.user?.lastName || '')[0] || ''}
              </div>
            </div>
          </header>
          <RouterView />
        </div>
      </div>
    );
  },
});
