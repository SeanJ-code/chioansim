<template>
  <section ref="root" class="care-day-story" aria-label="一天的照護故事">
    <CareStoryScene v-for="scene in scenes" :key="scene.id" :scene="scene">
      <template v-if="scene.id === '05'" #caregiver>
        <section class="scene05-trust" aria-labelledby="scene05-trust-title">
          <div v-for="variant in ['', 'scene05-monstera--secondary']" :key="variant" class="scene05-monstera" :class="variant" aria-hidden="true">
            <svg viewBox="0 0 900 900" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path class="scene05-monstera__stem" d="M448 842C457 720 463 590 450 457C440 354 414 258 370 166" />
              <path class="scene05-monstera__leaf" d="M450 460C352 448 256 398 190 321C133 254 109 168 137 104C221 91 313 119 376 177C430 227 459 301 450 460ZM451 459C526 409 579 335 597 247C611 178 599 109 570 63C486 82 416 124 376 177M443 421C374 368 314 300 270 221M437 370C366 337 300 293 243 239M455 405C510 353 550 291 570 218M458 351C501 321 540 280 572 231M404 338C368 311 337 272 318 229M491 322C518 288 540 248 552 207M417 397C388 378 362 354 341 325M476 382C501 356 522 326 537 294M452 458C385 510 337 583 317 665C300 738 310 807 338 850C424 828 493 784 531 723C567 664 576 588 552 514C526 486 493 466 452 458ZM451 458C528 456 607 482 669 531C726 576 760 640 759 697C690 729 608 730 538 698M422 499C381 558 354 622 341 690M402 546C368 594 345 646 334 701M488 486C526 538 550 597 561 660M516 503C558 542 591 589 613 642M468 524C493 558 510 596 520 637M547 537C581 566 608 600 628 638" />
            </svg>
          </div>
          <header class="scene05-trust__intro">
            <p class="scene05-trust__eyebrow">適合的照護夥伴</p>
            <h3 id="scene05-trust-title">這樣的陪伴，<br>來自值得信任的人。</h3>
            <p>不靠一張照片認識照護夥伴，<br>從經驗、服務地區與真實評價開始了解。</p>
          </header>

          <div v-if="caregiverLoading" class="trust-carousel trust-carousel--loading" aria-label="正在載入居服員">
            <div class="trust-carousel__viewport">
              <div class="trust-carousel__track">
                <div v-for="n in 3" :key="n" class="trust-profile trust-profile--skeleton" aria-hidden="true"></div>
              </div>
            </div>
          </div>

          <div v-else-if="caregiverErrorMessage" class="scene05-trust__state" role="alert">
            <strong>暫時讀不到照護夥伴資料</strong>
            <span>稍後再試一次，故事還會繼續。</span>
            <button type="button" @click="emit('retryCaregivers')">重新整理</button>
          </div>

          <div v-else-if="featuredCaregivers.length" class="trust-carousel" aria-label="已認證居服員">
            <button class="trust-carousel__arrow trust-carousel__arrow--prev" type="button" aria-label="查看上一頁居服員" :disabled="carouselPage === 0" @click="previousCaregiver">
              <ChevronLeft :size="28" aria-hidden="true" />
            </button>

            <div class="trust-carousel__viewport" tabindex="0" aria-label="居服員輪播，可使用左右方向鍵切換" @keydown.left.prevent="previousCaregiver" @keydown.right.prevent="nextCaregiver">
              <div class="trust-carousel__track" :style="carouselTrackStyle">
                <article v-for="(caregiver, index) in featuredCaregivers" :key="caregiver._id" class="trust-profile">
                  <header class="trust-profile__header">
                    <div>
                      <small>CARE PARTNER {{ String(index + 1).padStart(2, '0') }}</small>
                      <h4>{{ caregiverName(caregiver) }}</h4>
                    </div>
                    <span class="trust-profile__verified"><BadgeCheck :size="17" aria-hidden="true" />已認證</span>
                  </header>

                  <div class="trust-profile__metrics">
                    <div><small>服務經驗</small><strong>{{ experienceLabel(caregiver) }}</strong></div>
                    <div><small>服務評價</small><strong>{{ ratingLabel(caregiver) }}</strong><span v-if="caregiver.ratingCount">{{ caregiver.ratingCount }} 則</span></div>
                  </div>

                  <div class="trust-profile__areas">
                    <small>可服務地區</small>
                    <p>{{ caregiver.serviceAreas.slice(0, 3).join('・') || '服務地區洽談' }}</p>
                  </div>

                  <div v-if="caregiver.serviceTypeIds?.length" class="trust-profile__services">
                    <span v-for="service in caregiver.serviceTypeIds.slice(0, 4)" :key="service.name">{{ service.name }}</span>
                  </div>

                  <p class="trust-profile__intro">{{ caregiver.introduction || '用耐心與細心，陪伴每一次安心照護。' }}</p>
                  <router-link class="trust-profile__link" to="/caregivers">查看服務介紹 <ArrowRight :size="17" aria-hidden="true" /></router-link>
                </article>
              </div>
            </div>

            <button class="trust-carousel__arrow trust-carousel__arrow--next" type="button" aria-label="查看下一頁居服員" :disabled="carouselPage >= carouselPageCount - 1" @click="nextCaregiver">
              <ChevronRight :size="28" aria-hidden="true" />
            </button>
          </div>

          <div v-if="featuredCaregivers.length > 1 && !caregiverLoading && !caregiverErrorMessage" class="trust-carousel__dots" aria-label="居服員輪播位置">
            <button v-for="page in carouselPageCount" :key="page" type="button" class="trust-carousel__dot" :class="{ 'is-active': carouselPage === page - 1 }" :aria-current="carouselPage === page - 1 ? 'true' : undefined" :aria-label="`前往第 ${page} 頁`" @click="goToCaregiverPage(page - 1)"></button>
          </div>

          <div v-else-if="!caregiverLoading && !caregiverErrorMessage && !featuredCaregivers.length" class="scene05-trust__state" role="status">
            <strong>目前沒有可顯示的照護夥伴</strong>
            <span>名單整理好後，就會在這裡與你見面。</span>
          </div>

          <router-link class="scene05-trust__all" to="/caregivers">查看全部居服員 <ArrowRight :size="19" aria-hidden="true" /></router-link>
        </section>
      </template>

      <template v-if="scene.id === '07'" #progress>
        <div class="scene-progress" data-progress-route><p class="scene-progress-caption">服務進度示意・每一步，都讓家人安心</p><div class="scene-progress-route"><div><UserRoundCheck :size="44"/><span>居服員</span></div><div class="scene-progress-line"><i></i><span class="route-dot"></span></div><div><HouseHeart :size="46"/><span>家</span></div></div><ol class="scene-progress-steps"><li v-for="item in progressSteps" :key="item.label"><component :is="item.icon" :size="24"/><span>{{ item.label }}</span></li></ol></div>
      </template>

      <template v-if="scene.id === '08'" #ending>
        <div class="scene-ending-cta"><p class="scene-ending-eyebrow">一直都在</p><h3>照顧的路上，<br>有人陪你一起。</h3><p>照顧不孤單，我們一直都在。</p><div class="scene-ending-actions"><router-link to="/caregivers">找居服員 <ArrowRight :size="20"/></router-link><button type="button" @click="emit('line')">不熟悉網站？請 LINE 專人協助</button></div></div>
      </template>
    </CareStoryScene>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  HouseHeart,
  UserRoundCheck
} from '@lucide/vue';

