<template>
  <div class="recovery-page">
    <header class="recovery-header">
      <router-link class="brand" to="/" aria-label="前往照安心首頁">
        <img src="/chioansimicon.svg" alt="" class="brand__logo">
        <span>照安心</span>
      </router-link>
      <router-link class="home-link" to="/"><Home :size="18" /> 回到安心首頁</router-link>
    </header>

    <main ref="recoveryCard" class="recovery-card">
      <section ref="storyPanel" class="recovery-story">
        <div class="story-icon"><KeyRound :size="38" /></div>
        <p class="eyebrow">PASSWORD CARE</p>
        <h1>別擔心，我們協助您</h1>
        <p>只要一個安心步驟，就能核對資料並重新設定密碼。</p>
        <div class="security-note"><ShieldCheck :size="22" /> 為了保護您，系統不會顯示原本的密碼。</div>
      </section>

      <section ref="formPanel" class="recovery-form-panel">
        <template v-if="step === 'VERIFY'">
          <p class="eyebrow eyebrow--warm">安心核對</p>
          <h2>找回帳號使用權</h2>
          <p class="lead">選擇一種您註冊時留下的聯絡方式。</p>

          <div class="method-switch" role="radiogroup" aria-label="選擇核對方式">
            <label :class="{ selected: method === 'EMAIL' }" role="radio" tabindex="0"
              :aria-checked="method === 'EMAIL'" @click="method = 'EMAIL'"
              @keydown.enter.prevent="method = 'EMAIL'" @keydown.space.prevent="method = 'EMAIL'">
              <q-radio v-model="method" val="EMAIL" /><Mail :size="20" /> Email
            </label>
            <label :class="{ selected: method === 'PHONE' }" role="radio" tabindex="0"
              :aria-checked="method === 'PHONE'" @click="method = 'PHONE'"
              @keydown.enter.prevent="method = 'PHONE'" @keydown.space.prevent="method = 'PHONE'">
              <q-radio v-model="method" val="PHONE" /><Phone :size="20" /> 電話號碼
            </label>
          </div>

          <q-form class="recovery-form" @submit.prevent="verifyIdentity">
            <q-input v-model.trim="account" outlined no-error-icon label="登入帳號（必填）"
              :rules="[(value) => Boolean(value) || '請輸入您的登入帳號']">
              <template #prepend><UserRound :size="21" /></template>
            </q-input>
            <q-input v-if="method === 'EMAIL'" v-model.trim="email" outlined no-error-icon type="email"
              label="註冊時使用的 Email（必填）" :rules="[(value) => Boolean(value) || '請輸入註冊時留下的 Email']">
              <template #prepend><Mail :size="21" /></template>
            </q-input>
            <q-input v-else v-model.trim="phone" outlined no-error-icon type="tel"
              label="註冊時使用的電話（必填）" :rules="[(value) => Boolean(value) || '請輸入註冊時留下的電話號碼']">
              <template #prepend><Phone :size="21" /></template>
            </q-input>

            <div v-if="errorMessage" class="message message--error" role="alert"><CircleAlert :size="20" />{{ errorMessage }}</div>
            <q-btn unelevated no-caps class="primary-action full-width" type="submit" :loading="loading">
              <SearchCheck :size="20" /><span>幫我安心核對資料</span>
            </q-btn>
          </q-form>
        </template>

        <template v-else-if="step === 'RESET'">
          <p class="eyebrow eyebrow--warm">資料核對完成</p>
          <h2>設定新的安心密碼</h2>
          <p class="lead">請設定至少 8 個字元，完成後使用新密碼重新登入。</p>
          <q-form class="recovery-form" @submit.prevent="resetPassword">
            <q-input v-model="newPassword" outlined no-error-icon label="新密碼（至少 8 個字元）"
              :type="showPassword ? 'text' : 'password'"
              :rules="[(value) => value.length >= 8 || '新密碼請至少設定 8 個字元']">
              <template #prepend><LockKeyhole :size="21" /></template>
              <template #append><button type="button" class="icon-button" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="20"/><Eye v-else :size="20"/></button></template>
            </q-input>
            <q-input v-model="confirmPassword" outlined no-error-icon label="再次輸入新密碼"
              :type="showPassword ? 'text' : 'password'"
              :rules="[(value) => value === newPassword || '兩次輸入的密碼不一致']">
              <template #prepend><KeyRound :size="21" /></template>
            </q-input>
            <div v-if="errorMessage" class="message message--error" role="alert"><CircleAlert :size="20" />{{ errorMessage }}</div>
            <q-btn unelevated no-caps class="primary-action full-width" type="submit" :loading="loading">
              <Heart :size="20" fill="currentColor" /><span>儲存新的安心密碼</span>
            </q-btn>
          </q-form>
        </template>

        <template v-else>
          <div class="success-state">
            <div class="success-icon"><CircleCheckBig :size="42" /></div>
            <h2>新密碼設定完成</h2>
            <p>請回到登入頁，使用剛才設定的新密碼重新登入。</p>
            <q-btn to="/login" unelevated no-caps class="primary-action full-width">
              <LogIn :size="20" /><span>回到安心入口重新登入</span>
            </q-btn>
          </div>
        </template>

        <router-link v-if="step !== 'DONE'" class="back-login" to="/login"><ArrowLeft :size="18" /> 我想先回登入頁</router-link>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { AxiosError } from 'axios';
