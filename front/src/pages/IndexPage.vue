<template>
  <q-page class="home-page">
    <main ref="homePage" class="home-main">
      <HomeHero ref="homeHero" @journey="scrollToSection('home-journey')" />

      <HomeCareDayStory :progress-steps="progressSteps" @line="handleFeatureItem('LINE 專人服務')" />

      <HomeServiceBridge />

      <section class="caregivers scene story-panel story-panel--paper" data-panel="bottom-left" aria-labelledby="care-title">
        <div class="panel-reveal" aria-hidden="true"></div>
        <header data-reveal><span class="eyebrow">適合的照護夥伴</span><h2 id="care-title">找到值得信任的<br>居服員</h2><p>資格、經驗與服務地區，都清楚呈現。</p><router-link class="text-link" to="/caregivers">查看全部居服員 <ArrowRight :size="19" /></router-link></header>
        <div v-if="caregiverLoading" class="caregiver-row" aria-label="正在載入居服員"><q-skeleton v-for="n in 4" :key="n" type="rect" class="skeleton" /></div>
        <div v-else-if="caregiverError" class="state" role="status"><WifiOff /><div><strong>暫時讀不到居服員資料</strong><span>請稍後再試一次。</span></div><button type="button" @click="loadCaregivers">重新整理</button></div>
        <div v-else class="caregiver-row" aria-label="已認證且可接案的居服員" data-stagger><router-link v-for="c in caregivers.slice(0,3)" :key="c._id" to="/caregivers" class="caregiver-card"><div class="photo"><img :src="assetUrl(c.profilePhotoUrl)" :alt="`${caregiverName(c)}的居服員近照`" loading="lazy" @error="useFallbackPhoto"><span><BadgeCheck :size="17" /> 已認證</span></div><div class="body"><h3>{{ caregiverName(c) }}</h3><p><BriefcaseBusiness :size="17" /> {{ experienceLabel(c) }}</p><p><MapPin :size="17" /> {{ areaLabel(c) }}</p><b>查看介紹 <ChevronRight :size="17" /></b></div></router-link></div>
        <ol class="trust-list" aria-label="居服員信任保障" data-reveal><li><b>01</b><span>安心資格</span></li><li><b>02</b><span>服務經驗</span></li><li><b>03</b><span>真實評價</span></li></ol>
      </section>

      <section id="home-journey" ref="journey" class="booking-story story-panel story-panel--oat" data-panel="center" aria-labelledby="journey-title">
        <div class="panel-reveal" aria-hidden="true"></div>
        <header class="booking-story__heading"><span class="eyebrow">線上預約</span><h2 id="journey-title">預約，<br>其實可以很簡單。</h2><p>四個步驟，就有人來陪你。</p></header>
        <div class="booking-stage" aria-label="預約流程：告訴需求、找到居服員、選擇時間、安心開始">
          <div class="booking-stage__path" aria-hidden="true"><span class="booking-path-line"></span></div>
          <div class="booking-node booking-node--need"><span>01</span><MessagesSquare :size="36" /><strong>告訴我們需求</strong></div>
          <div class="booking-node booking-node--caregiver"><span>02</span><UserRoundCheck :size="38" /><strong>找到居服員</strong></div>
          <div class="booking-node booking-node--date"><span>03</span><div class="mini-calendar"><small>SEP</small><strong>02</strong><b>14:30</b></div><strong>選擇時間</strong></div>
          <div class="booking-node booking-node--done"><span>04</span><HouseHeart :size="42" /><strong>安心開始</strong></div>
          <Heart class="booking-heart" :size="34" aria-hidden="true" />
        </div>
      </section>

      <section id="subsidy" class="estimate scene story-panel story-panel--chestnut" data-panel="center" aria-labelledby="estimate-title"><div class="panel-reveal" aria-hidden="true"></div><div data-reveal><span class="eyebrow">簡單試算</span><h2 id="estimate-title">長照費用，先算算看</h2><p>完成四個選擇，就能看到預估費用。</p><aside><ShieldCheck :size="22" /> 試算僅供參考，實際補助依主管機關核定。</aside></div><div class="calculator" data-reveal><CareCostCalculator compact /></div></section>
    </main>
    <HomeQuickAccess @line="handleFeatureItem('LINE 專人服務')" />
    <OpeningExperience @finished="handleOpeningFinished" />
    <q-dialog v-model="lineDialog"><q-card class="line-dialog"><q-card-section class="line-dialog__mark"><MessageCircleHeart :size="42" /></q-card-section><q-card-section class="line-dialog__copy"><button type="button" aria-label="關閉 LINE 專人服務" v-close-popup><X :size="22" /></button><small>照安心 LINE 官方帳號</small><h2>需要時，我們就在 LINE 裡陪您</h2><p>官方 LINE ID</p><strong>@690hzupc</strong><a href="https://line.me/R/ti/p/@690hzupc" target="_blank" rel="noopener noreferrer">開啟 LINE 加好友 <ArrowRight :size="20" /></a></q-card-section><q-card-actions align="center"><q-btn flat no-caps label="稍後再說" v-close-popup /></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowRight, BadgeCheck, BellRing, Bike, BriefcaseBusiness, CheckCircle2, ChevronRight, Heart, HouseHeart, MapPin, MapPinned, MessageCircleHeart, MessagesSquare, Route, ShieldCheck, UserRoundCheck, WifiOff, X } from '@lucide/vue';
