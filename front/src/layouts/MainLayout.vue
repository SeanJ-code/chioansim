<template>
  <q-layout view="lHh Lpr lFf" class="site-layout">
    <q-header class="site-header" :class="{ 'site-header--scrolled': headerScrolled }">
      <q-toolbar class="site-navbar">
        <q-btn
          flat
          round
          class="menu-button lt-md"
          aria-label="開啟導覽選單"
          @click="toggleLeftDrawer"
        >
          <i class="bx bx-menu" aria-hidden="true"></i>
        </q-btn>

        <router-link class="navbar-brand" :to="brandLink" :aria-label="brandLabel">
          <span class="navbar-brand__mark" aria-hidden="true">
            <img class="navbar-brand__logo" src="/chioansimicon.svg" alt="">
          </span>
          <span>照安心</span>
        </router-link>

        <nav class="navbar-links gt-sm" aria-label="主要導覽">
          <router-link v-for="link in linksList" :key="link.link" :to="link.link">
            {{ link.label }}
          </router-link>
        </nav>

        <div class="navbar-care gt-xs">
          <ShieldCheck :size="19" aria-hidden="true" />
          <span>專業照護・安心相伴</span>
        </div>

        <q-btn
          v-if="authStore.user"
          class="login-button logout-button gt-xs"
          unelevated
          no-caps
          :loading="loggingOut"
          label="登出"
          @click="handleLogout"
        />
        <q-btn v-else class="login-button gt-xs" unelevated no-caps to="/login" label="安心登入" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" class="mobile-drawer" bordered>
      <q-list padding>
        <q-item-label header class="drawer-title">主要功能</q-item-label>
        <EssentialLink v-for="link in linksList" :key="link.label" v-bind="link" />
        <q-separator class="q-my-md" />
        <q-item v-if="authStore.user" clickable v-ripple @click="handleLogout">
          <q-item-section avatar><LogOut :size="22" /></q-item-section>
          <q-item-section><q-item-label>登出</q-item-label><q-item-label caption>安全離開照安心</q-item-label></q-item-section>
        </q-item>
        <q-item v-else clickable v-ripple to="/login">
          <q-item-section avatar><LogIn :size="22" /></q-item-section>
          <q-item-section><q-item-label>安心登入</q-item-label></q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <CareRadialMenu />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import EssentialLink, { type EssentialLinkProps } from '@/components/EssentialLink.vue';
import CareRadialMenu from '@/components/navigation/CareRadialMenu.vue';
import { LogIn, LogOut, ShieldCheck } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth-store';
import { useLiveSyncStore } from '@/stores/live-sync-store';
import 'boxicons/css/boxicons.min.css';
import { ScrollTrigger } from '@/composables/useGsap';

const publicLinks: EssentialLinkProps[] = [
  { label: '首頁', caption: '系統與環境狀態', icon: 'bx bx-home', link: '/' },
  { label: '使用者', caption: '受照護者與服務需求', icon: 'bx bx-user', link: '/users' },
  { label: '居服員', caption: '證照、時段與服務紀錄', icon: 'bx bx-first-aid', link: '/caregivers' },
  { label: '機構與企業', caption: 'B2B 照護合作方案', icon: 'bx bx-building-house', link: '/organizations' },
];

const linksList = computed<EssentialLinkProps[]>(() => {
  if (authStore.user?.role === 'ADMIN') {
    return [
      {
        label: '管理控制台',
        caption: '品質警訊、營運與成員管理',
        icon: 'bx bx-cog',
        link: '/admin',
      },
    ];
  }
  if (authStore.user?.role === 'USER') {
    return [
      {
        ...publicLinks[1]!,
        label: '我的預約平台',
        caption: '預約、照護進度與服務管理',
      },
      publicLinks[2]!,
    ];
  }
  if (authStore.user?.role !== 'NURSE') return publicLinks;
  return [
    {
      label: '我的工作台',
      caption: '任務、日誌與請假通報',
      icon: 'bx bx-briefcase',
      link: '/nurse/workspace',
    },
  ];
});

const isAdmin = computed(() => authStore.user?.role === 'ADMIN');
const isNurse = computed(() => authStore.user?.role === 'NURSE');
const isUser = computed(() => authStore.user?.role === 'USER');
const brandLink = computed(() => isAdmin.value ? '/admin' : isNurse.value ? '/nurse/workspace' : isUser.value ? '/users' : '/');
const brandLabel = computed(() => isAdmin.value ? '前往管理控制台' : isNurse.value ? '前往我的工作台' : isUser.value ? '前往我的預約平台' : '照安心首頁');

