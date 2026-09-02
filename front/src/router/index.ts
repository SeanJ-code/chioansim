import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  START_LOCATION,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from '@/stores/auth-store';

/*
* If not building with SSR mode, you can
* directly export the Router instantiation;
*
* The function below can be async too; either use
* async/await or return a Promise which resolves
* with the Router instance.
*/
export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : (import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, from) => {
    if (import.meta.env.QUASAR_SERVER || from === START_LOCATION) return true;

    const auth = useAuthStore(store);
    await auth.restoreSession();
    const user = auth.user;
    const isGeneralPage = to.path === '/' || ['/users', '/caregivers', '/organizations'].some((path) => to.path.startsWith(path));

    if (to.meta.requiresAuth && (!user || (to.meta.role && user.role !== to.meta.role))) return { name: 'login' };
    if (user?.role === 'ADMIN' && isGeneralPage) return { name: 'admin-dashboard' };
    if (user?.role === 'NURSE' && (isGeneralPage || to.path.startsWith('/admin'))) return { name: 'nurse-workspace' };
    if (user?.role === 'USER' && (to.path === '/' || to.path.startsWith('/organizations'))) return { name: 'users' };

    return true;
  });

  return Router;
});
