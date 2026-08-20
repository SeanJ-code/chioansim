import { defineBoot } from '#q-app';
import axios from 'axios';

const api = axios.create({
  // 開發時走 Quasar 的同源 /api proxy，避免不同開發埠造成 CORS；正式部署仍可用環境變數指定 API 網址。
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  withCredentials: true,
});

const accessToken = sessionStorage.getItem('chioansim-access-token');
if (accessToken) api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
