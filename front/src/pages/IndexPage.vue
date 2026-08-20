<template>
  <q-page class="home-page">
    <main>
      <section class="hero-shell" aria-label="照安心重點服務">
        <q-carousel
          v-model="heroSlide"
          animated
          infinite
          swipeable
          :autoplay="reduceMotion ? false : 7000"
          transition-prev="fade"
          transition-next="fade"
          class="hero-carousel"
        >
          <q-carousel-slide
            v-for="slide in heroSlides"
            :key="slide.name"
            :name="slide.name"
            :img-src="slide.image"
            class="hero-slide"
          >
            <div class="hero-overlay" aria-hidden="true"></div>
            <div class="hero-content">
              <span class="hero-kicker"><MapPinned :size="20" /> 花蓮在地照護</span>
              <h1>{{ slide.title }}</h1>
              <p>{{ slide.description }}</p>
              <router-link class="primary-action" :to="slide.to">
                {{ slide.action }} <ArrowRight :size="22" />
              </router-link>
            </div>
          </q-carousel-slide>
        </q-carousel>
        <button class="hero-arrow hero-arrow--previous" type="button" aria-label="上一張重點服務" @click="changeHero(-1)">
          <ChevronLeft :size="28" />
        </button>
        <button class="hero-arrow hero-arrow--next" type="button" aria-label="下一張重點服務" @click="changeHero(1)">
          <ChevronRight :size="28" />
        </button>
        <div class="hero-dots" aria-label="選擇重點服務">
          <button
            v-for="slide in heroSlides"
            :key="`${slide.name}-dot`"
            type="button"
            :class="{ active: heroSlide === slide.name }"
            :aria-label="`顯示${slide.title}`"
            :aria-current="heroSlide === slide.name ? 'true' : undefined"
            @click="heroSlide = slide.name"
          ></button>
        </div>
      </section>

      <section class="quick-section" aria-labelledby="quick-title">
        <div class="section-heading compact-heading">
          <div>
            <span class="section-kicker">常用服務</span>
            <h2 id="quick-title">今天需要什麼幫忙？</h2>
          </div>
          <p>選一張卡片，就能開始。</p>
        </div>

<div class="quick-grid">
  <template v-for="item in quickActions" :key="item.title">

    <!-- 頁面內捲動 -->
    <button
      v-if="item.scrollTo"
      type="button"
      class="quick-card"
      @click="scrollToSection(item.scrollTo)"
    >
      <span class="quick-card__icon" :class="item.tone">
        <component :is="item.icon" :size="34" />
      </span>

      <span class="quick-card__copy">
        <strong>{{ item.title }}</strong>
        <small>{{ item.description }}</small>
      </span>

      <ChevronRight class="quick-card__arrow" :size="26" />
    </button>

    <!-- Vue Router 換頁 -->
    <router-link
      v-else-if="item.to"
      :to="item.to"
      class="quick-card"
    >
      <span class="quick-card__icon" :class="item.tone">
        <component :is="item.icon" :size="34" />
      </span>

      <span class="quick-card__copy">
        <strong>{{ item.title }}</strong>
        <small>{{ item.description }}</small>
      </span>

      <ChevronRight class="quick-card__arrow" :size="26" />
    </router-link>

  </template>