const leftDrawerOpen = ref(false);
const loggingOut = ref(false);
const headerScrolled = ref(false);
let headerTrigger: ScrollTrigger | undefined;
const authStore = useAuthStore();
const liveSync = useLiveSyncStore();
const router = useRouter();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleLogout() {
  loggingOut.value = true;
  try {
    liveSync.stop();
    await authStore.logout();
    leftDrawerOpen.value = false;
    await router.push('/');
  } finally {
    loggingOut.value = false;
  }
}

onMounted(async () => {
  headerTrigger = ScrollTrigger.create({
    start: 24,
    end: 'max',
    onUpdate: (self) => { headerScrolled.value = self.scroll() > 24; },
  });
  await authStore.restoreSession();
  const path = router.currentRoute.value.path;
  const isGeneralPage = path === '/' || ['/users', '/caregivers', '/organizations'].some((item) => path.startsWith(item));
  if (authStore.user?.role === 'ADMIN' && isGeneralPage) await router.replace('/admin');
  else if (authStore.user?.role === 'NURSE' && (isGeneralPage || path.startsWith('/admin'))) await router.replace('/nurse/workspace');
  else if (authStore.user?.role === 'USER' && (path === '/' || path.startsWith('/organizations'))) await router.replace('/users');
});
onBeforeUnmount(() => headerTrigger?.kill());
</script>

<style scoped>
.site-layout {
  --peach-milk: #fff9f5;
  --warm-white: #fffdfb;
  --chestnut: #6e5750;
  --chestnut-dark: #493833;
  --peach: #eb9079;
  --persimmon: #b84f16;
  background: var(--peach-milk);
}

.site-header {
  color: var(--chestnut-dark);
  background: rgb(255 253 251 / 94%);
  border-bottom: 1px solid rgb(110 87 80 / 12%);
  box-shadow: 0 8px 28px rgb(78 52 43 / 8%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: background var(--motion-normal) var(--ease-standard), box-shadow var(--motion-normal) var(--ease-standard);
}
.site-header--scrolled { background: rgb(255 253 251 / 88%); box-shadow: 0 10px 32px rgb(78 52 43 / 12%); }

.site-navbar {
  width: min(1180px, calc(100% - 32px));
  min-height: 76px;
  margin: 0 auto;
  gap: 24px;
  transition: min-height var(--motion-normal) var(--ease-standard);
}
.site-header--scrolled .site-navbar { min-height: 66px; }

.navbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--chestnut-dark);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-decoration: none;
  white-space: nowrap;
}

.navbar-brand__mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: white;
  background: var(--peach);
  border-radius: 50% 50% 46% 54%;
  box-shadow: 0 8px 20px rgb(235 144 121 / 26%);
  overflow: hidden;
}

.navbar-brand__logo {
  width: 100%;
  height: 100%;
  max-width: none;
  display: block;
  object-fit: contain;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar-links a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  color: var(--chestnut);
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
}

.navbar-links a:hover,
.navbar-links a.router-link-exact-active {
  color: var(--persimmon);
  background: rgb(235 144 121 / 12%);
}

.navbar-care {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--chestnut);
  font-size: 0.86rem;
  white-space: nowrap;
}

.navbar-care svg { color: var(--persimmon); }
.login-button { min-height: 44px; padding: 0 16px; color: white; background: var(--persimmon); border-radius: 13px; font-weight: 700; }
.logout-button { color: var(--persimmon); background: #fff1eb; border: 1px solid rgb(184 79 22 / 24%); }
.menu-button { min-width: 44px; min-height: 44px; color: var(--chestnut); }
.menu-button .bx { font-size: 26px; }
.drawer-title { color: var(--persimmon); font-weight: 700; letter-spacing: 0.08em; }

:deep(.mobile-drawer) { color: var(--chestnut-dark); background: var(--warm-white); }

@media (max-width: 599px) {
  .site-navbar { width: calc(100% - 16px); min-height: 68px; gap: 8px; }
  .navbar-brand { font-size: 1.15rem; }
  .navbar-brand__mark { width: 38px; height: 38px; }
}
</style>
