<template>
  <div class="auth-page">
    <main class="auth-wrap" aria-labelledby="auth-title">
      <a class="skip-link" href="#auth-form">跳至登入表單</a>

      <header class="brand-bar">
        <router-link class="brand" to="/" aria-label="前往照安心首頁">
          <span class="brand-mark" aria-hidden="true">
            <img class="brand-mark__image" src="/chioansimicon.svg" alt="">
          </span>
          <span>照安心</span>
        </router-link>
        <div class="brand-actions">
          <p>專業照護，安心相伴</p>
          <router-link class="home-action" to="/">
            <Home :size="18" /><span>回到安心首頁</span>
          </router-link>
        </div>
      </header>

      <section ref="authCard" class="auth-card" :class="{ 'is-register': mode === 'register' }">
        <div ref="loginPanel" class="form-panel form-panel--login">
          <div class="form-inner">
            <p class="eyebrow">WELCOME BACK</p>
            <h1 id="auth-title">歡迎回來</h1>
            <p class="form-lead">登入後即可查看預約、照護進度與重要通知。</p>

            <q-form id="auth-form" class="auth-form" @submit.prevent="submitLogin">
              <q-input
                v-model.trim="loginForm.account"
                outlined
                no-error-icon
                label="登入帳號"
                autocomplete="username"
                :rules="[(value) => Boolean(value) || '請輸入登入帳號']"
              >
                <template #prepend><i class="bx bx-user" aria-hidden="true"></i></template>
              </q-input>

              <q-input
                v-model="loginForm.password"
                outlined
                no-error-icon
                label="密碼"
                autocomplete="current-password"
                :type="showLoginPassword ? 'text' : 'password'"
                :rules="[(value) => Boolean(value) || '請輸入密碼']"
              >
                <template #prepend><i class="bx bx-lock-alt" aria-hidden="true"></i></template>
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    class="password-toggle"
                    :aria-label="showLoginPassword ? '隱藏密碼' : '顯示密碼'"
                    @click="showLoginPassword = !showLoginPassword"
                  >
                    <i
                      class="bx"
                      :class="showLoginPassword ? 'bx-hide' : 'bx-show'"
                      aria-hidden="true"
                    ></i>
                  </q-btn>
                </template>
              </q-input>

              <div v-if="errorMessage" class="form-error" role="alert">
                <i class="bx bx-error-circle" aria-hidden="true"></i>
                {{ errorMessage }}
              </div>

              <div class="form-tools">
                <q-checkbox v-model="rememberAccount" label="記住帳號" color="accent" />
                <button type="button" class="text-action" @click="router.push('/forgot-password')">忘記密碼？</button>
              </div>

              <q-btn
                unelevated
                no-caps
                class="primary-action full-width"
                label="安心登入"
                type="submit"
                :loading="loading"
              />
            </q-form>

            <button type="button" class="mobile-switch" @click="switchMode('register')">
              還沒有帳號？<strong>建立帳號</strong>
            </button>
          </div>
        </div>

        <div ref="registerPanel" class="form-panel form-panel--register" aria-labelledby="register-title">
          <div class="form-inner">
            <p class="eyebrow">JOIN CHIOANSIM</p>
            <h2 id="register-title">建立安心帳號</h2>
            <p class="form-lead">選擇最符合您的身份，我們會帶您前往專屬的安心申請頁。</p>

            <q-form class="auth-form auth-form--register" @submit.prevent="openRoleRegistration">
              <fieldset class="role-fieldset">
                <legend>我想以這個身份加入</legend>
                <q-radio v-model="registerRole" val="USER" label="使用者／家屬－替自己或家人安排服務" color="accent" />
                <q-radio v-model="registerRole" val="PATIENT" label="受照護者－查看自己的照護安排" color="accent" />
                <q-radio v-model="registerRole" val="NURSE" label="居服員－申請加入專業照護團隊" color="accent" />
              </fieldset>

              <q-btn
                unelevated
                no-caps
                class="primary-action full-width"
                label="前往我的安心申請頁"
                type="submit"
              />
            </q-form>

            <button type="button" class="mobile-switch" @click="switchMode('login')">
              已經有帳號？<strong>返回登入</strong>
            </button>
          </div>
        </div>

        <aside ref="storyPanel" class="story-panel" aria-live="polite">
          <div class="wood-grain" aria-hidden="true"></div>
          <div ref="storyContent" class="story-content">
            <div class="care-symbol" aria-hidden="true">
              <span class="care-symbol__ring"></span>
              <img class="care-symbol__image" src="/chioansimicon.svg" alt="">
            </div>
            <p class="eyebrow eyebrow--light">{{ mode === 'login' ? 'FIRST TIME HERE?' : 'WELCOME HOME' }}</p>
            <h2>{{ mode === 'login' ? '第一次來到照安心？' : '已經是照安心的一員？' }}</h2>
            <p>
              {{
                mode === 'login'
                  ? '用幾個簡單步驟建立帳號，讓每一次照護安排都更有方向。'
                  : '回到熟悉的入口，繼續查看家人的照護安排與服務進度。'
              }}
            </p>
            <q-btn
              outline
              no-caps
              class="story-action"
              :label="mode === 'login' ? '建立新帳號' : '返回登入'"
              @click="switchMode(mode === 'login' ? 'register' : 'login')"
            />
            <div class="trust-note">
              <i class="bx bx-shield-quarter" aria-hidden="true"></i>
              <span>個人資料受到安全保護</span>
            </div>
          </div>
        </aside>
      </section>

      <footer class="auth-footer">© 2026 照安心 Chioansim・讓照護更靠近每個家庭</footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AxiosError } from 'axios';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import 'boxicons/css/boxicons.min.css';
