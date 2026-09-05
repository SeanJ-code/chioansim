<template>
  <Teleport v-if="hydrated" to="body">
    <div
      class="home-quick-layer"
      :class="{ 'is-open': opened }"
    >
      <button
        ref="backdropRef"
        class="home-quick-backdrop"
        type="button"
        aria-label="關閉快速服務"
        @click="closeMenu"
      />

      <nav
        class="home-quick-menu"
        aria-label="首頁快速服務"
      >
        <!-- 三個快速服務 -->
        <button
          v-for="item in menuItems"
          :key="item.id"
          ref="actionRefs"
          class="radial-action"
          type="button"
          :aria-label="item.label"
          :tabindex="opened ? 0 : -1"
          @click="handleAction(item.id)"
        >
          <component
            :is="item.icon"
            :size="21"
            aria-hidden="true"
          />

          <span
            class="radial-tooltip"
            role="tooltip"
          >
            {{ item.label }}
          </span>
        </button>

        <!-- 中央愛心 -->
        <button
          ref="triggerRef"
          class="radial-trigger"
          type="button"
          :aria-label="
            opened
              ? '關閉快速服務'
              : '開啟快速服務'
          "
          :aria-expanded="opened"
          @click="toggleMenu"
        >
          <HeartHandshake
            :size="28"
            aria-hidden="true"
          />


        </button>
      </nav>

      <!--
        註冊 / 忘記密碼

        radial 本身仍然只有三顆按鈕。
        第二顆點下後才開這個小視窗。
      -->
      <q-dialog
        v-model="accountDialog"
        transition-show="scale"
        transition-hide="scale"
      >
        <q-card class="account-dialog">
          <q-card-section class="account-dialog__heading">
            <div class="account-dialog__icon">
              <UserRoundPlus :size="28" />
            </div>

            <div>
              <small>CHIOANSIM ACCOUNT</small>
              <h2>帳號服務</h2>
              <p>
                第一次使用，或需要重新設定密碼？
              </p>
            </div>

            <button
              type="button"
              class="account-dialog__close"
              aria-label="關閉帳號服務"
              @click="accountDialog = false"
            >
              <X :size="21" />
            </button>
          </q-card-section>

          <q-card-section class="account-dialog__actions">
            <button
              type="button"
              class="account-action account-action--primary"
              @click="goRegister"
            >
              <UserRoundPlus :size="21" />

              <span>
                <strong>建立帳號</strong>
                <small>第一次使用照安心</small>
              </span>

              <ChevronRight :size="19" />
            </button>

            <button
              type="button"
              class="account-action"
              @click="goForgotPassword"
            >
              <KeyRound :size="21" />

              <span>
                <strong>忘記密碼</strong>
                <small>重新設定登入密碼</small>
              </span>

              <ChevronRight :size="19" />
            </button>
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type Component,
} from 'vue';

import {
  ChevronRight,
  CircleHelp,
  HeartHandshake,
  KeyRound,
  MessageCircleHeart,
  UserRoundPlus,
  X,
} from '@lucide/vue';

import { useRouter } from 'vue-router';

import { gsap } from '@/composables/useGsap';

/*
 * =========================================================
 * Emits
 * =========================================================
 *
 * about：
 * 交給 IndexPage 開啟「關於我們」。
 *
 * line：
 * 繼續使用 IndexPage 原本既有的 LINE Dialog。
 */
const emit = defineEmits<{
  about: [];
  line: [];
}>();

/*
 * =========================================================
 * Types
 * =========================================================
 */

type HomeQuickItem = {
  id: 'about' | 'account' | 'line';
  label: string;
  icon: Component;
};

/*
 * =========================================================
 * Router
 * =========================================================
 */

const router = useRouter();

/*
 * =========================================================
 * Menu Items
 * =========================================================
 *
 * 首頁只顯示三顆。
 *
 * 不引用登入狀態。
 * 不修改 USER / NURSE 的 CareRadialMenu。
 */
const menuItems: HomeQuickItem[] = [
  {
    id: 'about',
    label: '關於我們',
    icon: markRaw(CircleHelp),
  },
  {
    id: 'account',
    label: '註冊 / 忘記密碼',
    icon: markRaw(UserRoundPlus),
  },
  {
    id: 'line',
    label: 'LINE 客服',
    icon: markRaw(MessageCircleHeart),
  },
];

