import { defineComponent, onMounted, onUnmounted, ref, watch, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useNotifications } from '../../composables/useNotifications';
import { roleDisplayLabel } from '../../utils/labels';
import type { AppNotification } from '../../types';
import NotificationBadge from '../notification/NotificationBadge';
import NotificationDropdown from '../notification/NotificationDropdown';

export default defineComponent({
  name: 'Topbar',
  props: {
    onMenuToggle: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const { unreadCount, streamRevision, fetchUnreadCount, fetchNotifications, markAsRead, connect, disconnect } =
      useNotifications();
    const open = ref(false);
    const preview = ref<AppNotification[]>([]);
    const loadingPreview = ref(false);
    const wrapEl = ref<HTMLElement | null>(null);

    onMounted(() => {
      if (auth.isAuthenticated && auth.hasPermission('notifications:read')) {
        void fetchUnreadCount();
        connect();
      }
      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('keydown', onDocKey);
    });

    onUnmounted(() => {
      disconnect();
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onDocKey);
    });

    async function refreshPreview(clearOnError = false) {
      try {
        const data = await fetchNotifications();
        preview.value = (data.items || []).slice(0, 8);
      } catch {
        if (clearOnError) preview.value = [];
      }
    }

    watch(streamRevision, () => {
      if (!open.value) return;
      void refreshPreview();
    });

    function onDocDown(ev: MouseEvent) {
      if (!open.value) return;
      const el = wrapEl.value;
      if (el && ev.target instanceof Node && !el.contains(ev.target)) {
        open.value = false;
      }
    }

    function onDocKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') open.value = false;
    }

    function logout() {
      auth.logout();
      void router.push({ name: 'login' });
    }

    async function toggleDropdown() {
      if (!auth.hasPermission('notifications:read')) return;
      open.value = !open.value;
      if (!open.value) return;
      loadingPreview.value = true;
      try {
        await refreshPreview(true);
      } finally {
        loadingPreview.value = false;
      }
    }

    function goAll() {
      open.value = false;
      void router.push({ name: 'notifications' });
    }

    async function openItem(n: AppNotification) {
      open.value = false;
      if (n.status === 'SENT') {
        try {
          await markAsRead(n.id);
        } catch {
          /* ignore */
        }
      }
      void router.push({ name: 'notifications', query: { open: n.id } });
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

        <div class="topbar-right">
          {auth.hasPermission('notifications:read') ? (
            <div
              class="notif-bell"
              ref={(el: unknown) => {
                wrapEl.value = (el as HTMLElement) || null;
              }}
            >
              <NotificationBadge
                count={unreadCount.value}
                expanded={open.value}
                onClick={() => void toggleDropdown()}
              />
              <NotificationDropdown
                open={open.value}
                items={preview.value}
                loading={loadingPreview.value}
                onClose={() => {
                  open.value = false;
                }}
                onOpenAll={goAll}
                onOpenItem={(n: AppNotification) => void openItem(n)}
              />
            </div>
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