import { useAuthStore } from '@/stores/auth-store';
import { Home } from '@lucide/vue';

gsap.registerPlugin(Flip);

type Mode = 'login' | 'register';

const router = useRouter();
const authStore = useAuthStore();
const authCard = ref<HTMLElement>();
const loginPanel = ref<HTMLElement>();
const registerPanel = ref<HTMLElement>();
const storyPanel = ref<HTMLElement>();
const storyContent = ref<HTMLElement>();
const mode = ref<Mode>('login');
const isSwitching = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const rememberAccount = ref(false);
const showLoginPassword = ref(false);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const loginForm = reactive({
  account: localStorage.getItem('chioansim-remembered-account') || '',
  password: '',
});

const registerRole = ref<'USER' | 'PATIENT' | 'NURSE'>('USER');

function readableError(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message || '目前無法連線，請稍後再試。';
  }
  return '發生未預期的錯誤，請稍後再試。';
}

async function switchMode(nextMode: Mode) {
  if (mode.value === nextMode || isSwitching.value) return;
  isSwitching.value = true;
  const mobileLayout = window.innerWidth < 800;
  const storyState = mobileLayout && storyPanel.value ? Flip.getState(storyPanel.value) : null;

  mode.value = nextMode;
  errorMessage.value = '';
  await nextTick();

  if (!storyPanel.value || !storyContent.value || !loginPanel.value || !registerPanel.value) {
    isSwitching.value = false;
    return;
  }

  const registering = nextMode === 'register';
  const outgoingPanel = registering ? loginPanel.value : registerPanel.value;
  const incomingPanel = registering ? registerPanel.value : loginPanel.value;
  const movingStoryContent = storyContent.value;

  if (mobileLayout) {
    if (reduceMotion.matches) {
      isSwitching.value = false;
      return;
    }

    const flip = storyState
      ? Flip.from(storyState, {
          duration: 0.78,
          ease: 'power4.inOut',
          absolute: true,
          scale: false,
        })
      : null;

    gsap.fromTo(
      movingStoryContent,
      { autoAlpha: 0, y: registering ? -18 : 18 },
      { autoAlpha: 1, y: 0, duration: 0.34, delay: 0.42, ease: 'power2.out' },
    );
    gsap.fromTo(
      incomingPanel,
      { autoAlpha: 0, y: registering ? 24 : -24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        delay: 0.38,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
        onComplete: () => { isSwitching.value = false; },
      },
    );
    if (!flip) isSwitching.value = false;
    return;
  }

  if (reduceMotion.matches) {
    gsap.set(storyPanel.value, { xPercent: registering ? -100 : 0 });
    gsap.set(loginPanel.value, {
      autoAlpha: registering ? 0 : 1,
      pointerEvents: registering ? 'none' : 'auto',
    });
    gsap.set(registerPanel.value, {
      autoAlpha: registering ? 1 : 0,
      pointerEvents: registering ? 'auto' : 'none',
    });
    isSwitching.value = false;
    return;
  }

  gsap.killTweensOf([storyPanel.value, movingStoryContent, loginPanel.value, registerPanel.value]);
  const timeline = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    onComplete: () => { isSwitching.value = false; },
  });
  timeline
    .set(incomingPanel, { pointerEvents: 'auto' })
    .set(outgoingPanel, { pointerEvents: 'none' })
    .to(outgoingPanel, {
      autoAlpha: 0,
      xPercent: registering ? -12 : 12,
      duration: 0.24,
      ease: 'power2.in',
    }, 0)
    .to(movingStoryContent, {
      autoAlpha: 0,
      x: registering ? -20 : 20,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    .to(storyPanel.value, {
      keyframes: [
        {
          xPercent: registering ? -46 : -54,
          scaleX: 1.16,
          borderRadius: registering ? '0 44px 44px 0' : '44px 0 0 44px',
          duration: 0.42,
        },
        {
          xPercent: registering ? -100 : 0,
          scaleX: 1,
          borderRadius: '0px',
          duration: 0.4,
        },
      ],
      transformOrigin: registering ? 'left center' : 'right center',
      ease: 'power4.inOut',
    }, 0.08)
    .fromTo(incomingPanel, {
      autoAlpha: 0,
      xPercent: registering ? 12 : -12,
    }, {
      autoAlpha: 1,
      xPercent: 0,
      duration: 0.38,
      ease: 'power2.out',
    }, 0.5)
    .fromTo(
      movingStoryContent,
      { autoAlpha: 0, x: registering ? 20 : -20 },
      { autoAlpha: 1, x: 0, duration: 0.36, ease: 'power2.out' },
      0.56,
    );
}

async function submitLogin() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await authStore.login(loginForm.account, loginForm.password);
    if (rememberAccount.value) localStorage.setItem('chioansim-remembered-account', loginForm.account);
    else localStorage.removeItem('chioansim-remembered-account');
    await router.push(authStore.user?.role === 'ADMIN' ? '/admin' : authStore.user?.role === 'NURSE' ? '/nurse/workspace' : authStore.user?.role === 'USER' ? '/users' : '/');
  } catch (error) {
    errorMessage.value = readableError(error);
  } finally {
    loading.value = false;
  }
}