/*
 * =========================================================
 * State / DOM refs
 * =========================================================
 */

const opened = ref(false);

const hydrated = ref(false);

const accountDialog = ref(false);

const actionRefs =
  ref<HTMLButtonElement[]>([]);

const triggerRef =
  ref<HTMLButtonElement>();

const backdropRef =
  ref<HTMLButtonElement>();

let timeline:
  | gsap.core.Timeline
  | undefined;

/*
 * =========================================================
 * Position
 * =========================================================
 *
 * 右上角版本：
 *
 * CareRadialMenu 原本在右下角，
 * 所以 action 是往「左上」展開。
 *
 * 首頁快速服務位於右上角，
 * 因此這裡要往「左下」展開，
 * 才不會跑出瀏覽器上方。
 *
 * 仍然使用同一個 radial calculation。
 */
function radius() {
  if (
    typeof window !== 'undefined' &&
    window.innerWidth < 600
  ) {
    return 92;
  }

  return 118;
}

function position(
  index: number,
  total: number,
) {
  /*
   * 90° → 180°
   *
   * 第一顆較靠下，
   * 最後一顆較靠左。
   *
   * 因為按鈕本體固定於右上角，
   * positive y = 向下。
   * negative x = 向左。
   */
  const angle =
    total === 1
      ? 135
      : 90 +
        (90 / (total - 1)) *
          index;

  const radians =
    angle *
    Math.PI /
    180;

  const r = radius();

  return {
    x:
      Math.cos(radians) *
      r,

    y:
      Math.sin(radians) *
      r,
  };
}

/*
 * =========================================================
 * GSAP
 * =========================================================
 *
 * 數值直接沿用 CareRadialMenu：
 *
 * scale .4 → 1
 * duration .4
 * stagger .05
 * back.out(1.65)
 *
 * Trigger：
 * rotation 8
 * scale 1.05
 */
function buildTimeline() {
  timeline?.kill();

  const reduced =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

  const actions =
    actionRefs.value;

  gsap.set(
    actions,
    {
      x: 0,
      y: 0,

      scale:
        reduced
          ? 1
          : 0.4,

      autoAlpha: 0,
    },
  );

  if (backdropRef.value) {
    gsap.set(
      backdropRef.value,
      {
        autoAlpha: 0,
      },
    );
  }

  timeline =
    gsap.timeline({
      paused: true,
    });

  if (backdropRef.value) {
    timeline.to(
      backdropRef.value,
      {
        autoAlpha: 1,

        duration:
          reduced
            ? 0.01
            : 0.2,
      },
      0,
    );
  }

  if (triggerRef.value) {
    timeline.to(
      triggerRef.value,
      {
        rotation:
          reduced
            ? 0
            : 8,

        scale:
          reduced
            ? 1
            : 1.05,

        duration:
          reduced
            ? 0.01
            : 0.28,

        ease:
          'power2.out',
      },
      0,
    );
  }

  timeline.to(
    actions,
    {
      x: (index) =>
        position(
          index,
          actions.length,
        ).x,

      y: (index) =>
        position(
          index,
          actions.length,
        ).y,

      scale: 1,

      autoAlpha: 1,

      duration:
        reduced
          ? 0.01
          : 0.4,

      stagger:
        reduced
          ? 0
          : 0.05,

      ease:
        reduced
          ? 'none'
          : 'back.out(1.65)',
    },
    0.04,
  );
}

/*
 * =========================================================
 * Open / Close
 * =========================================================
 */

async function openMenu() {
  if (opened.value) return;

  opened.value = true;

  await nextTick();

  buildTimeline();

  timeline?.play(0);
}

function closeMenu() {
  if (!opened.value) return;

  opened.value = false;

  timeline?.reverse();
}

function toggleMenu() {
  opened.value
    ? closeMenu()
    : void openMenu();
}

/*
 * =========================================================
 * Action
 * =========================================================
 */

function handleAction(
  id: HomeQuickItem['id'],
) {
  closeMenu();

  if (id === 'about') {
    emit('about');
    return;
  }

  if (id === 'account') {
    void router.push('/login');
    return;
  }

  if (id === 'line') {
    emit('line');
  }
}
/*
 * =========================================================
 * Account Actions
 * =========================================================
 */