import { gsap } from 'gsap';
import { api } from '@/boot/axios';
import {
  ArrowLeft, CircleAlert, CircleCheckBig, Eye, EyeOff, Heart, Home, KeyRound,
  LockKeyhole, LogIn, Mail, Phone, SearchCheck, ShieldCheck, UserRound,
} from '@lucide/vue';

type Step = 'VERIFY' | 'RESET' | 'DONE';
const step = ref<Step>('VERIFY');
const method = ref<'EMAIL' | 'PHONE'>('EMAIL');
const account = ref('');
const email = ref('');
const phone = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const recoveryCard = ref<HTMLElement>();
const storyPanel = ref<HTMLElement>();
const formPanel = ref<HTMLElement>();

onMounted(() => {
  if (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !recoveryCard.value ||
    !storyPanel.value ||
    !formPanel.value
  ) return;
  gsap.from(recoveryCard.value, { autoAlpha: 0, y: 28, duration: 0.7, ease: 'power3.out' });
  gsap.from(storyPanel.value, { autoAlpha: 0, x: 34, duration: 0.62, delay: 0.08, ease: 'power3.out' });
  gsap.from(formPanel.value, { autoAlpha: 0, x: -22, duration: 0.58, delay: 0.14, ease: 'power2.out' });
  gsap.from('.recovery-header', { autoAlpha: 0, y: -14, duration: 0.45, delay: 0.12 });
});

onBeforeUnmount(() => {
  gsap.killTweensOf([recoveryCard.value, storyPanel.value, formPanel.value, '.recovery-header']);
});

function readableError(error: unknown) {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || '目前無法連線，請稍後再試。';
  }
  return '發生未預期的狀況，請稍後再試。';
}

async function verifyIdentity() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await api.post('/auth/password-recovery/verify', {
      account: account.value,
      ...(method.value === 'EMAIL' ? { email: email.value } : { phone: phone.value }),
    });
    step.value = 'RESET';
  } catch (error) {
    errorMessage.value = readableError(error);
  } finally {
    loading.value = false;
  }
}