async function openRoleRegistration() {
  await router.push(`/register/${registerRole.value.toLowerCase()}`);
}

onMounted(() => {
  rememberAccount.value = Boolean(loginForm.account);
  if (reduceMotion.matches || !authCard.value) return;
  gsap.from(authCard.value, { autoAlpha: 0, y: 28, duration: 0.7, ease: 'power3.out' });
  gsap.from('.brand-bar', { autoAlpha: 0, y: -14, duration: 0.45, delay: 0.15 });
});

onBeforeUnmount(() => {
  const targets = [authCard.value, loginPanel.value, registerPanel.value, storyPanel.value, storyContent.value].filter(
    (target): target is HTMLElement => Boolean(target),
  );
  gsap.killTweensOf(targets);
});
</script>

<style scoped>
.auth-page {
  --peach-milk: #fff9f5;
  --warm-white: #fffdfb;
  --chestnut: #6e5750;
  --chestnut-dark: #493833;
  --peach: #eb9079;
  --persimmon: #b84f16;
  --blush: #f8d8cc;
  min-height: 100dvh;
  color: var(--chestnut-dark);
  background:
    radial-gradient(circle at 12% 18%, rgb(235 144 121 / 14%), transparent 26rem),
    radial-gradient(circle at 88% 82%, rgb(217 107 39 / 9%), transparent 24rem),
    var(--peach-milk);
}

.auth-wrap {
  width: min(1120px, calc(100% - 40px));
  min-height: 100dvh;
  margin: 0 auto;
  padding: 28px 0 20px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
}