import {
  gsap,
  ScrollTrigger
} from '@/composables/useGsap';

import CareStoryScene from './CareStoryScene.vue';
import type { Caregiver } from '@/stores/caregiver-store';

import scene01 from '@/assets/home-world/story/scene-01.webp';
import scene02 from '@/assets/home-world/story/scene-02.webp';
import scene03 from '@/assets/home-world/story/scene-03.webp';

/* Scene04 使用新的環境整理圖片 */
import scene04 from '@/assets/home-world/story/scene-04-new.png';

import scene05 from '@/assets/home-world/story/scene-05.webp';
import scene06 from '@/assets/home-world/story/scene-06-new.png';
import scene07 from '@/assets/home-world/story/scene-07.webp';
import scene08 from '@/assets/home-world/story/scene-08.webp';type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';interface CareScene{id:string;label:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number;journey?:Array<{number:string;label:string}>}const props=defineProps<{progressSteps:Array<{label:string;icon:any}>;caregivers:Caregiver[];caregiverLoading:boolean;caregiverErrorMessage:string}>();const emit=defineEmits<{line:[];retryCaregivers:[]}>();
const scenes:CareScene[]=[{id:'01',label:'抵達的家',title:'今天的陪伴，從家門口開始。',description:'熟悉彼此，也準備開始今天的照顧。',image:scene01,alt:'居服員在玄關替長者整理衣領，虎斑貓好奇地在旁觀察',layout:'hero',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'center',mobileScale:1},{id:'02',label:'開始陪伴',title:'今天，需要哪一種幫忙？',description:'從需要什麼開始，一步一步找到適合的陪伴。',image:scene02,alt:'居服員與長者在客廳喝茶聊天，虎斑貓霸佔沙發前最舒服的位置',layout:'split',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'55% center',mobileScale:1,journey:[{number:'01',label:'說說需求'},{number:'02',label:'找居服員'},{number:'03',label:'選擇時間'},{number:'04',label:'安心開始'}]},{id:'03',label:'準備午餐',title:'一起準備午餐。',description:'一餐熱騰騰的飯，也是每天的安心。',image:scene03,alt:'居服員與長者一起在廚房準備午餐，虎斑貓靠近聞香',layout:'cinematic',objectPosition:'43% center',desktopObjectPosition:'43% center',mobileObjectPosition:'48% center',mobileScale:1},
{
   id: '04',
  label: '整理環境',
  title: '把生活空間，整理得更舒服。',
  description:
    '整理房間、床鋪與個人衣物，讓每天的生活更清爽安心。',
  image: scene04,
  alt:
    '居服員使用吸塵器整理長者房間，奶奶協助整理床鋪，虎斑貓在旁玩毛線球',
  layout: 'reverse',
  objectPosition: 'center',
  desktopObjectPosition: 'center',
  mobileObjectPosition: '52% center',
  mobileScale: 1}
  ,{id:'05',label:'飯後時光',title:'飯後，喝杯茶聊聊天。',description:'有些照顧，只是有人願意坐下來聽。',image:scene05,alt:'居服員與長者在客廳喝茶聊天，虎斑貓在沙發旁休息',layout:'detail',objectPosition:'38% center',desktopObjectPosition:'38% center',mobileObjectPosition:'58% center',mobileScale:1},{

  id: '06',

  label: '清爽照護',

  title: '把每天的清潔，也照顧得更安心。',

  description:
    '協助洗頭、沐浴與日常清潔，讓長輩保持清爽舒適，也保有生活的尊嚴。',

  image: scene06,

  alt:
    '居服員溫柔協助奶奶洗頭與個人清潔，奶奶披著浴巾坐著微笑，虎斑貓在旁好奇碰觸清潔用品',

  layout: 'work',

  objectPosition: 'center',

  desktopObjectPosition: 'center',

  mobileObjectPosition: '55% center',

  mobileScale: 1

},{id:'07',label:'外出走走',title:'陪奶奶走出家門。',description:'外面的世界，也有人陪你一起。',image:scene07,alt:'居服員陪拿著手杖的長者走出家門，虎斑貓停在門檻內',layout:'outdoor',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1},{id:'08',label:'安心道別',title:'今天的服務結束了。',description:'照顧告一段落，安心沒有離開。',image:scene08,alt:'傍晚長者在門口向準備離開的居服員揮手，虎斑貓在牆頭目送',layout:'ending',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1}];
const root=ref<HTMLElement>();let context:gsap.Context|undefined;let media:gsap.MatchMedia|undefined;
const carouselPage=ref(0);const visibleCaregivers=ref(3);
const featuredCaregivers=computed(()=>props.caregivers.slice(0,7));
const carouselPageStarts=computed(()=>{const total=featuredCaregivers.value.length;const visible=visibleCaregivers.value;if(total<=visible)return[0];if(visible===3)return total<=6?[0,Math.max(0,total-3)]:[0,3,total-3];if(visible===2)return[...new Set(Array.from({length:Math.ceil(total/2)},(_,index)=>Math.min(index*2,Math.max(0,total-2))))];return Array.from({length:total},(_,index)=>index)});
const carouselPageCount=computed(()=>carouselPageStarts.value.length);
const currentCarouselStart=computed(()=>carouselPageStarts.value[carouselPage.value]??0);
const carouselTrackStyle=computed(()=>({'--visible-count':String(visibleCaregivers.value),transform:`translate3d(-${currentCarouselStart.value*(100/visibleCaregivers.value)}%,0,0)`}));
function updateVisibleCaregivers(){visibleCaregivers.value=window.innerWidth<600?1:window.innerWidth<1000?2:3;carouselPage.value=Math.min(carouselPage.value,carouselPageCount.value-1)}
function previousCaregiver(){carouselPage.value=Math.max(0,carouselPage.value-1)}
function nextCaregiver(){carouselPage.value=Math.min(carouselPageCount.value-1,carouselPage.value+1)}
function goToCaregiverPage(page:number){carouselPage.value=Math.max(0,Math.min(page,carouselPageCount.value-1))}
function caregiverName(caregiver:Caregiver){return typeof caregiver.userId==='object'?caregiver.userId.name||'照安心夥伴':'照安心夥伴'}
function experienceLabel(caregiver:Caregiver){return caregiver.yearsExperience?`${caregiver.yearsExperience} 年`:'新進夥伴'}
function ratingLabel(caregiver:Caregiver){return caregiver.ratingCount?`★ ${(caregiver.ratingAverage||0).toFixed(1)}`:'新加入'}
onMounted(() => {
  updateVisibleCaregivers();
  window.addEventListener('resize', updateVisibleCaregivers);
  if (!root.value) return;
  context = gsap.context(() => {
    const articles = gsap.utils.toArray<HTMLElement>('.care-scene');
    media = gsap.matchMedia();
    media.add('(min-width: 600px) and (prefers-reduced-motion: no-preference)', () => {
      articles.forEach((article, index) => {
        const image = article.querySelector<HTMLElement>('.care-scene__image');
        const copy = article.querySelector<HTMLElement>('.care-scene__copy');
        const trust = article.querySelector<HTMLElement>('.scene05-trust');
        if (!image || !copy) return;
        const entrance = { trigger: article, start: 'top 78%', once: true };
        gsap.fromTo(index === 5 ? copy.children : copy,
          { autoAlpha: 0, ...(index === 0 ? { y: 24 } : {}) },
          { autoAlpha: 1, ...(index === 0 ? { y: 0 } : {}), duration: .6, stagger: index === 5 ? .08 : 0, ease: 'power2.out', scrollTrigger: entrance });
        if (index === 0 || index === 4) {
          gsap.fromTo(image, { scale: 1.02 }, { scale: 1, duration: .8, ease: 'power2.out', scrollTrigger: entrance });
        } else if (index === 2 || index === 7) {
          gsap.fromTo(image, { scale: index === 2 ? 1.02 : 1 }, {
            scale: index === 2 ? 1 : 1.02, ease: 'none',
            scrollTrigger: { trigger: article, start: 'top 78%', end: 'bottom 20%', scrub: .8 }
          });
        }
        if (index === 4 && trust) {
          gsap.fromTo(trust, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: .85, ease: 'power2.out', scrollTrigger: { trigger: trust, start: 'top 84%', once: true } });
        }
      });
      gsap.timeline({ scrollTrigger: { trigger: '#care-scene-07', start: 'top 70%', end: 'bottom 35%', scrub: .8 } })
        .fromTo('.scene-progress-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
        .fromTo('.route-dot', { left: '0%' }, { left: '100%', ease: 'none' }, 0);
    });
    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.scene-progress-line i', { scaleX: 1 });
      gsap.set('.route-dot', { left: '100%' });
    });
  }, root.value);
  ScrollTrigger.refresh();
});
onBeforeUnmount(() => { window.removeEventListener('resize', updateVisibleCaregivers); media?.revert(); context?.revert(); });

