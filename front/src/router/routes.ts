import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { radialMenu: false },
  },
  {
    path: '/register/:role(user|patient|nurse)',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { radialMenu: false },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { radialMenu: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/pages/IndexPage.vue'), meta: { radialMenu: false } },
      { path: 'users', name: 'users', component: () => import('@/pages/UsersPage.vue') },
      {
        path: 'users/recipients/new',
        name: 'recipient-create',
        component: () => import('@/pages/CareRecipientCreatePage.vue'),
      },
      { path: 'caregivers', name: 'caregivers', component: () => import('@/pages/CaregiversPage.vue') },
      {
        path: 'nurse/workspace',
        name: 'nurse-workspace',
        component: () => import('@/pages/NurseWorkspacePage.vue'),
        meta: { requiresAuth: true, role: 'NURSE' },
      },
      {
        path: 'admin',
        name: 'admin-dashboard',
        component: () => import('@/pages/AdminDashboardPage.vue'),
        meta: { requiresAuth: true, role: 'ADMIN', radialMenu: false },
      },
      { path: 'organizations', name: 'organizations', component: () => import('@/pages/OrganizationsPage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
    meta: { radialMenu: false },
  },
];

export default routes;
