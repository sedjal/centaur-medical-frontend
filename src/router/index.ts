import { createRouter, createWebHashHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView';
import MfaView from '../views/MfaView';
import ChangePasswordView from '../views/ChangePasswordView';
import ForgotPasswordView from '../views/ForgotPasswordView';
import ResetPasswordView from '../views/ResetPasswordView';
import AppLayout from '../components/AppLayout';
import DashboardView from '../views/DashboardView';
import PatientsView from '../views/PatientsView';
import PatientFormView from '../views/PatientFormView';
import UsersView from '../views/UsersView';
import RolesView from '../views/RolesView';
import AuditView from '../views/AuditView';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/mfa', name: 'mfa', component: MfaView, meta: { public: true } },
  {
    path: '/change-password',
    name: 'change-password',
    component: ChangePasswordView,
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordView,
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { public: true },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard', subtitle: "Vue globale de l'établissement" },
      },
      {
        path: 'patients',
        name: 'patients',
        component: PatientsView,
        meta: { title: 'Patients', subtitle: 'Dossiers médicaux actifs' },
      },
      {
        path: 'patients/new',
        name: 'patient-create',
        component: PatientFormView,
        meta: { title: 'Nouveau patient', permission: 'patients:create' },
      },
      {
        path: 'patients/:id',
        name: 'patient-edit',
        component: PatientFormView,
        meta: { title: 'Fiche patient', permission: 'patients:update' },
      },
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { title: 'Utilisateurs', subtitle: 'Comptes et rôles', permission: 'users:read' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: RolesView,
        meta: {
          title: 'Rôles & permissions',
          subtitle: 'Contrôle d’accès RBAC',
          permission: 'roles:manage',
        },
      },
      {
        path: 'audit',
        name: 'audit',
        component: AuditView,
        meta: { title: 'Historique', subtitle: 'Journal des opérations', permission: 'audit:read' },
      },
    ],
  },
];

export function createAppRouter(history: RouterHistory = createWebHashHistory()) {
  const router = createRouter({
    history,
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
