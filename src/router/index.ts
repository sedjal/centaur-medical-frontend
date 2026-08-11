import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView';
import MfaView from '../views/MfaView';
import AppLayout from '../components/AppLayout';
import DashboardView from '../views/DashboardView';
import PatientsView from '../views/PatientsView';
import PatientFormView from '../views/PatientFormView';
import UsersView from '../views/UsersView';
import AuditView from '../views/AuditView';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/mfa', name: 'mfa', component: MfaView, meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard' },
      },
      {
        path: 'patients',
        name: 'patients',
        component: PatientsView,
        meta: { title: 'Patients' },
      },
      {
        path: 'patients/new',
        name: 'patient-create',
        component: PatientFormView,
        meta: { title: 'New patient', permission: 'patients:create' },
      },
      {
        path: 'patients/:id',
        name: 'patient-edit',
        component: PatientFormView,
        meta: { title: 'Edit patient', permission: 'patients:update' },
      },
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { title: 'Users', permission: 'users:read' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: AuditView,
        meta: { title: 'Audit logs', permission: 'audit:read' },
      },
    ],
  },
];

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (to.meta.public) {
      if (auth.isAuthenticated && to.name === 'login') return { name: 'dashboard' };
      return true;
    }
    if (!auth.isAuthenticated) return { name: 'login' };
    if (!auth.user) {
      try {
        await auth.loadMe();
      } catch {
        auth.logout();
        return { name: 'login' };
      }
    }
    const perm = to.meta.permission as string | undefined;
    if (perm && !auth.hasPermission(perm as never)) {
      return { name: 'dashboard' };
    }
    return true;
  });

  return router;
}