</div>
      </section>

      <section class="care-section" aria-labelledby="care-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">安心夥伴</span>
            <h2 id="care-title">認識可接案的居服員</h2>
          </div>
          <router-link class="text-action" to="/caregivers">查看全部 <ArrowRight :size="19" /></router-link>
        </div>

        <div v-if="caregiverLoading" class="caregiver-row" aria-label="正在載入居服員">
          <q-skeleton v-for="item in 4" :key="item" type="rect" class="caregiver-skeleton" />
        </div>
        <div v-else-if="caregiverError" class="friendly-state" role="status">
          <WifiOff :size="28" />
          <div><strong>暫時讀不到居服員資料</strong><span>請稍後再試一次。</span></div>
          <button type="button" @click="loadCaregivers">重新整理</button>
        </div>
        <div v-else class="caregiver-row" aria-label="已認證且可接案的居服員">
          <router-link
            v-for="caregiver in caregivers.slice(0, 6)"
            :key="caregiver._id"
            to="/caregivers"
            class="caregiver-card"
          >
            <div class="caregiver-card__photo">
              <img
                :src="assetUrl(caregiver.profilePhotoUrl)"
                :alt="`${caregiverName(caregiver)}的居服員近照`"
                loading="lazy"
                @error="useFallbackPhoto"
              >
              <span><BadgeCheck :size="17" /> 已認證</span>
            </div>
            <div class="caregiver-card__body">
              <h3>{{ caregiverName(caregiver) }}</h3>
              <p><BriefcaseBusiness :size="17" /> {{ experienceLabel(caregiver) }}</p>
              <p><MapPin :size="17" /> {{ areaLabel(caregiver) }}</p>
              <span class="caregiver-card__more">看看詳細介紹 <ChevronRight :size="17" /></span>
            </div>
          </router-link>
        </div>
      </section>

      <section id="subsidy" class="estimate-section" aria-labelledby="estimate-title">
        <div class="estimate-intro">
          <span class="section-kicker light">簡單試算</span>
          <h2 id="estimate-title">長照費用，先一起算算看</h2>
          <p>不用看複雜表格，只要完成四個選擇。</p>
          <div class="estimate-note"><ShieldCheck :size="22" /> 試算結果僅供專題展示，實際補助依主管機關核定。</div>
        </div>

        <div class="estimate-card"><CareCostCalculator compact /></div>
      </section>

      <section class="steps-section" aria-labelledby="steps-title">
        <div class="section-heading centered-heading">
          <div><span class="section-kicker">三個步驟</span><h2 id="steps-title">找到幫手，其實很簡單</h2></div>
        </div>
        <ol class="steps-grid">
          <li v-for="step in steps" :key="step.number">
            <span class="step-number">{{ step.number }}</span>
            <component :is="step.icon" :size="34" />
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <section class="line-banner" aria-label="LINE 專人協助">
        <div class="line-banner__icon"><MessageCircleHeart :size="40" /></div>
        <div><span>不習慣操作網站也沒關係</span><h2>LINE 專人陪您一步一步完成</h2></div>
        <button type="button" disabled>LINE 服務準備中</button>
      </section>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { markRaw, onMounted, ref } from 'vue';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Calculator,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  MapPin,
  MapPinned,
  MessageCircleHeart,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  WifiOff,
} from '@lucide/vue';
import { api } from '@/boot/axios';
import CareCostCalculator from '@/components/CareCostCalculator.vue';

