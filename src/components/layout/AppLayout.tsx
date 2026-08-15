import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default defineComponent({
  name: 'AppLayout',
  setup() {
    const sidebarOpen = ref(false);
    const isMobile = ref(false);

    function checkMobile() {
      isMobile.value = window.matchMedia('(max-width: 960px)').matches;
      if (!isMobile.value) sidebarOpen.value = false;
    }

    function toggleSidebar() {
      sidebarOpen.value = !sidebarOpen.value;
    }

    function closeSidebar() {
      sidebarOpen.value = false;
    }

    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });

    return () => (
      <div class="app-shell">
        {isMobile.value && sidebarOpen.value && (
          <div class="sidebar-backdrop" onClick={closeSidebar} role="presentation" />
        )}

        <Sidebar open={!isMobile.value || sidebarOpen.value} onClose={closeSidebar} />

        <div class="main">
          <Topbar onMenuToggle={toggleSidebar} />
          <main class="main-content">
            <RouterView />
          </main>
        </div>
      </div>
    );
  },
});
