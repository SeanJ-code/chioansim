<template>
  <Teleport to="body">
    <div v-if="shouldShowMenu" class="care-radial-layer" :class="{ 'is-open': opened }">
      <button ref="backdropRef" class="care-radial-backdrop" type="button" aria-label="關閉照護快捷選單" @click="closeMenu" />
      <nav class="care-radial-menu" aria-label="照護快捷選單">
        <button
          v-for="item in menuItems"
          :key="item.id"
          ref="actionRefs"
          class="radial-action"
          type="button"
          :aria-label="item.label"
          :tabindex="opened ? 0 : -1"
          @click="handleAction(item)"
        >
          <component :is="item.icon" :size="21" aria-hidden="true" />
          <span class="radial-tooltip" role="tooltip">{{ item.label }}</span>
        </button>

        <button
          ref="triggerRef"
          class="radial-trigger"
          type="button"
          :aria-label="opened ? '關閉照護快捷選單' : '開啟照護快捷選單'"
          :aria-expanded="opened"
          @click="toggleMenu"
        >
          <HeartHandshake :size="28" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { BellRing, CalendarDays, ClipboardCheck, HeartHandshake, MapPin, Search } from '@lucide/vue';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { gsap } from '@/composables/useGsap';

type MenuItem = { id: string; label: string; icon: Component; to: { name: string; query?: Record<string, string> } };

const roleItems: Partial<Record<UserRole, MenuItem[]>> = {
  USER: [
    { id: 'search', label: '找居服員', icon: markRaw(Search), to: { name: 'caregivers' } },
    { id: 'bookings', label: '我的預約', icon: markRaw(CalendarDays), to: { name: 'users', query: { radial: 'bookings' } } },
    { id: 'notifications', label: '訊息通知', icon: markRaw(BellRing), to: { name: 'users', query: { radial: 'notifications' } } },
    { id: 'line', label: 'LINE 客服', icon: markRaw(HeartHandshake), to: { name: 'users', query: { radial: 'line' } } },
  ],
  NURSE: [
    { id: 'today', label: '今日任務', icon: markRaw(ClipboardCheck), to: { name: 'nurse-workspace', query: { section: 'schedule' } } },
    { id: 'bookings', label: '我的預約', icon: markRaw(CalendarDays), to: { name: 'nurse-workspace', query: { section: 'schedule' } } },
    { id: 'notifications', label: '訊息通知', icon: markRaw(BellRing), to: { name: 'nurse-workspace' } },
    { id: 'location', label: 'GPS 回報位置', icon: markRaw(MapPin), to: { name: 'nurse-workspace', query: { section: 'schedule' } } },
  ],
};

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const opened = ref(false);
const actionRefs = ref<HTMLButtonElement[]>([]);
const triggerRef = ref<HTMLButtonElement>();
const backdropRef = ref<HTMLButtonElement>();
let timeline: gsap.core.Timeline | undefined;

const menuItems = computed(() => roleItems[authStore.user?.role || 'PATIENT'] || []);
const shouldShowMenu = computed(() => menuItems.value.length > 0 && route.meta.radialMenu !== false);
const radius = computed(() => $q.screen.lt.sm ? 92 : 118);

function position(index: number, total: number) {
  const angle = total === 1 ? 225 : 180 + (90 / (total - 1)) * index;
  const radians = angle * Math.PI / 180;
  return { x: Math.cos(radians) * radius.value, y: Math.sin(radians) * radius.value };
}

function buildTimeline() {
  timeline?.kill();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const actions = actionRefs.value;
  gsap.set(actions, { x: 0, y: 0, scale: reduced ? 1 : 0.4, autoAlpha: 0 });
  gsap.set(backdropRef.value!, { autoAlpha: 0 });
  timeline = gsap.timeline({ paused: true })
    .to(backdropRef.value!, { autoAlpha: 1, duration: reduced ? 0.01 : 0.2 }, 0)
    .to(triggerRef.value!, { rotation: reduced ? 0 : 8, scale: reduced ? 1 : 1.05, duration: reduced ? 0.01 : 0.28, ease: 'power2.out' }, 0)
    .to(actions, {
      x: (index) => position(index, actions.length).x,
      y: (index) => position(index, actions.length).y,
      scale: 1,
      autoAlpha: 1,
      duration: reduced ? 0.01 : 0.4,
      stagger: reduced ? 0 : 0.05,
      ease: reduced ? 'none' : 'back.out(1.65)',
    }, 0.04);
}

async function openMenu() {
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

function toggleMenu() { opened.value ? closeMenu() : void openMenu(); }
async function handleAction(item: MenuItem) { closeMenu(); await router.push(item.to); }
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape') closeMenu(); }

watch(() => route.fullPath, closeMenu);
watch(radius, () => { if (opened.value) void openMenu(); });
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => { timeline?.kill(); window.removeEventListener('keydown', onKeydown); });
</script>

<style scoped>
.care-radial-layer{--radial-milk:#fff9f5;--radial-paper:#fffdfb;--radial-ink:#493833;--radial-peach:#eb9079;--radial-persimmon:#b84f16}
.care-radial-backdrop{position:fixed;inset:0;z-index:1890;border:0;background:rgb(73 56 51/.04);visibility:hidden;pointer-events:none}
.care-radial-layer.is-open .care-radial-backdrop{pointer-events:auto}
.care-radial-menu{position:fixed;right:28px;bottom:calc(28px + env(safe-area-inset-bottom));z-index:1900;width:64px;height:64px}
.radial-trigger,.radial-action{position:absolute;right:0;bottom:0;display:grid;place-items:center;border-radius:50%;cursor:pointer;touch-action:manipulation}
.radial-trigger{z-index:2;width:64px;height:64px;color:var(--radial-persimmon);background:var(--radial-milk);border:2px solid var(--radial-peach);box-shadow:0 12px 35px rgb(73 56 51/.16)}
.radial-action{width:52px;height:52px;margin:6px;color:var(--radial-ink);background:var(--radial-paper);border:1px solid rgb(110 87 80/.2);box-shadow:0 8px 24px rgb(73 56 51/.13);visibility:hidden}
.radial-tooltip{position:absolute;right:calc(100% + 10px);width:max-content;padding:7px 10px;color:#fff;background:var(--radial-ink);border-radius:9px;font-size:.82rem;font-weight:700;opacity:0;pointer-events:none;transform:translateX(4px);transition:opacity var(--motion-fast) var(--ease-standard),transform var(--motion-fast) var(--ease-standard)}
.radial-action:hover .radial-tooltip,.radial-action:focus-visible .radial-tooltip{opacity:1;transform:none}
.radial-trigger:hover{scale:1.04}
.radial-trigger:focus-visible,.radial-action:focus-visible{outline:3px solid #ee9b84;outline-offset:3px}
@media(max-width:1023px){.care-radial-menu{right:22px;bottom:calc(22px + env(safe-area-inset-bottom))}}
@media(max-width:599px){.care-radial-menu{right:16px;bottom:calc(18px + env(safe-area-inset-bottom))}.radial-trigger{width:60px;height:60px}.care-radial-menu{width:60px;height:60px}}
@media(prefers-reduced-motion:reduce){.radial-tooltip{transition:none}.radial-trigger:hover{scale:1}}
</style>