import { api } from '@/boot/axios';
import CareCostCalculator from '@/components/CareCostCalculator.vue';
import OpeningExperience from '@/components/opening/OpeningExperience.vue';
import HomeHero from '@/components/home/HomeHero.vue';
import HomeCareDayStory from '@/components/home/story/HomeCareDayStory.vue';
import HomeServiceBridge from '@/components/home/HomeServiceBridge.vue';
import HomeQuickAccess from '@/components/home/HomeQuickAccess.vue';
import { gsap, ScrollTrigger } from '@/composables/useGsap';

interface Caregiver { _id: string; userId?: { name?: string } | string; profilePhotoUrl?: string; yearsExperience?: number; serviceAreas?: string[] }
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const homePage = ref<HTMLElement>(), homeHero = ref<InstanceType<typeof HomeHero>>(), journey = ref<HTMLElement>(), caregivers = ref<Caregiver[]>([]), caregiverLoading = ref(true), caregiverError = ref(false), lineDialog = ref(false);
let motionContext: gsap.Context | undefined, media: gsap.MatchMedia | undefined, motionStarted = false;
const progressSteps = [{ label: '承接任務', icon: markRaw(CheckCircle2) }, { label: '準備出發', icon: markRaw(Bike) }, { label: '抵達服務地點', icon: markRaw(MapPinned) }, { label: '家人收到通知', icon: markRaw(BellRing) }, { label: '完成服務', icon: markRaw(Route) }];
function caregiverName(c: Caregiver) { return typeof c.userId === 'object' ? c.userId.name || '照安心夥伴' : '照安心夥伴'; }
function experienceLabel(c: Caregiver) { return c.yearsExperience ? `${c.yearsExperience} 年服務經驗` : '新進照護夥伴'; }
function areaLabel(c: Caregiver) { return c.serviceAreas?.slice(0, 2).join('、') || '服務地區洽談'; }
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api', backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
function assetUrl(path?: string) { if (!path) return '/chioansimicon.svg'; if (/^https?:\/\//.test(path)) return path; const p = path.startsWith('/') ? path : `/${path}`; return p.startsWith('/uploads/') ? `${backendBaseUrl}${p}` : p; }
function useFallbackPhoto(event: Event) { const image = event.currentTarget as HTMLImageElement; image.src = '/chioansimicon.svg'; image.classList.add('is-fallback'); }
function scrollToSection(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
function handleFeatureItem(name: string) { if (name === 'LINE 專人服務') lineDialog.value = true; }
async function loadCaregivers() { caregiverLoading.value = true; caregiverError.value = false; try { caregivers.value = (await api.get<Caregiver[]>('/nurses')).data; } catch { caregiverError.value = true; } finally { caregiverLoading.value = false; } }
function setupHomeScrollAnimations() {
  if (motionStarted || !homePage.value || !journey.value) return;
  motionStarted = true;
  const journeyEl = journey.value;
  motionContext = gsap.context(() => {
    media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal], [data-stagger] > *').forEach(element => gsap.from(element, { y: 10, autoAlpha: 0, duration: .25, scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none reverse' } }));
    });
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => gsap.from(element, { y: 42, autoAlpha: 0, duration: .85, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 82%', end: 'bottom 58%', toggleActions: 'play none none reverse' } }));
      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach(group => gsap.from(group.children, { y: 34, autoAlpha: 0, duration: .7, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: group, start: 'top 82%', toggleActions: 'play none none reverse' } }));

      gsap.timeline({ scrollTrigger: { trigger: journeyEl, start: 'top 68%', end: 'bottom 38%', scrub: 1 } })
        .from('.booking-story__heading > *', { y: 30, autoAlpha: 0, stagger: .08 }, 0)
        .fromTo('.booking-path-line', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', ease: 'none' }, .12)
        .from('.booking-node--need', { y: 35, scale: .8, autoAlpha: 0 }, .1)
        .from('.booking-node--caregiver', { y: -35, scale: .8, autoAlpha: 0 }, .32)
        .from('.booking-node--date', { y: 35, scale: .8, autoAlpha: 0 }, .54)
        .from('.booking-node--done', { y: -35, scale: .8, autoAlpha: 0 }, .76)
        .from('.booking-heart', { scale: 0, rotation: -25, autoAlpha: 0, ease: 'back.out(2)' }, .88);

      gsap.utils.toArray<HTMLElement>('[data-panel]').forEach(panel => {
        const reveal = panel.querySelector<HTMLElement>('.panel-reveal');
        const copy = panel.querySelector<HTMLElement>('header, :scope > div:not(.panel-reveal)');
        if (!reveal || panel === journeyEl || panel.id === 'needs') return;
        gsap.fromTo(reveal, { scale: 1.05 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 72%', end: 'bottom 28%', scrub: 1 } });
        if (copy) gsap.fromTo(copy, { xPercent: panel.dataset.panel === 'left' ? -5 : 5 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 75%', end: 'bottom 25%', scrub: .8 } });
      });

      gsap.utils.toArray<HTMLElement>('.cta-motion').forEach(wrapper => gsap.timeline({ scrollTrigger: { trigger: wrapper, start: 'top 88%', end: 'bottom 30%', scrub: .8 } }).fromTo(wrapper, { y: 16, scale: .94, opacity: .65 }, { y: 0, scale: 1, opacity: 1, duration: .65 }).to(wrapper, { scale: .96, opacity: .75, duration: .35 }));
    });

    gsap.utils.toArray<HTMLElement>('[data-panel]').forEach((panel, index) => gsap.to(homePage.value!, { '--scroll-bg': ['#fff9f5', '#fffdfb', '#f4eadf', '#e4ecdf', '#f8ded4'][Math.min(index, 4)], ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 1.2 } }));
    ScrollTrigger.refresh();
  }, homePage.value);
}
async function handleOpeningFinished() { await nextTick(); homeHero.value?.startEntrance(); ScrollTrigger.refresh(); }
onMounted(() => { loadCaregivers(); setupHomeScrollAnimations(); });
onBeforeUnmount(() => { media?.revert(); motionContext?.revert(); });
</script>

