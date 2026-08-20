import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

/*
* If not building with SSR mode, you can
* directly export the Router instantiation;
*
* The function below can be async too; either use
* async/await or return a Promise which resolves
* with the Router instance.
*/
export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : (import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    try {
      const user = JSON.parse(localStorage.getItem('chioansim-user') || 'null') as { role?: string } | null;
      const isGeneralPage = to.path === '/' || ['/users', '/caregivers', '/organizations'].some((path) => to.path.startsWith(path));

      if (user?.role === 'ADMIN' && isGeneralPage) return { name: 'admin-dashboard' };
      if (user?.role === 'NURSE' && (isGeneralPage || to.path.startsWith('/admin'))) return { name: 'nurse-workspace' };
      if (user?.role === 'USER' && (to.path === '/' || to.path.startsWith('/organizations'))) return { name: 'users' };
    } catch {
      // 無法讀取舊登入資料時，交由原本的頁面權限判斷處理。
    }

    return true;
  });

  return Router;
});
