<template>
  <router-view v-slot="{ Component, route }">
    <transition name="page-soft" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';

const route = useRoute();
const pageMeta: Record<string, { title: string; description: string }> = {
  home: { title: '照安心｜找到合適的居服員', description: '照安心陪您找到合適的居服員，從了解需求到預約照護，多一份安心。' },
  caregivers: { title: '找居服員｜照安心', description: '瀏覽照安心認證居服員的服務地區、經驗與照護理念，找到適合家人的照護夥伴。' },
  login: { title: '登入｜照安心', description: '登入照安心，查看與管理您的照護服務。' },
  register: { title: '註冊｜照安心', description: '加入照安心，建立帳號並開始安排合適的照護服務。' },
};

useMeta(() => {
  const meta = pageMeta[String(route.name)] || { title: '照安心', description: '照安心陪您找到合適的居服員，安心安排日常照護。' };
  return { title: meta.title, meta: { description: { name: 'description', content: meta.description } } };
});
</script>

<style>
.page-soft-enter-active,
.page-soft-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-soft-enter-from { opacity: 0; transform: translateY(7px); }
.page-soft-leave-to { opacity: 0; transform: translateY(-5px); }
@media (prefers-reduced-motion: reduce) {
  .page-soft-enter-active,
  .page-soft-leave-active { transition: none; }
}
</style>