async function goRegister() {
  accountDialog.value = false;

  /*
   * 你目前 router 已存在：
   *
   * name: register
   * path:
   * /register/:role(user|patient|nurse)?
   */
  await router.push({
    name: 'register',
  });
}

async function goForgotPassword() {
  accountDialog.value = false;

  /*
   * 保留你 LoginPage 原本使用的：
   *
   * router.push('/forgot-password')
   */
  await router.push(
    '/forgot-password',
  );
}

/*
 * =========================================================
 * Accessibility / Resize
 * =========================================================
 */

function onKeydown(
  event: KeyboardEvent,
) {
  if (event.key === 'Escape') {
    if (accountDialog.value) {
      accountDialog.value = false;
      return;
    }

    closeMenu();
  }
}

function onResize() {
  if (!opened.value) return;

  void openMenuAfterResize();
}

async function openMenuAfterResize() {
  await nextTick();

  buildTimeline();

  timeline?.play(0);
}

/*
 * =========================================================
 * Lifecycle
 * =========================================================
 */

onMounted(() => {
  hydrated.value = true;

  window.addEventListener(
    'keydown',
    onKeydown,
  );

  window.addEventListener(
    'resize',
    onResize,
    {
      passive: true,
    },
  );
});

onBeforeUnmount(() => {
  timeline?.kill();

  window.removeEventListener(
    'keydown',
    onKeydown,
  );

  window.removeEventListener(
    'resize',
    onResize,
  );
});
</script>

<style scoped>
/*
 * =========================================================
 * Palette
 *
 * 與 CareRadialMenu.vue 相同
 * =========================================================
 */

.home-quick-layer {
  --radial-milk: #fff9f5;
  --radial-paper: #fffdfb;
  --radial-ink: #493833;
  --radial-chestnut: #6e5750;
  --radial-peach: #eb9079;
  --radial-persimmon: #b84f16;
}

/*
 * =========================================================
 * Backdrop
 * =========================================================
 */

.home-quick-backdrop {
  position: fixed;
  inset: 0;

  z-index: 1980;

  border: 0;

  background:
    rgb(73 56 51 / 0.04);

  visibility: hidden;

  pointer-events: none;
}

.home-quick-layer.is-open
.home-quick-backdrop {
  visibility: visible;

  pointer-events: auto;
}

/*
 * =========================================================
 * Radial Menu
 *
 * 右上角。
 * =========================================================
 */

.home-quick-menu {
  position: fixed;

  top:
    calc(
      88px +
      env(safe-area-inset-top)
    );

  right: 42px;

  z-index: 2000;

  width: 64px;
  height: 64px;
}

/*
 * CareRadialMenu 原始共用造型。
 */
.radial-trigger,
.radial-action {
  position: absolute;

  top: 0;
  right: 0;

  display: grid;

  place-items: center;

  border-radius: 50%;

  cursor: pointer;

  touch-action:
    manipulation;
}

/*
 * =========================================================
 * Trigger
 * =========================================================
 */

.radial-trigger {
  z-index: 2;

  width: 64px;
  height: 64px;

  color:
    var(--radial-persimmon);

  background:
    var(--radial-milk);

  border:
    2px solid
    var(--radial-peach);

  box-shadow:
    0 12px 35px
    rgb(73 56 51 / 0.16);
}


/*
 * =========================================================
 * Actions
 * =========================================================
 */

.radial-action {
  width: 52px;
  height: 52px;

  margin: 6px;

  color:
    var(--radial-ink);

  background:
    var(--radial-paper);

  border:
    1px solid
    rgb(110 87 80 / 0.2);

  box-shadow:
    0 8px 24px
    rgb(73 56 51 / 0.13);

  visibility: hidden;
}

/*
 * Tooltip 完全沿用
 * CareRadialMenu 風格。
 */
