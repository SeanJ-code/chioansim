<template>
  <q-page class="home-page">
    <main ref="homePage" class="home-main">
      <HomeHero ref="homeHero" @journey="scrollToSection('home-journey')" />

      <HomeNeedsStory />

      <section class="caregivers scene story-panel story-panel--paper" data-panel="bottom-left" aria-labelledby="care-title">
        <div class="panel-reveal" aria-hidden="true"></div>
        <header data-reveal><span class="chapter-number">03</span><h2 id="care-title">找到值得信任的<br>居服員</h2><p>資格、經驗與服務地區，都清楚呈現。</p><router-link class="text-link" to="/caregivers">查看全部居服員 <ArrowRight :size="19" /></router-link></header>
        <div v-if="caregiverLoading" class="caregiver-row" aria-label="正在載入居服員"><q-skeleton v-for="n in 4" :key="n" type="rect" class="skeleton" /></div>
        <div v-else-if="caregiverError" class="state" role="status"><WifiOff /><div><strong>暫時讀不到居服員資料</strong><span>請稍後再試一次。</span></div><button type="button" @click="loadCaregivers">重新整理</button></div>
        <div v-else class="caregiver-row" aria-label="已認證且可接案的居服員" data-stagger><router-link v-for="c in caregivers.slice(0,3)" :key="c._id" to="/caregivers" class="caregiver-card"><div class="photo"><img :src="assetUrl(c.profilePhotoUrl)" :alt="`${caregiverName(c)}的居服員近照`" loading="lazy" @error="useFallbackPhoto"><span><BadgeCheck :size="17" /> 已認證</span></div><div class="body"><h3>{{ caregiverName(c) }}</h3><p><BriefcaseBusiness :size="17" /> {{ experienceLabel(c) }}</p><p><MapPin :size="17" /> {{ areaLabel(c) }}</p><b>查看介紹 <ChevronRight :size="17" /></b></div></router-link></div>
        <ol class="trust-list" aria-label="居服員信任保障" data-reveal><li><b>01</b><span>安心資格</span></li><li><b>02</b><span>服務經驗</span></li><li><b>03</b><span>真實評價</span></li></ol>
      </section>

      <section id="home-journey" ref="journey" class="booking-story story-panel story-panel--oat" data-panel="center" aria-labelledby="journey-title">
        <div class="panel-reveal" aria-hidden="true"></div>
        <header class="booking-story__heading"><span class="chapter-number">04</span><h2 id="journey-title">預約，<br>其實可以很簡單。</h2><p>四個步驟，就有人來陪你。</p></header>
        <div class="booking-stage" aria-label="預約流程：告訴需求、找到居服員、選擇時間、安心開始">
          <div class="booking-stage__path" aria-hidden="true"><span class="booking-path-line"></span></div>
          <div class="booking-node booking-node--need"><span>01</span><MessagesSquare :size="36" /><strong>告訴我們需求</strong></div>
          <div class="booking-node booking-node--caregiver"><span>02</span><UserRoundCheck :size="38" /><strong>找到居服員</strong></div>
          <div class="booking-node booking-node--date"><span>03</span><div class="mini-calendar"><small>SEP</small><strong>02</strong><b>14:30</b></div><strong>選擇時間</strong></div>
          <div class="booking-node booking-node--done"><span>04</span><HouseHeart :size="42" /><strong>安心開始</strong></div>
          <Heart class="booking-heart" :size="34" aria-hidden="true" />
        </div>
      </section>

      <section class="progress-story scene story-panel story-panel--blue" data-panel="left" aria-labelledby="progress-title"><div class="panel-reveal" aria-hidden="true"></div><header data-reveal><span class="chapter-number">05</span><h2 id="progress-title">照顧正在進行中</h2><p>從出發到抵達，家人都知道照顧正在發生。</p></header><div class="progress-route" data-progress-route><div class="route-person"><UserRoundCheck :size="48" /><span>居服員</span></div><div class="route-line"><i></i><span class="route-dot"></span></div><div class="route-home"><HouseHeart :size="50" /><span>家</span></div></div><ol class="progress-steps" data-stagger><li v-for="item in progressSteps" :key="item.label"><component :is="item.icon" :size="27" /><span>{{ item.label }}</span></li></ol></section>

      <section id="subsidy" class="estimate scene story-panel story-panel--chestnut" data-panel="center" aria-labelledby="estimate-title"><div class="panel-reveal" aria-hidden="true"></div><div data-reveal><span class="eyebrow">簡單試算</span><h2 id="estimate-title">長照費用，先算算看</h2><p>完成四個選擇，就能看到預估費用。</p><aside><ShieldCheck :size="22" /> 試算僅供參考，實際補助依主管機關核定。</aside></div><div class="calculator" data-reveal><CareCostCalculator compact /></div></section>

      <section class="ending story-panel story-panel--green" data-panel="right" aria-labelledby="ending-title"><div class="panel-reveal" aria-hidden="true"></div><div class="ending-photo" aria-hidden="true"><img src="/images/home/care-hands-watercolor-v2.png" alt=""></div><div class="ending-copy"><span class="chapter-number">06</span><HouseHeart :size="54" /><h2 id="ending-title">照顧的路上，<br>有人陪你一起。</h2><p>照顧不孤單，我們一直都在。</p><span class="cta-motion"><router-link class="primary" to="/caregivers">找居服員 <ArrowRight :size="21" /></router-link></span><button type="button" @click="handleFeatureItem('LINE 專人服務')">不熟悉網站？請 LINE 專人協助</button></div></section>
    </main>
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
import HomeNeedsStory from '@/components/home/HomeNeedsStory.vue';
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
        const copy = panel.querySelector<HTMLElement>('header, .ending-copy, :scope > div:not(.panel-reveal)');
        if (!reveal || panel === journeyEl || panel.id === 'needs') return;
        gsap.fromTo(reveal, { scale: 1.05 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 72%', end: 'bottom 28%', scrub: 1 } });
        if (copy) gsap.fromTo(copy, { xPercent: panel.dataset.panel === 'left' ? -5 : 5 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 75%', end: 'bottom 25%', scrub: .8 } });
      });

      gsap.utils.toArray<HTMLElement>('.cta-motion').forEach(wrapper => gsap.timeline({ scrollTrigger: { trigger: wrapper, start: 'top 88%', end: 'bottom 30%', scrub: .8 } }).fromTo(wrapper, { y: 16, scale: .94, opacity: .65 }, { y: 0, scale: 1, opacity: 1, duration: .65 }).to(wrapper, { scale: .96, opacity: .75, duration: .35 }));
      gsap.fromTo('.route-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-progress-route]', start: 'top 78%', end: 'bottom 45%', scrub: 1 } });
      gsap.fromTo('.route-dot', { xPercent: -50 }, { xPercent: 50, ease: 'none', scrollTrigger: { trigger: '[data-progress-route]', start: 'top 78%', end: 'bottom 45%', scrub: 1 } });

      const ending = homePage.value?.querySelector<HTMLElement>('.ending');
      if (ending) gsap.timeline({ scrollTrigger: { trigger: ending, start: 'top 80%', end: 'bottom bottom', scrub: 1 } })
        .fromTo('.ending-photo img', { scale: 1.08, yPercent: 8 }, { scale: 1, yPercent: 0, duration: .8, ease: 'none' }, 0)
        .fromTo('.ending-copy', { y: 70, opacity: .2 }, { y: 0, opacity: 1, duration: .8, ease: 'none' }, 0)
        .fromTo('.ending-copy > svg', { scale: .7, rotation: -8 }, { scale: 1, rotation: 0, duration: .65 }, .1)
        .to({}, { duration: .2 });
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
.home-page{--milk:#fff9f5;--paper:#fffdfb;--ink:#493833;--chestnut:#6e5750;--peach:#eb9079;--persimmon:#b84f16;--sage:#a9be8f;--blue:#9bb9cf;color:var(--ink);background:var(--milk)}main{overflow:clip;padding:0 24px 80px}.scene,.journey,.ending{width:min(1180px,100%);margin-inline:auto}.scene{position:relative;padding-top:clamp(90px,12vw,150px)}.scene header{max-width:720px;margin-bottom:38px}.scene h2,.journey h2,.ending h2{margin:12px 0 16px;font-size:clamp(2.2rem,5vw,4.1rem);line-height:1.15}.scene header p,.booking>div>p{color:var(--chestnut);font-size:1.08rem}h3{margin:0 0 8px;font-size:1.3rem}.caregivers header{position:relative;padding-left:8vw}.text-link{min-height:48px;display:inline-flex;align-items:center;gap:6px;color:var(--persimmon);font-weight:700;text-decoration:none}.caregiver-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(350px,1fr);gap:18px;overflow-x:auto;padding:4px 4px 20px;scroll-snap-type:x mandatory}.caregiver-card{min-height:240px;display:grid;grid-template-columns:145px 1fr;overflow:hidden;scroll-snap-align:start;color:var(--ink);background:var(--paper);border:1px solid #6e57501f;border-radius:22px;box-shadow:0 14px 36px #49383310;text-decoration:none}.photo{position:relative;min-height:240px;overflow:hidden;background:#f4e5de}.photo img{width:100%;height:100%;object-fit:cover}.photo img.is-fallback{padding:36px;object-fit:contain}.photo span{position:absolute;left:10px;bottom:10px;display:flex;gap:5px;padding:6px 9px;color:#315746;background:#eef8f1;border-radius:999px}.body{display:flex;flex-direction:column;justify-content:center;padding:20px}.body p,.body b{display:flex;align-items:center;gap:7px;margin:7px 0;color:var(--chestnut)}.body b{color:var(--persimmon)}.skeleton{height:240px;border-radius:22px}.state{display:flex;justify-content:center;gap:16px;padding:28px;background:#fff1eb;border-radius:22px}.state div{display:flex;flex-direction:column}.state button{min-height:44px;color:#fff;background:var(--persimmon);border:0;border-radius:14px}.journey{min-height:2400px;padding-top:140px}.journey-stage{min-height:calc(100dvh - 76px);display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:6vw;padding:48px;border-radius:32px;background:#f4eadf}.journey-copy{min-height:390px}.journey-steps{position:relative;min-height:180px;margin-top:44px}.journey-step{position:absolute;inset:0;opacity:0}.journey-step:first-child{opacity:1}.journey-step b{color:var(--persimmon);font-size:1.1rem;letter-spacing:.18em}.journey-step h3{margin:14px 0 10px;font-size:2rem}.journey-step p{color:var(--chestnut);font-size:1.08rem}.journey-actors{position:relative;height:340px;display:flex;align-items:center;justify-content:space-between}.actor{position:relative;z-index:2;width:124px;height:124px;display:grid;place-items:center;color:var(--ink);border:8px solid var(--paper);border-radius:50%;box-shadow:0 18px 36px #49383317}.actor--caregiver{background:#f6c6b7}.actor--elder{background:#cdddbb}.care-path{position:absolute;left:70px;right:70px;height:4px;background:#fffdfb}.care-path span{display:block;width:100%;height:100%;background:var(--persimmon);transform-origin:right}.journey-heart{position:absolute;left:50%;top:38%;z-index:4;color:var(--persimmon);opacity:0;transform:translate(-50%,-50%) scale(.3)}.booking{display:grid;grid-template-columns:1fr .85fr;align-items:center;gap:8vw;padding-inline:7vw}.calendar-card{padding:28px;background:var(--paper);border:1px solid #6e57501f;border-radius:26px;box-shadow:0 24px 60px #49383317;transform:rotate(1.5deg)}.calendar-card header{display:flex;align-items:center;gap:10px;margin:0 0 20px}.week,.dates{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;text-align:center}.week{color:var(--chestnut)}.dates span{aspect-ratio:1;display:grid;place-items:center;border-radius:50%}.dates .selected{color:white;background:var(--persimmon)}.estimate{display:grid;grid-template-columns:.85fr 1.15fr;gap:6vw;align-items:center;margin-top:140px;padding:clamp(34px,6vw,70px);color:#fff;background:var(--chestnut);border-radius:30px}.estimate .eyebrow{color:#ffd4c8}.estimate p{color:#f7e8e2}.estimate aside{display:flex;gap:10px;padding:15px;background:#ffffff1a;border-radius:16px}.calculator{padding:34px;color:var(--ink);background:var(--paper);border-radius:24px}.ending{display:flex;align-items:center;flex-direction:column;margin-top:140px;padding:90px 28px;text-align:center;background:linear-gradient(180deg,#e6eedb,var(--milk));border-radius:32px}.ending>svg{color:#4f7264}.ending>span{margin-top:24px;color:var(--chestnut)}.ending h2{max-width:760px}.ending button{min-height:48px;margin-top:22px;color:var(--chestnut);background:transparent;border:0;text-decoration:underline;font:inherit;cursor:pointer}.line-dialog{width:min(430px,calc(100vw - 28px));padding:10px 18px 18px;color:var(--ink);background:var(--paper);border-radius:26px}.line-dialog__mark{width:76px;height:76px;display:grid;place-items:center;margin:18px auto 0;color:white;background:#4f7264;border-radius:24px}.line-dialog__copy{position:relative;text-align:center}.line-dialog__copy>button{position:absolute;top:-86px;right:-8px;width:44px;height:44px;background:transparent;border:0}.line-dialog__copy h2{margin:10px 0 20px}.line-dialog__copy p{margin:0}.line-dialog__copy strong{display:block;margin:5px 0 20px}.line-dialog__copy a{min-height:50px;display:inline-flex;align-items:center;gap:8px;padding:0 20px;color:white;background:var(--persimmon);border-radius:14px;text-decoration:none}a:focus-visible,button:focus-visible{outline:3px solid #f3a089;outline-offset:3px}
@media(max-width:900px){main{padding-inline:16px}.journey{min-height:auto}.journey-stage{grid-template-columns:1fr;padding:42px 30px}.journey-steps{display:grid;gap:16px}.journey-step{position:relative;opacity:1;padding:18px 0;border-top:1px solid #6e57502e}.journey-actors{display:none}.booking,.estimate{grid-template-columns:1fr}.booking{padding-inline:0}.estimate{margin-top:100px}.caregiver-row{grid-auto-columns:minmax(330px,80vw)}}
@media(max-width:599px){main{padding:0 12px 48px}.primary{width:100%}.scene{padding-top:84px}.caregivers header{padding-left:0}.caregiver-row{grid-auto-columns:minmax(290px,88vw)}.caregiver-card{grid-template-columns:115px 1fr}.photo{min-height:225px}.journey{padding-top:84px}.journey-stage{min-height:auto;padding:32px 22px;border-radius:24px}.journey-copy{min-height:auto}.journey h2{font-size:2.35rem}.booking{gap:42px}.calendar-card{padding:20px}.estimate{padding:30px 16px}.calculator{padding:20px 12px}.ending{margin-top:84px;padding:64px 22px}.ending h2{font-size:2.3rem}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
.story-panel{position:relative;isolation:isolate;overflow:hidden;border-radius:clamp(28px,5vw,64px)}.story-panel>*:not(.panel-reveal){position:relative;z-index:1}.panel-reveal{position:absolute;z-index:0;inset:0;border-radius:inherit;will-change:transform}.story-panel--peach .panel-reveal{background:#f4d5ca}.story-panel--paper .panel-reveal{background:#fffdfb}.story-panel--oat .panel-reveal{background:#e9ddd7}.story-panel--blue .panel-reveal{background:#dee8e6}.story-panel--chestnut .panel-reveal{background:var(--chestnut)}.story-panel--green .panel-reveal{background:#dde5d3}.caregivers{padding:clamp(80px,10vw,130px) clamp(20px,6vw,72px)}.caregivers{margin-top:64px;padding-bottom:clamp(70px,9vw,110px)}.journey{padding-inline:24px}.journey-stage{background:transparent}.booking{min-height:88vh;margin-top:64px;padding-block:clamp(70px,10vw,120px)}.estimate{background:transparent}.ending{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,80px);padding:clamp(34px,6vw,74px);text-align:left;background:none}.ending-photo{overflow:hidden;aspect-ratio:4/3;border-radius:28px;box-shadow:0 24px 55px #4938331f}.ending-photo img{width:100%;height:100%;object-fit:cover}.ending-copy>svg{color:#4f7264}.ending-copy>span{display:block;margin-top:24px;color:var(--chestnut)}.ending-copy button{display:block}.primary{transition:transform .2s ease,box-shadow .2s ease}.primary:hover{transform:translateY(-2px);box-shadow:0 14px 30px #b84f1642}.primary:active{transform:scale(.98)}
@media(max-width:900px){.ending{grid-template-columns:1fr}.ending-photo{max-height:420px}.booking{padding-inline:clamp(22px,6vw,54px)}}
@media(max-width:599px){.caregivers{padding:72px 18px}.journey{padding-inline:0}.ending{padding:28px 18px 54px}.story-panel{border-radius:26px}}
@media(prefers-reduced-motion:reduce){.panel-reveal{transform:none!important}.primary{transition:none}}
.chapter-number{display:block;margin-bottom:14px;color:var(--persimmon);font-size:.9rem;font-weight:700;letter-spacing:.2em}.caregivers{border-radius:50% 50% 48px 48px/10% 10% 48px 48px}.caregivers header{padding-left:0}.caregiver-row{grid-auto-columns:minmax(300px,1fr);overflow:visible}.trust-list{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:36px 0 0;padding:0;border-top:1px solid #6e57502e;list-style:none}.trust-list li{display:flex;align-items:center;gap:14px;padding:24px 12px;border-bottom:1px solid #6e57502e}.trust-list b{color:var(--persimmon);letter-spacing:.14em}.trust-list span{font-weight:700}.journey-copy>p{color:var(--chestnut);font-size:1.08rem}.progress-story{min-height:92vh;display:flex;flex-direction:column;justify-content:center;margin-top:64px;padding:clamp(70px,9vw,110px) clamp(24px,7vw,90px)}.progress-story header{max-width:680px}.progress-route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px;margin:60px 0 44px}.route-person,.route-home{display:grid;place-items:center;gap:8px;color:var(--chestnut);font-weight:700}.route-line{position:relative;height:5px;background:#fffdfb;border-radius:99px}.route-line i{position:absolute;inset:0;background:var(--persimmon);border-radius:inherit;transform-origin:left}.route-dot{position:absolute;left:50%;top:50%;width:22px;height:22px;background:var(--paper);border:6px solid var(--persimmon);border-radius:50%;transform:translate(-50%,-50%)}.progress-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin:0;padding:0;list-style:none}.progress-steps li{display:grid;place-items:center;gap:10px;min-height:116px;padding:18px;color:var(--chestnut);background:#fffdfb99;border-radius:18px;text-align:center}.progress-steps svg{color:#52756d}.estimate{margin-top:64px}.ending-copy p{margin:0 0 28px;color:var(--chestnut);font-size:1.08rem}.ending-copy .chapter-number{margin-bottom:24px}.ending-photo img{filter:saturate(.82) contrast(.94)}
@media(max-width:900px){.caregiver-row{grid-auto-columns:minmax(300px,78vw);overflow-x:auto}.progress-steps{grid-template-columns:repeat(3,1fr)}.journey{min-height:auto}.journey-stage{min-height:auto}}
@media(max-width:599px){.caregivers{border-radius:26px}.trust-list{grid-template-columns:1fr}.trust-list li{justify-content:center}.progress-story{min-height:auto;padding:72px 18px}.progress-route{gap:12px;margin:42px 0 34px}.route-person svg,.route-home svg{width:38px}.progress-steps{grid-template-columns:1fr 1fr}.progress-steps li:last-child{grid-column:1/-1}.ending-copy{text-align:center}.ending-copy>svg{margin-inline:auto}.ending-copy button{margin-inline:auto}}
@media(prefers-reduced-motion:reduce){.route-line i{transform:none!important}.route-dot{display:none}}
.journey h2{font-size:clamp(2.4rem,4vw,3rem)}
@media(max-width:599px){.journey h2{font-size:2.35rem}}

/* Full-bleed scroll story: chapters are the page, not framed cards. */
.home-page,.home-page main{padding:0;overflow:clip}.scene,.journey,.ending{width:100%;max-width:none;margin:0}.story-panel,.caregivers,.panel-reveal{border-radius:0}.caregivers,.progress-story,.booking,.estimate,.ending{min-height:100dvh;padding-inline:max(clamp(24px,5vw,96px),calc((100vw - 1440px)/2));margin:0}.journey{padding:0}.journey-stage{width:100%;min-height:100dvh;padding-inline:max(clamp(24px,5vw,96px),calc((100vw - 1440px)/2));border-radius:0}.estimate,.ending{padding-block:clamp(70px,9vw,110px)}
@media(max-width:900px){.home-page main{padding:0}.caregivers,.progress-story,.booking,.estimate,.ending,.journey-stage{padding-inline:clamp(22px,6vw,54px)}}
@media(max-width:599px){.home-page main{padding:0}.caregivers,.progress-story,.booking,.estimate,.ending,.journey-stage{min-height:auto;padding-inline:18px}.caregivers,.progress-story,.booking,.estimate,.ending{padding-block:72px}.journey-stage{padding-block:72px}.caregivers,.story-panel{border-radius:0}}

.home-page{background:var(--scroll-bg,var(--milk))}.cta-motion{display:inline-flex;will-change:transform,opacity}.journey{min-height:auto}.ending-photo img{will-change:transform}.ending-copy{will-change:transform,opacity}
@media(max-width:1023px){.journey-step{transform:none}.cta-motion{max-width:100%}}
@media(prefers-reduced-motion:reduce){.cta-motion,.ending-copy,.ending-photo img{will-change:auto!important}}

.booking-story{width:100%;min-height:100dvh;padding:clamp(72px,9vw,120px) max(clamp(24px,5vw,96px),calc((100vw - 1440px)/2));display:grid;align-content:center;gap:clamp(56px,8vw,100px)}
.booking-story__heading{max-width:760px}.booking-story__heading h2{margin:12px 0 16px;font-size:clamp(2.4rem,5vw,4.1rem);line-height:1.15}.booking-story__heading p{margin:0;color:var(--chestnut);font-size:1.08rem}
.booking-stage{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;gap:clamp(18px,3vw,48px);min-height:280px}
.booking-stage__path{position:absolute;left:9%;right:9%;top:50%;height:5px;overflow:hidden;background:#fffdfb;border-radius:99px}.booking-path-line{display:block;width:100%;height:100%;background:var(--persimmon)}
.booking-node{position:relative;z-index:2;min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px 16px;color:var(--ink);background:var(--paper);border:1px solid #6e57501f;border-radius:28px;box-shadow:0 18px 40px #49383314;text-align:center}
.booking-node>span{position:absolute;top:16px;left:18px;color:var(--persimmon);font-size:.78rem;font-weight:700;letter-spacing:.14em}.booking-node>svg{color:var(--persimmon)}.booking-node>strong{font-size:1.05rem}
.mini-calendar{width:88px;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:10px;color:var(--ink);background:#f8e7df;border-radius:14px}.mini-calendar small{grid-column:1/-1;color:var(--persimmon);font-weight:700;letter-spacing:.12em}.mini-calendar strong{font-size:1.8rem}.mini-calendar b{font-size:.85rem}
.booking-heart{position:absolute;z-index:3;right:0;top:18%;color:var(--persimmon);fill:#fffdfb}
@media(max-width:900px){.booking-story{padding-inline:clamp(22px,6vw,54px)}.booking-stage{grid-template-columns:repeat(2,minmax(0,1fr))}.booking-stage__path{display:none}.booking-heart{right:3%;top:47%}}
@media(max-width:599px){.booking-story{min-height:auto;padding:72px 18px}.booking-stage{grid-template-columns:1fr;gap:22px;padding-left:26px}.booking-stage__path{display:block;left:9px;right:auto;top:8%;width:5px;height:84%;background:var(--persimmon)}.booking-path-line{display:none}.booking-node{min-height:150px}.booking-heart{right:4%;top:auto;bottom:-12px}}
@media(prefers-reduced-motion:reduce){.booking-path-line,.booking-node,.booking-heart{transform:none!important;will-change:auto!important}}
</style>