async function resetPassword() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await api.post('/auth/password-recovery/reset', {
      newPassword: newPassword.value,
    });
    step.value = 'DONE';
  } catch (error) {
    errorMessage.value = readableError(error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.recovery-page { --milk:#fff9f5;--white:#fffdfb;--chestnut:#6e5750;--dark:#493833;--peach:#eb9079;--persimmon:#d96b27; min-height:100dvh;padding:28px 20px;color:var(--dark);background:radial-gradient(circle at 12% 18%,rgb(235 144 121 / 15%),transparent 26rem),var(--milk);font-family:var(--font-family-brand);font-size:17px; }
.recovery-header { width:min(1120px,100%);margin:0 auto 26px;display:flex;align-items:center;justify-content:space-between;gap:16px; }
.brand { display:inline-flex;align-items:center;gap:11px;color:var(--dark);font-size:1.4rem;font-weight:700;letter-spacing:.1em;text-decoration:none; }.brand__logo{width:46px;height:46px}.home-link,.back-login{display:inline-flex;align-items:center;gap:7px;color:var(--chestnut);text-decoration:none;font-weight:700}.home-link{min-height:42px;padding:0 14px;border:1px solid rgb(110 87 80 / 22%);border-radius:12px}
.recovery-card { width:min(1120px,100%);min-height:650px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;background:var(--white);border:1px solid rgb(110 87 80 / 13%);border-radius:32px 8px 32px 8px;box-shadow:0 28px 80px rgb(78 52 43 / 14%); }
.recovery-story { position:relative;isolation:isolate;grid-column:2;grid-row:1;padding:56px;color:white;background:#4a6b5d;transition:background-color .4s ease-in-out; }.recovery-story::before{content:"";position:absolute;z-index:-1;inset:0;opacity:.2;background:repeating-radial-gradient(ellipse at 22% 20%,transparent 0 20px,rgb(255 249 245 / 18%) 21px 22px,transparent 23px 46px),linear-gradient(145deg,#628374,#3f5c50)}.story-icon{width:88px;height:88px;display:grid;place-items:center;color:#4a6b5d;background:var(--milk);border-radius:50%}.eyebrow{margin:30px 0 8px;color:#dfeee7;font-size:.76rem;font-weight:700;letter-spacing:.18em}.eyebrow--warm{margin-top:0;color:var(--persimmon)}.recovery-story h1{margin:0;font-size:clamp(2rem,4vw,2.7rem);line-height:1.4}.recovery-story>p:not(.eyebrow){line-height:1.9;color:#f1faf5}.security-note{margin-top:32px;padding:16px;display:flex;align-items:flex-start;gap:10px;color:#e8f6ee;background:rgb(255 249 245 / 11%);border-radius:14px;line-height:1.65}
.recovery-form-panel { grid-column:1;grid-row:1;padding:clamp(42px,6vw,72px);display:flex;flex-direction:column;justify-content:center;background:var(--white) }.recovery-form-panel h2{margin:0;font-size:2rem}.lead{margin:12px 0 24px;color:var(--chestnut);line-height:1.7}.method-switch{margin-bottom:22px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.method-switch label{min-height:58px;padding:8px 10px;display:flex;align-items:center;gap:5px;color:var(--chestnut);border:1px solid rgb(110 87 80 / 22%);border-radius:13px;cursor:pointer;user-select:none}.method-switch label:hover,.method-switch label:focus-visible{border-color:var(--peach);background:rgb(235 144 121 / 6%);outline:3px solid rgb(235 144 121 / 18%);outline-offset:2px}.method-switch label.selected{color:var(--dark);border-color:var(--peach);background:rgb(235 144 121 / 9%)}.recovery-form{display:grid;gap:8px}.primary-action{min-height:54px;color:white;background:var(--persimmon);border-radius:14px;font-size:1rem;font-weight:700;box-shadow:0 10px 24px rgb(217 107 39 / 24%)}.primary-action :deep(.q-btn__content){gap:9px}.back-login{margin:22px auto 0;min-height:42px}.message{padding:13px 15px;display:flex;align-items:flex-start;gap:8px;border-radius:11px;line-height:1.55}.message--error{color:#983427;background:#fff0ec}.icon-button{width:42px;height:42px;display:grid;place-items:center;color:var(--chestnut);background:transparent;border:0;border-radius:50%;cursor:pointer}.success-state{text-align:center}.success-icon{width:82px;height:82px;margin:0 auto 22px;display:grid;place-items:center;color:#39704f;background:#edf8f1;border-radius:50%}.success-state p{margin:12px 0 28px;color:var(--chestnut);line-height:1.7}
:deep(.q-field--outlined .q-field__control){min-height:58px;border-radius:13px}:deep(.q-field--outlined .q-field__control::before){border-color:rgb(110 87 80 / 25%)}:deep(.q-field--focused .q-field__control::after){border-color:var(--persimmon);border-width:2px}:deep(.q-field__label),:deep(.q-field__marginal){color:var(--chestnut);font-family:var(--font-family-brand)}:deep(.q-radio__inner--truthy){color:var(--persimmon)}:deep(.q-field--error .q-field__messages){color:#c62828;font-family:var(--font-family-brand)}
@media(max-width:720px){.recovery-page{padding:18px 12px}.recovery-card{grid-template-columns:1fr}.recovery-form-panel{grid-column:1;grid-row:1;padding:36px 22px}.recovery-story{grid-column:1;grid-row:2;padding:32px;min-height:360px}.security-note{margin-top:20px}.home-link{width:44px;padding:0;justify-content:center}.home-link{font-size:0}.method-switch{grid-template-columns:1fr}}
</style>