<style scoped>
.home-page{--milk:#fff9f5;--paper:#fffdfb;--ink:#493833;--chestnut:#6e5750;--peach:#eb9079;--persimmon:#c85618;color:var(--ink);background:var(--milk)}.home-main{overflow:clip}.eyebrow{display:block;margin-bottom:12px;color:var(--persimmon);font-size:.88rem;font-weight:700;letter-spacing:.16em}h2{margin:0 0 16px;font-size:clamp(2.3rem,4.5vw,4rem);line-height:1.14;letter-spacing:-.035em}h3{margin:0 0 8px;font-size:1.3rem}.story-panel{position:relative;isolation:isolate;overflow:hidden}.story-panel>*:not(.panel-reveal){position:relative;z-index:1}.panel-reveal{position:absolute;z-index:0;inset:0;will-change:transform}.story-panel--paper .panel-reveal{background:#fffaf7}.story-panel--oat .panel-reveal{background:#f4eee8}.story-panel--blue .panel-reveal{background:#eef3ed}.story-panel--chestnut .panel-reveal{background:#f4eee8}.story-panel--green .panel-reveal{background:linear-gradient(100deg,#edf1df,#fff9f5)}.text-link,.primary{min-height:48px;display:inline-flex;align-items:center;gap:7px;color:var(--persimmon);font-weight:700;text-decoration:none}.primary{min-height:52px;padding:0 24px;color:#fff;background:var(--persimmon);border-radius:15px}.text-link:focus-visible,.primary:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #eb9079;outline-offset:3px}
.caregivers{display:grid;grid-template-columns:minmax(240px,.38fr) minmax(0,1fr);gap:clamp(40px,6vw,90px);padding:clamp(80px,8vw,120px) max(24px,calc((100vw - 1440px)/2));background:#fffaf7}.caregivers header{max-width:420px}.caregivers header p{color:var(--chestnut);font-size:1.08rem;line-height:1.7}.caregiver-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;min-width:0}.caregiver-card{overflow:hidden;scroll-snap-align:start;color:var(--ink);background:var(--paper);border:1px solid #6e57501f;border-radius:22px;box-shadow:0 14px 36px #49383310;text-decoration:none}.photo{position:relative;aspect-ratio:4/5;overflow:hidden;background:#f4e5de}.photo img{width:100%;height:100%;object-fit:cover}.photo img.is-fallback{padding:36px;object-fit:contain}.photo span{position:absolute;left:10px;bottom:10px;display:flex;gap:5px;padding:6px 9px;color:#315746;background:#eef8f1;border-radius:999px}.body{padding:20px}.body p,.body b{display:flex;align-items:center;gap:7px;margin:7px 0;color:var(--chestnut)}.body b{color:var(--persimmon)}.skeleton{height:380px;border-radius:22px}.state{grid-column:2;display:flex;align-items:center;justify-content:center;gap:16px;padding:28px;background:#fff1eb;border-radius:22px}.state div{display:flex;flex-direction:column}.state button{min-height:44px;padding:0 16px;color:#fff;background:var(--persimmon);border:0;border-radius:12px}.trust-list{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);margin:0;padding:0;border-top:1px solid #6e57502e;list-style:none}.trust-list li{display:flex;align-items:center;gap:14px;padding:24px 12px;border-bottom:1px solid #6e57502e}.trust-list b{color:var(--persimmon);letter-spacing:.14em}
.booking-story{padding:clamp(80px,8vw,120px) max(24px,calc((100vw - 1440px)/2));display:grid;gap:clamp(48px,7vw,88px)}.booking-story__heading{max-width:760px}.booking-story__heading p,.estimate p{color:var(--chestnut);font-size:1.08rem;line-height:1.7}.booking-stage{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(16px,2.5vw,40px)}.booking-stage__path{position:absolute;left:9%;right:9%;top:50%;height:5px;overflow:hidden;background:#fffdfb;border-radius:99px}.booking-path-line{display:block;width:100%;height:100%;background:var(--persimmon)}.booking-node{position:relative;z-index:1;min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px 16px;background:var(--paper);border:1px solid #6e57501f;border-radius:26px;box-shadow:0 18px 40px #49383312;text-align:center}.booking-node>span{position:absolute;top:16px;left:18px;color:var(--persimmon);font-size:.78rem;font-weight:700}.booking-node>svg{color:var(--persimmon)}.mini-calendar{width:88px;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:10px;background:#f8e7df;border-radius:14px}.mini-calendar small{grid-column:1/-1;color:var(--persimmon);font-weight:700}.mini-calendar strong{font-size:1.8rem}.mini-calendar b{font-size:.85rem}.booking-heart{position:absolute;z-index:2;right:0;top:18%;color:var(--persimmon);fill:#fffdfb}
.estimate{display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:clamp(40px,7vw,100px);padding:clamp(80px,8vw,120px) max(24px,calc((100vw - 1440px)/2));background:#f4eee8}.estimate aside{display:flex;gap:10px;padding:15px;color:var(--chestnut);background:#fffdfb99;border-radius:16px}.calculator{padding:clamp(18px,3vw,34px);background:var(--paper);border-radius:24px;box-shadow:0 20px 50px #49383312}
.line-dialog{width:min(430px,calc(100vw - 28px));padding:10px 18px 18px;color:var(--ink);background:var(--paper);border-radius:26px}.line-dialog__mark{width:76px;height:76px;display:grid;place-items:center;margin:18px auto 0;color:#fff;background:#4f7264;border-radius:24px}.line-dialog__copy{position:relative;text-align:center}.line-dialog__copy>button{position:absolute;top:-86px;right:-8px;width:44px;height:44px;background:transparent;border:0}.line-dialog__copy h2{margin:10px 0 20px}.line-dialog__copy p{margin:0}.line-dialog__copy strong{display:block;margin:5px 0 20px}.line-dialog__copy a{min-height:50px;display:inline-flex;align-items:center;gap:8px;padding:0 20px;color:#fff;background:var(--persimmon);border-radius:14px;text-decoration:none}
@media(max-width:900px){.caregivers,.estimate{grid-template-columns:1fr}.caregiver-row{grid-auto-flow:column;grid-auto-columns:minmax(270px,78vw);grid-template-columns:none;overflow-x:auto;padding-bottom:16px;scroll-snap-type:x mandatory}.state{grid-column:auto}.trust-list{grid-column:auto}.booking-stage{grid-template-columns:repeat(2,1fr)}.booking-stage__path{display:none}}
@media(max-width:599px){.caregivers,.booking-story,.estimate{padding:72px 18px}.caregiver-row{grid-auto-columns:82vw}.trust-list{grid-template-columns:1fr}.booking-stage{grid-template-columns:1fr;gap:20px;padding-left:24px}.booking-stage__path{left:8px;right:auto;top:8%;width:5px;height:84%;display:block;background:var(--persimmon)}.booking-path-line{display:none}.booking-node{min-height:145px}.primary{width:100%;justify-content:center}}
@media(prefers-reduced-motion:reduce){.panel-reveal,.booking-path-line,.booking-node,.booking-heart,.cta-motion{transform:none!important;will-change:auto!important}}
</style>