interface Caregiver {
  _id: string;
  userId?: { name?: string } | string;
  profilePhotoUrl?: string;
  yearsExperience?: number;
  serviceAreas?: string[];
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroSlide = ref('home');
const caregivers = ref<Caregiver[]>([]);
const caregiverLoading = ref(true);
const caregiverError = ref(false);

const heroSlides = [
  { name: 'home', image: '/images/home/hualien-care-walk.png', title: '讓照護安排，像家人一樣安心', description: '花蓮在地媒合，找到適合家人的照護夥伴。', action: '找居服員', to: '/caregivers' },
  { name: 'meal', image: '/images/home/warm-home-meal.png', title: '需要幫忙時，我們就在身邊', description: '日常陪伴、備餐與生活照顧，都能放心說出需求。', action: '開始預約', to: '/login' },
  { name: 'connect', image: '/images/home/family-care-connect.png', title: '家人不在身邊，也能隨時放心', description: '照護進度清楚可見，家屬與受照護者都更安心。', action: '了解服務', to: '/users' },
];

const quickActions = [
  {
    title: '線上預約服務',
    description: '替自己或家人找幫手',
    icon: markRaw(CalendarHeart),
    tone: 'coral',
    to: '/login',
  },
  {
    title: '長照補助算算看',
    description: '四個選擇，簡單了解',
    icon: markRaw(Calculator),
    tone: 'sage',
    scrollTo: 'subsidy',
  },
  {
    title: '看看居服員',
    description: '認識已通過審核的夥伴',
    icon: markRaw(UserRoundSearch),
    tone: 'wood',
    to: '/caregivers',
  },
];

const steps = [
  { number: '1', icon: markRaw(ClipboardCheck), title: '說出需要', description: '選服務、日期和地點' },
  { number: '2', icon: markRaw(SearchCheck), title: '安心媒合', description: '查看合適的居服員' },
  { number: '3', icon: markRaw(HeartHandshake), title: '到府陪伴', description: '確認資訊，開始服務' },
];

function caregiverName(caregiver: Caregiver) {
  return typeof caregiver.userId === 'object' ? caregiver.userId.name || '照安心夥伴' : '照安心夥伴';
}

function changeHero(direction: number) {
  const currentIndex = heroSlides.findIndex((slide) => slide.name === heroSlide.value);
  const nextIndex = (currentIndex + direction + heroSlides.length) % heroSlides.length;
  heroSlide.value = heroSlides[nextIndex]?.name || heroSlides[0]!.name;
}
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function experienceLabel(caregiver: Caregiver) {
  return caregiver.yearsExperience ? `${caregiver.yearsExperience} 年服務經驗` : '新進照護夥伴';
}

function areaLabel(caregiver: Caregiver) {
  return caregiver.serviceAreas?.slice(0, 2).join('、') || '服務地區洽談';
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

function assetUrl(path?: string) {
  if (!path) return '/chioansimicon.svg';

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath.startsWith('/uploads/')) {
    return `${backendBaseUrl}${normalizedPath}`;
  }

  return normalizedPath;
}

function useFallbackPhoto(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  image.src = '/chioansimicon.svg';
  image.classList.add('is-fallback');
}

async function loadCaregivers() {
  caregiverLoading.value = true;
  caregiverError.value = false;
  try {
    const { data } = await api.get<Caregiver[]>('/nurses');
    caregivers.value = data;
  } catch {
    caregiverError.value = true;
  } finally {
    caregiverLoading.value = false;
  }
}

onMounted(loadCaregivers);
</script>

<style scoped>
.home-page {
  --milk: #fff9f5;
  --paper: #fffdfb;
  --ink: #493833;
  --chestnut: #6e5750;
  --peach: #eb9079;
  --persimmon: #c85618;
  --sage: #4f7264;
  color: var(--ink);
  background: var(--milk);
}

main { padding: 28px 24px 72px; }
.hero-shell, .quick-section, .care-section, .estimate-section, .steps-section, .line-banner { width: min(1180px, 100%); margin-inline: auto; }

.hero-shell { position: relative; overflow: hidden; border-radius: 32px; box-shadow: 0 22px 55px rgb(78 52 43 / 14%); }
.hero-carousel { height: clamp(480px, 57vw, 650px); background: var(--chestnut); }
.hero-slide { position: relative; padding: clamp(32px, 6vw, 76px); background-position: center; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgb(49 33 28 / 82%) 0%, rgb(70 46 38 / 62%) 39%, rgb(50 32 27 / 8%) 75%); }
.hero-content { position: relative; z-index: 1; width: min(570px, 88%); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; height: 100%; color: white; }
.hero-kicker, .section-kicker { display: inline-flex; align-items: center; gap: 8px; color: #ffd8cd; font-weight: 700; letter-spacing: .12em; }
.hero-content h1 { margin: 20px 0 18px; font-size: clamp(2.35rem, 5vw, 4.4rem); line-height: 1.2; letter-spacing: .035em; text-wrap: balance; }
.hero-content p { margin: 0 0 30px; color: #fff7f2; font-size: clamp(1.05rem, 2vw, 1.35rem); line-height: 1.75; }
.primary-action, .estimate-action { min-height: 54px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 0 24px; color: white; background: var(--persimmon); border-radius: 16px; box-shadow: 0 12px 26px rgb(157 62 13 / 28%); font-size: 1.08rem; font-weight: 700; text-decoration: none; transition: transform 180ms ease, background 180ms ease; }
.primary-action:hover, .estimate-action:hover { background: #aa4211; transform: translateY(-2px); }

.hero-arrow { position: absolute; z-index: 3; top: 50%; width: 50px; height: 50px; display: grid; place-items: center; padding: 0; color: white; background: rgb(72 48 40 / 62%); border: 1px solid rgb(255 255 255 / 48%); border-radius: 50%; cursor: pointer; transform: translateY(-50%); }
.hero-arrow--previous { left: 18px; }
.hero-arrow--next { right: 18px; }
.hero-dots { position: absolute; z-index: 3; left: 50%; bottom: 18px; display: flex; gap: 8px; transform: translateX(-50%); }
.hero-dots button { width: 44px; height: 44px; position: relative; padding: 0; background: transparent; border: 0; cursor: pointer; }
.hero-dots button::after { content: ''; position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; background: rgb(255 255 255 / 62%); border: 2px solid white; border-radius: 999px; transform: translate(-50%, -50%); transition: width 180ms ease, background 180ms ease; }
.hero-dots button.active::after { width: 26px; background: white; }

.quick-section, .care-section, .steps-section { padding-top: 68px; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.section-heading h2 { margin: 8px 0 0; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.25; }
.section-heading p { margin: 0; color: #7c655e; font-size: 1.06rem; }
.section-kicker { color: var(--persimmon); font-size: .9rem; }
.text-action { min-height: 48px; display: inline-flex; align-items: center; gap: 7px; padding: 0 6px; color: var(--persimmon); font-size: 1.05rem; font-weight: 700; text-decoration: none; white-space: nowrap; }

.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.quick-card { min-height: 126px; display: flex; align-items: center; gap: 18px; padding: 24px; color: var(--ink); background: var(--paper); border: 1px solid rgb(110 87 80 / 12%); border-radius: 24px; box-shadow: 0 14px 34px rgb(78 52 43 / 8%); text-decoration: none; transition: transform 180ms ease, box-shadow 180ms ease; }
.quick-card:hover { transform: translateY(-4px); box-shadow: 0 20px 42px rgb(78 52 43 / 13%); }
.quick-card__icon { flex: 0 0 62px; width: 62px; height: 62px; display: grid; place-items: center; border-radius: 20px; }
.quick-card__icon.coral { color: #a63e20; background: #ffe5dc; }
.quick-card__icon.sage { color: #36594b; background: #deeee7; }
.quick-card__icon.wood { color: #6e4e3f; background: #eee1d8; }
.quick-card__copy { display: flex; flex-direction: column; gap: 7px; }
.quick-card__copy strong { font-size: 1.25rem; }
.quick-card__copy small { color: #7c655e; font-size: .96rem; line-height: 1.5; }
.quick-card__arrow { margin-left: auto; color: var(--persimmon); }

.caregiver-row { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 20px; overflow-x: auto; padding: 4px 4px 20px; scroll-snap-type: x mandatory; scrollbar-color: #d8b9ab transparent; }
.caregiver-card { scroll-snap-align: start; overflow: hidden; color: var(--ink); background: var(--paper); border: 1px solid rgb(110 87 80 / 12%); border-radius: 24px; box-shadow: 0 12px 30px rgb(78 52 43 / 8%); text-decoration: none; }
.caregiver-card__photo { position: relative; height: 220px; overflow: hidden; background: #f4e5de; }
.caregiver-card__photo img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform 300ms ease; }
.caregiver-card:hover img { transform: scale(1.035); }
.caregiver-card__photo img.is-fallback { padding: 52px; object-fit: contain; }
.caregiver-card__photo > span { position: absolute; left: 14px; bottom: 14px; display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; color: #315746; background: #eef8f1; border-radius: 999px; font-size: .85rem; font-weight: 700; }
.caregiver-card__body { padding: 20px; }
.caregiver-card h3 { margin: 0 0 13px; font-size: 1.45rem; }
.caregiver-card p { display: flex; align-items: center; gap: 7px; margin: 8px 0; color: #765f58; }
.caregiver-card__more { display: inline-flex; align-items: center; gap: 4px; margin-top: 12px; color: var(--persimmon); font-weight: 700; }
.caregiver-skeleton { height: 390px; border-radius: 24px; }
.friendly-state { min-height: 140px; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 24px; color: var(--chestnut); background: #fff1eb; border-radius: 24px; }
.friendly-state div { display: flex; flex-direction: column; gap: 3px; }
.friendly-state button { min-height: 44px; padding: 0 18px; color: white; background: var(--persimmon); border: 0; border-radius: 14px; font: inherit; }

.estimate-section { display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(28px, 6vw, 72px); align-items: center; margin-top: 80px; padding: clamp(34px, 6vw, 72px); color: white; background: var(--chestnut); border-radius: 32px; box-shadow: 0 24px 56px rgb(64 44 37 / 16%); scroll-margin-top: 92px; }
.estimate-intro h2 { margin: 12px 0 18px; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.25; }
.estimate-intro > p { color: #f7e8e2; font-size: 1.12rem; line-height: 1.7; }
.section-kicker.light { color: #ffd4c8; }
.estimate-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 28px; padding: 16px; color: #f8eee9; background: rgb(255 255 255 / 10%); border-radius: 16px; line-height: 1.6; }
.estimate-card { padding: clamp(24px, 4vw, 38px); color: var(--ink); background: var(--paper); border-radius: 26px; }
.estimate-step { display: flex; align-items: center; gap: 14px; }
.estimate-step > span { width: 38px; height: 38px; display: grid; place-items: center; color: white; background: var(--peach); border-radius: 50%; font-size: 1.1rem; font-weight: 700; }
.estimate-step div { display: flex; flex-direction: column; gap: 3px; }
.estimate-step strong { font-size: 1.2rem; }
.estimate-step small { color: #806a63; }
.choice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
.choice-grid button { min-height: 54px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--chestnut); background: #fffaf7; border: 1px solid #dfcec6; border-radius: 15px; font: inherit; font-size: 1rem; cursor: pointer; }
.choice-grid button.selected { color: #963e16; background: #fff0e9; border-color: var(--peach); font-weight: 700; }
.estimate-summary { display: flex; align-items: center; gap: 13px; padding: 17px; background: #f5eee9; border-radius: 16px; }
.estimate-summary div { display: flex; flex-direction: column; gap: 3px; }
.estimate-summary small { color: #806a63; }
.estimate-action { width: 100%; margin-top: 18px; }

.centered-heading { justify-content: center; text-align: center; }
.steps-grid { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 0; padding: 0; list-style: none; }
.steps-grid li { position: relative; padding: 30px 26px; text-align: center; background: var(--paper); border: 1px solid rgb(110 87 80 / 12%); border-radius: 24px; }
.steps-grid li > svg { color: var(--persimmon); }
.step-number { position: absolute; top: 16px; left: 18px; color: #aa4a21; font-weight: 700; }
.steps-grid h3 { margin: 13px 0 8px; font-size: 1.32rem; }
.steps-grid p { margin: 0; color: #7c655e; font-size: 1rem; }

.line-banner { display: flex; align-items: center; gap: 22px; margin-top: 68px; padding: 28px 34px; color: #fafffc; background: var(--sage); border-radius: 26px; }
.line-banner__icon { flex: 0 0 68px; width: 68px; height: 68px; display: grid; place-items: center; background: rgb(255 255 255 / 14%); border-radius: 22px; }
.line-banner span { color: #dcebe4; }
.line-banner h2 { margin: 5px 0 0; font-size: clamp(1.35rem, 3vw, 2rem); }
.line-banner button { min-height: 50px; margin-left: auto; padding: 0 22px; color: #335649; background: #edf8f1; border: 0; border-radius: 15px; font: inherit; font-weight: 700; }

a:focus-visible, button:focus-visible { outline: 3px solid #f3a089; outline-offset: 3px; }

@media (max-width: 900px) {
  main { padding-inline: 16px; }
  .quick-grid { grid-template-columns: 1fr; }
  .quick-card { min-height: 108px; }
  .estimate-section { grid-template-columns: 1fr; }
  .steps-grid { grid-template-columns: 1fr; }
  .line-banner { align-items: flex-start; flex-wrap: wrap; }
  .line-banner button { width: 100%; margin-left: 0; }
}

@media (max-width: 599px) {
  main {
    width: 100%;
    max-width: 100%;
    padding: 16px 12px 48px;
    overflow-x: hidden;
  }

  .estimate-section {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin-top: 58px;
    padding: 28px 16px;
    border-radius: 26px;
    box-sizing: border-box;
  }

  .estimate-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 22px 14px;
    border-radius: 22px;
    box-sizing: border-box;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
</style>