.radial-tooltip {
  position: absolute;

  right:
    calc(100% + 10px);

  width:
    max-content;

  padding:
    7px 10px;

  color: #fff;

  background:
    var(--radial-ink);

  border-radius: 9px;

  font-size: 0.82rem;

  font-weight: 700;

  opacity: 0;

  pointer-events: none;

  transform:
    translateX(4px);

  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.radial-action:hover
.radial-tooltip,
.radial-action:focus-visible
.radial-tooltip {
  opacity: 1;

  transform: none;
}

.radial-trigger:hover {
  scale: 1.04;
}

.radial-trigger:focus-visible,
.radial-action:focus-visible {
  outline:
    3px solid #ee9b84;

  outline-offset: 3px;
}

/*
 * =========================================================
 * Account Dialog
 * =========================================================
 */

.account-dialog {
  width:
    min(
      390px,
      calc(100vw - 28px)
    );

  overflow: hidden;

  color:
    var(--radial-ink);

  background:
    var(--radial-paper);

  border-radius: 26px;

  box-shadow:
    0 24px 70px
    rgb(73 56 51 / 0.2);
}

.account-dialog__heading {
  position: relative;

  display: grid;

  grid-template-columns:
    auto 1fr;

  align-items: center;

  gap: 14px;

  padding:
    24px 24px 18px;
}

.account-dialog__icon {
  width: 58px;
  height: 58px;

  display: grid;

  place-items: center;

  color:
    var(--radial-persimmon);

  background:
    var(--radial-milk);

  border:
    1px solid
    var(--radial-peach);

  border-radius: 50%;
}

.account-dialog__heading small {
  color:
    var(--radial-persimmon);

  font-size: 0.72rem;

  font-weight: 800;

  letter-spacing:
    0.13em;
}

.account-dialog__heading h2 {
  margin:
    4px 0 3px;

  font-size: 1.55rem;

  line-height: 1.25;
}

.account-dialog__heading p {
  margin: 0;

  color:
    var(--radial-chestnut);

  font-size: 0.9rem;

  line-height: 1.55;
}

.account-dialog__close {
  position: absolute;

  top: 12px;
  right: 12px;

  width: 42px;
  height: 42px;

  display: grid;

  place-items: center;

  color:
    var(--radial-chestnut);

  background:
    transparent;

  border: 0;

  border-radius: 50%;

  cursor: pointer;
}

.account-dialog__actions {
  display: grid;

  gap: 10px;

  padding:
    4px 18px 22px;
}

.account-action {
  min-height: 66px;

  display: grid;

  grid-template-columns:
    auto 1fr auto;

  align-items: center;

  gap: 12px;

  width: 100%;

  padding:
    10px 14px;

  color:
    var(--radial-ink);

  background:
    var(--radial-milk);

  border:
    1px solid
    rgb(110 87 80 / 0.18);

  border-radius: 17px;

  text-align: left;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.account-action span {
  display: grid;

  gap: 2px;
}

.account-action strong {
  font-size: 0.96rem;
}

.account-action small {
  color:
    var(--radial-chestnut);

  font-size: 0.78rem;
}

.account-action--primary {
  color:
    var(--radial-persimmon);

  background:
    #fff4ef;

  border-color:
    rgb(235 144 121 / 0.5);
}

.account-action:hover {
  transform:
    translateY(-2px);

  border-color:
    var(--radial-peach);

  box-shadow:
    0 10px 24px
    rgb(73 56 51 / 0.1);
}

.account-action:focus-visible,
.account-dialog__close:focus-visible {
  outline:
    3px solid #ee9b84;

  outline-offset: 3px;
}

/*
 * =========================================================
 * Tablet
 * =========================================================
 */

@media (max-width: 1023px) {
  .home-quick-menu {
    right: 22px;
  }
}

/*
 * =========================================================
 * Phone
 * =========================================================
 */

@media (max-width: 599px) {
  .home-quick-menu {
    top:
      calc(
        12px +
        env(safe-area-inset-top)
      );

    right: 16px;

    width: 60px;
    height: 60px;
  }

  .radial-trigger {
    width: 60px;
    height: 60px;
  }


  .radial-tooltip {
    font-size: 0.78rem;
  }
}

/*
 * =========================================================
 * Reduced Motion
 * =========================================================
 */

@media (
  prefers-reduced-motion: reduce
) {
  .radial-tooltip,
  .account-action {
    transition: none;
  }

  .radial-trigger:hover {
    scale: 1;
  }
}
</style>
