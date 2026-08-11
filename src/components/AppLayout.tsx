import { defineComponent } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'AppLayout',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();

    function link(name: string, label: string, visible = true) {
      if (!visible) return null;
      return (
        <a
          class={`nav-link ${route.name === name ? 'active' : ''}`}
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

    return () => (
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>CENTAUR MEDICAL</strong>
              <span>Records system</span>
            </div>
          </div>

          <div class="nav-section">Menu</div>
          {link('dashboard', 'Dashboard')}
          {link('patients', 'Patients')}

          <div class="nav-section">Services</div>
          {link('patients', 'Général / Urgence / Onco / Cardio')}

          <div class="nav-section">Admin</div>
          {link('users', 'Utilisateurs', auth.hasPermission('users:read'))}
          {link('audit', 'Audit Logs', auth.hasPermission('audit:read'))}

          <div style="flex:1" />
          <button
            class="btn btn-ghost"
            style="margin:8px 12px"
            onClick={() => {
              auth.logout();
              void router.push({ name: 'login' });
            }}
          >
            Sign out
          </button>
        </aside>

        <div class="main">
          <header class="topbar">
            <div>
              <div style="font-weight:600">{String(route.meta.title || 'Centaur Medical')}</div>
              <div style="font-size:13px;color:var(--muted)">{auth.user?.role}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;color:var(--muted)">
              <span>{auth.fullName}</span>
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