.skip-link {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 10;
  padding: 10px 16px;
  color: white;
  background: var(--chestnut-dark);
  border-radius: 8px;
  transform: translateY(-150%);
}

.skip-link:focus { transform: translateY(0); }

.brand-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--chestnut-dark);
  font-family: var(--font-family-brand);
  font-size: 1.45rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.1em;
}

.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: white;
  background: var(--peach);
  border-radius: 50% 50% 46% 54%;
  box-shadow: 0 8px 20px rgb(235 144 121 / 28%);
  overflow: hidden;
}
.brand-mark__image {
  width: 100%;
  height: 100%;
  max-width: none;
  display: block;
  object-fit: contain;
}

.brand-actions { display: flex; align-items: center; gap: 18px; }
.brand-bar p { margin: 0; color: var(--chestnut); font-size: 0.95rem; letter-spacing: 0.08em; }
.home-action { min-height: 42px; padding: 0 14px; display: inline-flex; align-items: center; gap: 7px; color: var(--chestnut); border: 1px solid rgb(110 87 80 / 24%); border-radius: 12px; text-decoration: none; font-weight: 700; }
.home-action:hover, .home-action:focus-visible { color: var(--persimmon); border-color: var(--peach); background: rgb(235 144 121 / 8%); outline: none; }

.auth-card {
  position: relative;
  width: 100%;
  min-height: 650px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--warm-white);
  border: 1px solid rgb(110 87 80 / 12%);
  border-radius: 32px 8px 32px 8px;
  box-shadow: 0 28px 80px rgb(78 52 43 / 14%);
}

.form-panel {
  position: absolute;
  inset-block: 0;
  width: 50%;
  display: grid;
  place-items: center;
  padding: 52px clamp(32px, 5vw, 72px);
  background: var(--warm-white);
}

.form-panel .bx { font-size: 22px; }
.password-toggle { min-width: 44px; min-height: 44px; }

.form-panel--login { left: 0; }
.form-panel--register { right: 0; opacity: 0; visibility: hidden; pointer-events: none; }
.form-inner { width: min(390px, 100%); }
.eyebrow { margin: 0 0 8px; color: var(--persimmon); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.19em; }
.form-inner h1, .form-inner h2 { margin: 0; font-family: var(--font-family-brand); font-size: clamp(2rem, 3vw, 2.7rem); font-weight: 700; letter-spacing: 0.04em; }
.form-lead { margin: 14px 0 28px; color: var(--chestnut); font-size: 1rem; line-height: 1.75; }
.auth-form { display: grid; gap: 6px; }
.auth-form--register { gap: 0; }