</script>
<style scoped>.care-day-story{position:relative;background:#fff9f5}
.scene05-trust{position:relative;isolation:isolate;width:min(1320px,calc(100vw - 96px));max-width:none!important;margin:clamp(460px,58vh,620px) auto 0;padding:110px 0 120px;color:var(--ink)}
.scene05-trust::before{content:'';position:absolute;z-index:-2;left:50%;top:-220px;width:100vw;height:calc(100% + 220px);transform:translateX(-50%);background:linear-gradient(180deg,rgba(255,249,245,0) 0,rgba(255,249,245,.88) 160px,#fff9f5 220px,#fff9f5 100%)}
.scene05-monstera{position:absolute;z-index:-1;top:70px;right:-11vw;width:min(980px,68vw);pointer-events:none;overflow:visible;opacity:.16}.scene05-monstera svg{display:block;width:100%;height:auto}.scene05-monstera__leaf{fill:none;stroke:#eb9079;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.scene05-monstera__stem{fill:none;stroke:#d89a78;stroke-width:2.6;stroke-linecap:round}.scene05-monstera--secondary{top:420px;right:auto;left:-18vw;width:min(720px,52vw);opacity:.07;transform:rotate(-18deg)}
.scene05-trust__intro{position:relative;z-index:2;max-width:660px;margin-bottom:54px}.scene05-trust__eyebrow{margin:0 0 12px;color:#c85618;font-size:.82rem;font-weight:800;letter-spacing:.16em}.scene05-trust__intro h3{margin:0;font-family:'Kaiti TC','Songti TC',serif;font-size:clamp(2rem,3.5vw,3.8rem);font-weight:700;line-height:1.35;letter-spacing:.02em}.scene05-trust__intro>p:last-child{margin:18px 0 0;color:#6e5750;font-size:1rem;line-height:1.8}
.trust-carousel{position:relative;z-index:2;width:100%}.trust-carousel__viewport{width:100%;overflow:hidden;outline:none}.trust-carousel__viewport:focus-visible{outline:3px solid #eb9079;outline-offset:5px}.trust-carousel__track{--visible-count:3;display:flex;transition:transform .62s cubic-bezier(.22,1,.36,1);will-change:transform}
.trust-profile{position:relative;display:flex;flex:0 0 calc(100%/var(--visible-count));min-width:0;min-height:390px;flex-direction:column;padding:28px;background:rgba(255,253,251,.92);background-clip:padding-box;border-block:1px solid rgba(73,56,51,.12);border-inline:9px solid transparent}
.trust-profile__header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.trust-profile small{display:block;color:#806b64;font-size:.72rem;font-weight:700;letter-spacing:.1em}.trust-profile h4{margin:8px 0 0;font-family:'Kaiti TC','Songti TC',serif;font-size:1.75rem;line-height:1.3}.trust-profile__verified{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;color:#315746;background:#eef8f1;font-size:.78rem;font-weight:800;white-space:nowrap}.trust-profile__metrics{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px;padding:20px 0;border-top:1px solid rgba(73,56,51,.11);border-bottom:1px solid rgba(73,56,51,.11)}.trust-profile__metrics strong,.trust-profile__metrics span{display:block}.trust-profile__metrics strong{margin-top:7px;font-size:1.12rem}.trust-profile__metrics span{margin-top:3px;color:#6e5750;font-size:.78rem}.trust-profile__areas{margin-top:20px}.trust-profile__areas p{margin:7px 0 0;line-height:1.6}.trust-profile__services{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.trust-profile__services span{padding:5px 8px;background:#f7e9e2;color:#6e5750;font-size:.75rem}.trust-profile__intro{display:-webkit-box;overflow:hidden;margin:18px 0;color:#6e5750;font-size:.9rem;line-height:1.7;-webkit-box-orient:vertical;-webkit-line-clamp:2}.trust-profile__link,.scene05-trust__all{display:inline-flex;align-items:center;gap:7px;min-height:44px;color:#a94216;font-weight:800;text-decoration:none}.trust-profile__link{align-self:flex-start;margin-top:auto}.scene05-trust__all{width:max-content;margin:38px auto 0;padding:0 22px;border:1px solid #c85618;border-radius:999px}.trust-profile__link:focus-visible,.scene05-trust__all:focus-visible,.scene05-trust__state button:focus-visible{outline:3px solid #eb9079;outline-offset:3px}
.trust-carousel__arrow{position:absolute;z-index:4;top:50%;display:grid;place-items:center;width:52px;height:52px;padding:0;border:1px solid rgba(73,56,51,.12);border-radius:50%;background:rgba(255,253,251,.96);color:#493833;cursor:pointer;transform:translateY(-50%);transition:transform .25s ease,opacity .25s ease,background .25s ease}.trust-carousel__arrow--prev{left:-68px}.trust-carousel__arrow--next{right:-68px}.trust-carousel__arrow:disabled{opacity:.25;cursor:default}.trust-carousel__dots{display:flex;align-items:center;justify-content:center;gap:2px;margin-top:8px}.trust-carousel__dot{position:relative;width:44px;height:44px;padding:0;border:0;background:transparent;cursor:pointer}.trust-carousel__dot::before{content:'';position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:rgba(73,56,51,.18);transform:translate(-50%,-50%);transition:width .25s ease,background .25s ease}.trust-carousel__dot.is-active::before{width:24px;border-radius:999px;background:#c85618}.trust-carousel__dot:focus-visible{outline:3px solid #eb9079;outline-offset:0}
.scene05-trust__state{display:flex;min-height:260px;align-items:center;justify-content:center;flex-direction:column;gap:9px;padding:32px;text-align:center;background:rgba(255,253,251,.72);border-block:1px solid rgba(73,56,51,.16)}.scene05-trust__state span{color:#6e5750}.scene05-trust__state button{min-height:44px;margin-top:10px;padding:0 18px;border:1px solid #c85618;background:transparent;color:#a94216;font:inherit;font-weight:800;cursor:pointer}
.trust-profile--skeleton{min-height:300px;background:linear-gradient(100deg,rgba(255,253,251,.7) 30%,rgba(235,144,121,.1) 50%,rgba(255,253,251,.7) 70%);background-size:300% 100%;animation:trust-loading 1.5s ease-in-out infinite}@keyframes trust-loading{to{background-position:-150% 0}}
@media(hover:hover) and (pointer:fine){.trust-carousel__arrow:not(:disabled):hover{background:#fffdfb;transform:translateY(-50%) scale(1.06)}}
.scene-progress{margin-top:32px;color:#fff}.scene-progress-route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}.scene-progress-route>div:not(.scene-progress-line){display:grid;place-items:center;gap:4px;font-weight:700}.scene-progress-line{position:relative;height:4px;background:rgba(255,255,255,.4)}.scene-progress-line i{position:absolute;inset:0;background:#fff;transform-origin:left}.route-dot{position:absolute;left:0;top:50%;width:16px;height:16px;background:#fff;border-radius:50%;transform:translate(-50%,-50%)}.scene-progress-steps{display:flex;justify-content:space-between;gap:12px;margin:22px 0 0;padding:0;list-style:none}.scene-progress-steps li{display:flex;align-items:center;gap:6px;color:#fff;font-size:.85rem}.scene-ending-cta{margin-top:34px}.scene-ending-eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.18em}.scene-ending-cta h3{margin:10px 0;font-size:clamp(1.8rem,3.2vw,3.4rem);line-height:1.15}.scene-ending-actions{display:flex;align-items:center;gap:14px;margin-top:26px}.scene-ending-actions a,.scene-ending-actions button{min-height:50px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 22px;border-radius:999px;color:#fff;text-decoration:none;font:inherit;font-weight:700;cursor:pointer}.scene-ending-actions a{background:#c85618;border:1px solid #c85618}.scene-ending-actions button{background:transparent;border:1px solid #fff}@media(max-width:900px){.scene-progress{margin-top:24px}.scene-progress-route svg{width:34px}.scene-progress-steps li{display:grid;place-items:center;text-align:center;font-size:.68rem}.scene-progress-steps svg{width:18px}.scene-ending-cta{margin-top:24px}.scene-ending-actions{align-items:stretch;flex-direction:column}.scene-ending-actions a,.scene-ending-actions button{width:100%}}.scene-progress-caption{font-size:.9rem;line-height:1.6}.scene-ending-cta h3{font-family:'Kaiti TC','Songti TC',serif;line-height:1.4}.scene-ending-actions{flex-wrap:wrap}.scene-ending-actions a{background:#b84916}.scene-ending-actions button{line-height:1.6;padding-block:12px}.scene-progress-steps{flex-wrap:wrap}.scene-progress-steps li{font-size:.85rem}
@media(max-width:599px){
  .scene05-trust__intro{margin-bottom:28px}
  .scene05-trust__intro h3{font-size:clamp(27px,7.6vw,34px);line-height:1.45}
  .scene05-trust__intro>p:last-child{font-size:16px}
  .trust-profile{min-height:340px;padding:24px 0}
  .scene05-trust__state{min-height:220px;padding:24px 12px}
  .scene05-trust__all{width:100%;justify-content:center;margin-top:22px}
  .scene-progress{order:4;margin:0;padding:16px 12px;background:#344d40;border-radius:0 0 12px 12px;color:#fff}
  .scene-progress-caption{margin:0 0 12px;font-size:13px}
  .scene-progress-route{gap:16px}
  .scene-progress-route svg{width:24px;height:24px}
  .scene-progress-route>div:not(.scene-progress-line){font-size:12px}
  .scene-progress-line i{transform:scaleX(1)!important}
  .scene-progress-steps{flex-wrap:nowrap;gap:6px;margin-top:14px}
  .scene-progress-steps li{flex:1;min-width:0;font-size:12px;line-height:1.5}
  .scene-ending-cta{order:4;margin-top:16px;text-align:center}
  .scene-ending-eyebrow,.scene-ending-cta>p:not(.scene-ending-eyebrow){display:none}
  .scene-ending-cta h3{font-size:24px;margin:0;line-height:1.5}
  .scene-ending-actions{margin-top:14px;gap:10px}
  .scene-ending-actions a,.scene-ending-actions button{min-height:48px;padding:10px 12px;font-size:16px}
  .scene-ending-actions button{border-color:#8e786b;color:var(--ink);background:var(--paper)}
}
@media(max-width:1440px){.trust-carousel__arrow--prev{left:8px}.trust-carousel__arrow--next{right:8px}}
@media(max-width:999px){.scene05-trust{width:calc(100vw - 48px);margin:48px auto 0;padding:72px 0 90px}.scene05-trust::before{top:-110px;height:calc(100% + 110px)}.trust-carousel--loading .trust-carousel__track{--visible-count:2}.trust-carousel__arrow--prev{left:-20px}.trust-carousel__arrow--next{right:-20px}}
@media(max-width:599px){.scene05-trust{width:100%;margin:30px 0 0;padding:36px 0 20px}.scene05-trust::before{top:-64px;height:calc(100% + 64px);background:linear-gradient(180deg,rgba(255,249,245,0),#fff9f5 64px)}.scene05-monstera{top:160px;right:-180px;width:430px;opacity:.08}.scene05-monstera--secondary{display:none}.scene05-trust__intro{margin-bottom:26px}.trust-carousel{padding:0 4px}.trust-carousel--loading .trust-carousel__track{--visible-count:1}.trust-carousel .trust-profile{display:flex;flex-basis:100%;min-height:360px;padding:24px 20px;border-inline-width:4px}.trust-carousel__arrow{top:auto;bottom:-67px;width:44px;height:44px}.trust-carousel__arrow--prev{left:calc(50% - 78px)}.trust-carousel__arrow--next{right:calc(50% - 78px)}.trust-carousel__dots{margin-top:8px}.scene05-trust__all{margin-top:54px}}
@media(prefers-reduced-motion:reduce){.trust-profile--skeleton{animation:none}.trust-carousel__track,.trust-carousel__arrow,.trust-carousel__dot::before{transition:none}}
</style>
