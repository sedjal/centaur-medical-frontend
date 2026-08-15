import { defineComponent, onMounted, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useNotifications } from '../../composables/useNotifications';
import { roleDisplayLabel } from '../../utils/labels';
import NotificationBadge from '../notification/NotificationBadge';

export default defineComponent({
  name: 'Topbar',
  props: {
    onMenuToggle: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const { unreadCount, fetchUnreadCount } = useNotifications();

    onMounted(() => {
      if (auth.isAuthenticated && auth.hasPermission('notifications:read')) {
        void fetchUnreadCount();
      }
    });

    function logout() {
      auth.logout();
      void router.push({ name: 'login' });
    }

    function goNotifications() {
      void router.push({ name: 'notifications' });
    }

    return () => (
      <header class="topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="topbar-menu-btn"
            aria-label="Menu"
            onClick={() => props.onMenuToggle()}
          >
            ☰
          </button>
          <div class="topbar-titles">
            <h1 class="topbar-title">{String(route?.meta?.title || 'Centaur Medical')}</h1>
            {route?.meta?.subtitle && (
              <p class="topbar-subtitle">{String(route.meta.subtitle)}</p>
            )}
          </div>
        </div>

        <div class="topbar-center">
          <div class="topbar-search">
            <span class="topbar-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              class="topbar-search-input"
              placeholder="Rechercher un patient…"
              disabled
              title="Recherche globale — disponible prochainement"
            />
          </div>
        </div>

        <div class="topbar-right">
          {auth.hasPermission('notifications:read') ? (
            <NotificationBadge count={unreadCount.value} onClick={goNotifications} />
          ) : (
            <button
              type="button"
              class="topbar-icon-btn"
              title="Notifications"
              aria-label="Notifications"
              disabled
            >
              <span class="topbar-bell">◔</span>
            </button>
          )}

          <div class="topbar-user">
            <div class="topbar-user-text">
              <span class="topbar-user-name">{auth.fullName}</span>
              <span class="topbar-user-role">{roleDisplayLabel(auth.user?.role)}</span>
            </div>
            <div class="avatar topbar-avatar">
              {(auth.user?.firstName || 'U')[0]}
              {(auth.user?.lastName || '')[0] || ''}
            </div>
          </div>

          <button type="button" class="topbar-logout-btn" onClick={logout} title="Déconnexion">
            ↪
          </button>
        </div>
      </header>
    );
  },
});