.form-tools { min-height: 48px; margin: -4px 0 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.text-action, .mobile-switch { min-height: 44px; padding: 8px; color: var(--persimmon); background: transparent; border: 0; cursor: pointer; font: inherit; }
.text-action:focus-visible, .mobile-switch:focus-visible { outline: 3px solid rgb(217 107 39 / 32%); outline-offset: 2px; }
.primary-action { min-height: 52px; color: white; background: var(--persimmon); border-radius: 14px; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.08em; box-shadow: 0 10px 24px rgb(184 79 22 / 24%); }
.primary-action:hover { background: #9f4211; }
.form-error { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 12px; padding: 12px 14px; color: #8d2f22; background: #fff0ec; border-radius: 10px; line-height: 1.5; }
.form-error .bx { flex: 0 0 auto; margin-top: 1px; }
.role-fieldset { margin: 0 0 16px; padding: 10px 12px; border: 1px solid rgb(110 87 80 / 24%); border-radius: 12px; }
.role-fieldset legend { padding: 0 6px; color: var(--chestnut); font-size: 0.85rem; font-weight: 700; }
.mobile-switch { display: none; width: 100%; margin-top: 12px; color: var(--chestnut); }
.mobile-switch strong { color: var(--persimmon); }

.story-panel {
  position: absolute;
  z-index: 2;
  inset-block: 0;
  left: 50%;
  width: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 56px;
  color: white;
  background: var(--chestnut);
  transition: background-color 0.4s ease-in-out;
}
.auth-card.is-register .story-panel { background: #e87a5d; }
.auth-card.is-register .form-panel--register .primary-action { background: var(--chestnut); }

.wood-grain {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background:
    repeating-radial-gradient(ellipse at 20% 20%, transparent 0 18px, rgb(255 249 245 / 18%) 19px 20px, transparent 21px 42px),
    linear-gradient(145deg, #7d6359, #604b44 58%, #4f3c36);
}

.story-content { position: relative; z-index: 1; width: min(430px, 100%); text-align: center; }
.eyebrow--light { color: var(--blush); }
.story-content h2 { margin: 12px 0 18px; font-family: var(--font-family-brand); font-size: clamp(1.9rem, 2.45vw, 2.35rem); line-height: 1.38; text-wrap: balance; }
.story-content > p:not(.eyebrow) { max-width: 390px; margin: 0 auto 30px; color: #fff4ef; font-size: 1rem; line-height: 1.75; text-wrap: pretty; }
.care-symbol { position: relative; width: 112px; height: 112px; margin: 0 auto 32px; display: grid; place-items: center; color: var(--chestnut); background: var(--peach-milk); border-radius: 50%; overflow: hidden; }
.care-symbol__image { width: 100%; height: 100%; max-width: none; display: block; object-fit: contain; }
.care-symbol__ring { position: absolute; inset: -10px; border: 1px solid rgb(255 249 245 / 42%); border-radius: 50%; }
.story-action { min-width: 180px; min-height: 50px; border-radius: 14px; font-weight: 700; }
.trust-note { margin-top: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #f8d8cc; font-size: 0.85rem; }
.trust-note .bx { font-size: 18px; }
.auth-footer { padding-top: 16px; color: var(--chestnut); text-align: center; font-size: 0.82rem; }

:deep(.q-field--outlined .q-field__control) { min-height: 54px; border-radius: 12px; }
:deep(.q-field--outlined .q-field__control::before) { border-color: rgb(110 87 80 / 28%); }
:deep(.q-field--focused .q-field__control::after) { border-color: var(--persimmon); border-width: 2px; }
:deep(.q-field__label), :deep(.q-field__marginal) { color: var(--chestnut); }
:deep(.q-field--error .q-field__label),
:deep(.q-field--error .q-field__messages) {
  color: #c62828;
  font-family: var(--font-family-brand);
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
}
:deep(.q-field__bottom) { padding-top: 4px; }
:deep(.q-field--error .q-field__messages) { transform: translateY(-2px); }
:deep(.q-checkbox__inner--truthy), :deep(.q-radio__inner--truthy) { color: var(--persimmon); }

@media (max-width: 799px) {
  .auth-wrap { width: min(100% - 24px, 560px); padding: 16px 0; }
  .brand-bar { margin-bottom: 16px; }
  .brand-bar p { display: none; }
  .brand-actions { gap: 8px; }
  .auth-card { min-height: auto; display: flex; flex-direction: column; border-radius: 24px 8px; }
  .story-panel { position: relative; inset: auto; order: 2; width: 100%; min-height: 190px; padding: 28px 24px; }
  .story-content { text-align: left; }
  .story-content h2 { margin: 6px 0 8px; font-size: 1.45rem; }
  .story-content > p:not(.eyebrow) { margin: 0; font-size: 0.92rem; line-height: 1.65; }
  .care-symbol, .story-action, .trust-note { display: none; }
  .form-panel { position: relative; inset: auto; order: 1; width: 100%; min-height: 0; padding: 32px 24px 28px; }
  .form-panel--login, .form-panel--register { display: none; opacity: 1 !important; visibility: visible !important; }
  .auth-card:not(.is-register) .form-panel--login,
  .auth-card.is-register .form-panel--register {
    display: grid;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .auth-card.is-register .story-panel { order: 0; }
  .mobile-switch { display: block; }
}

@media (max-width: 420px) {
  .auth-wrap { width: calc(100% - 16px); }
  .form-panel { padding-inline: 18px; }
  .form-tools { align-items: flex-start; flex-direction: column; gap: 0; }
  .home-action span { display: none; }
  .home-action { width: 44px; padding: 0; justify-content: center; }
  .text-action { align-self: flex-end; margin-top: -44px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
</style>
