<template>
  <section ref="root" class="care-day-story" aria-label="一天的照護故事">
    <CareStoryScene v-for="scene in scenes" :key="scene.id" :scene="scene">
      <template v-if="scene.id === '05'" #caregiver>
        <section class="scene05-trust" aria-label="居服員推薦">
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
            <button class="trust-carousel__arrow trust-carousel__arrow--prev" type="button" aria-label="查看上一頁居服員" @click="previousCaregiver">
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

            <button class="trust-carousel__arrow trust-carousel__arrow--next" type="button" aria-label="查看下一頁居服員" @click="nextCaregiver">
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

      <template v-if="scene.id === '06'" #calculator>
        <aside id="subsidy" class="scene06-calculator" aria-labelledby="scene06-calculator-title">
          <header class="scene06-calculator__heading">
            <span class="scene06-calculator__icon" aria-hidden="true"><Calculator :size="22" /></span>
            <div><small>安心簡易試算</small><h3 id="scene06-calculator-title">先估這次照護費用</h3></div>
          </header>
          <CareCostCalculator compact />
          <div class="scene06-calculator__notice">
            <ShieldCheck :size="17" aria-hidden="true" />
            <p>本平台為民營居服預約服務。試算僅供參考；實際補助資格與金額依主管機關核定，本平台實際費用以預約內容為準。</p>
          </div>
        </aside>
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
  Calculator,
  HouseHeart,
  ShieldCheck,
  UserRoundCheck
} from '@lucide/vue';

import {
  gsap,
  ScrollTrigger
} from '@/composables/useGsap';

import CareStoryScene from './CareStoryScene.vue';
import CareCostCalculator from '@/components/CareCostCalculator.vue';
import type { Caregiver } from '@/stores/caregiver-store';

import scene01 from '@/assets/home-world/story/scene-01.webp';
import scene02 from '@/assets/home-world/story/scene-02.webp';
import scene03 from '@/assets/home-world/story/scene-03-new.png';

/* Scene04 使用新的環境整理圖片 */
import scene04 from '@/assets/home-world/story/scene-04-new.png';

import scene05 from '@/assets/home-world/story/scene-05.webp';
import scene06 from '@/assets/home-world/story/scene-06-new.png';
import scene07 from '@/assets/home-world/story/scene-07-new.png';
import scene08 from '@/assets/home-world/story/scene-08-new.png';type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';interface CareScene{id:string;label:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number;journey?:Array<{number:string;label:string}>}const props=defineProps<{progressSteps:Array<{label:string;icon:any}>;caregivers:Caregiver[];caregiverLoading:boolean;caregiverErrorMessage:string}>();const emit=defineEmits<{line:[];retryCaregivers:[]}>();
const scenes:CareScene[]=[{id:'01',label:'到家陪伴',title:'今天的照顧 從安心見面開始',description:'熟悉彼此 也準備開始今天的陪伴',image:scene01,alt:'居服員在玄關替長者整理衣領，虎斑貓好奇地在旁觀察',layout:'hero',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'center',mobileScale:1},{id:'02',label:'了解需要',title:'今天想從哪件事開始',description:'先說說需要 再一起安排適合的照顧',image:scene02,alt:'居服員與長者在客廳喝茶聊天，虎斑貓在沙發前陪伴',layout:'split',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'55% center',mobileScale:1,journey:[{number:'01',label:'說說需求'},{number:'02',label:'找居服員'},{number:'03',label:'選擇時間'},{number:'04',label:'安心開始'}]},{id:'03',label:'一起備餐',title:'一頓熱飯 也是一天的安心',description:'陪著準備午餐 讓熟悉的日常更輕鬆',image:scene03,alt:'居服員與長者一起在廚房準備午餐，虎斑貓靠近聞香',layout:'cinematic',objectPosition:'43% center',desktopObjectPosition:'43% center',mobileObjectPosition:'48% center',mobileScale:1},
{
   id: '04',
  label: '整理日常',
  title: '把生活空間整理得舒服一點',
  description:
    '整理床鋪 房間和衣物 讓每天住得更自在',
  image: scene04,
  alt:
    '居服員使用吸塵器整理長者房間，奶奶協助整理床鋪，虎斑貓在旁玩毛線球',
  layout: 'reverse',
  objectPosition: 'center',
  desktopObjectPosition: 'center',
  mobileObjectPosition: '52% center',
  mobileScale: 1}
  ,{id:'05',label:'飯後陪伴',title:'喝杯茶 好好聊一會',description:'有時候陪伴 就是願意坐下來聽',image:scene05,alt:'居服員與長者在客廳喝茶聊天，虎斑貓在沙發旁休息',layout:'detail',objectPosition:'38% center',desktopObjectPosition:'38% center',mobileObjectPosition:'58% center',mobileScale:1},{

  id: '06',

  label: '清爽照護',

  title: '洗去疲憊 留下舒服的日常',

  description:
    '協助洗頭 沐浴與清潔 讓長輩自在又安心',

  image: scene06,

  alt:
    '居服員溫柔協助奶奶洗頭與個人清潔，奶奶披著浴巾坐著微笑，虎斑貓在旁好奇碰觸清潔用品',

  layout: 'work',

  objectPosition: 'center',

  desktopObjectPosition: 'center',

  mobileObjectPosition: '55% center',

  mobileScale: 1

},{id:'07',label:'外出陪伴',title:'一起出門 走走看看',description:'慢慢走在熟悉的路上 有人陪著就更安心',image:scene07,alt:'居服員陪拿著手杖的長者走出家門，虎斑貓停在門檻內',layout:'outdoor',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1},{id:'08',label:'安心道別',title:'今天先到這裡 安心留在家裡',description:'服務告一段落 陪伴的安心沒有離開',image:scene08,alt:'傍晚長者在門口向準備離開的居服員揮手，虎斑貓在牆頭目送',layout:'ending',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1}];
const root=ref<HTMLElement>();let context:gsap.Context|undefined;let media:gsap.MatchMedia|undefined;
const carouselPage=ref(0);const visibleCaregivers=ref(3);
const featuredCaregivers=computed(()=>props.caregivers.slice(0,7));
const carouselPageStarts=computed(()=>{const total=featuredCaregivers.value.length;const visible=visibleCaregivers.value;if(total<=visible)return[0];if(visible===3)return total<=6?[0,Math.max(0,total-3)]:[0,3,total-3];if(visible===2)return[...new Set(Array.from({length:Math.ceil(total/2)},(_,index)=>Math.min(index*2,Math.max(0,total-2))))];return Array.from({length:total},(_,index)=>index)});
const carouselPageCount=computed(()=>carouselPageStarts.value.length);
const currentCarouselStart=computed(()=>carouselPageStarts.value[carouselPage.value]??0);
const carouselTrackStyle=computed(()=>({'--visible-count':String(visibleCaregivers.value),transform:`translate3d(-${currentCarouselStart.value*(100/visibleCaregivers.value)}%,0,0)`}));
function updateVisibleCaregivers(){visibleCaregivers.value=window.innerWidth<600?1:window.innerWidth<1000?2:3;carouselPage.value=Math.min(carouselPage.value,carouselPageCount.value-1)}
function previousCaregiver(){const count=carouselPageCount.value;if(!count)return;carouselPage.value=(carouselPage.value-1+count)%count}
function nextCaregiver(){const count=carouselPageCount.value;if(!count)return;carouselPage.value=(carouselPage.value+1)%count}
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
.scene06-calculator{position:relative;left:80px;top:180px;width:min(680px,100%);max-width:680px;justify-self:end;padding:28px 30px 24px;border:1px solid rgba(255,255,255,.52);border-radius:28px;background:linear-gradient(135deg,rgba(255,253,251,.18),rgba(255,249,245,.14) 52%,rgba(255,245,238,.6));color:var(--ink);box-shadow:inset 0 1px 0 rgba(255,255,255,.72),inset 0 -1px 0 rgba(255,255,255,.26),0 10px 26px rgba(73,56,51,.07),0 30px 70px rgba(73,56,51,.1);backdrop-filter:blur(3px) saturate(125%);-webkit-backdrop-filter:blur(24px) saturate(125%);overflow:hidden;scroll-margin-top:84px}
.scene06-calculator::before{content:'';position:absolute;inset:0;z-index:0;border-radius:inherit;background:linear-gradient(115deg,rgba(255,255,255,.18),rgba(255,255,255,.5) 38%,transparent 62%);pointer-events:none}.scene06-calculator>*{position:relative;z-index:1}
.scene06-calculator__heading{display:flex;align-items:center;gap:14px;margin-bottom:20px}.scene06-calculator__icon{display:grid;place-items:center;flex:0 0 auto;width:48px;height:48px;border:1px solid rgba(255,255,255,.54);border-radius:15px;background:rgba(255,231,220,.72);color:var(--persimmon);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}.scene06-calculator__heading small{display:block;color:var(--persimmon);font-size:.78rem;font-weight:800;letter-spacing:.04em}.scene06-calculator__heading h3{margin:4px 0 0;color:var(--ink);font-size:clamp(1.35rem,1.5vw,1.7rem);font-weight:800;line-height:1.35}.scene06-calculator__notice{display:flex;align-items:flex-start;gap:9px;margin-top:15px;padding-top:14px;border-top:1px solid rgba(110,87,80,.12);color:var(--chestnut)}.scene06-calculator__notice svg{flex:0 0 auto;margin-top:2px}.scene06-calculator__notice p{margin:0;font-size:.76rem;line-height:1.65}
@media(hover:hover) and (pointer:fine){.scene06-calculator:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.76),0 14px 34px rgba(73,56,51,.08),0 34px 76px rgba(73,56,51,.11)}}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.scene06-calculator{background:rgba(255,249,245,.88)}}
.scene05-trust{position:relative;width:min(1380px,calc(100vw - 72px));max-width:none!important;margin:0 auto;padding:0;color:var(--ink);background:transparent;border:0;border-radius:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.trust-carousel{position:relative;z-index:2;width:100%}.trust-carousel__viewport{width:100%;overflow:hidden;outline:none}.trust-carousel__viewport:focus-visible{outline:3px solid #eb9079;outline-offset:5px}.trust-carousel__track{--visible-count:3;display:flex;align-items:stretch;transition:transform .62s cubic-bezier(.22,1,.36,1);will-change:transform}
.trust-profile{position:relative;display:flex;flex:0 0 calc(100%/var(--visible-count) - 18px);min-width:0;min-height:390px;height:auto;margin-inline:9px;padding:24px 24px 20px;flex-direction:column;overflow:hidden;background:linear-gradient(135deg,rgba(255,253,251,.42),rgba(255,249,245,.26));border:1px solid rgba(255,255,255,.42);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.36),0 7px 20px rgba(73,56,51,.045);backdrop-filter:blur(12px) saturate(115%);-webkit-backdrop-filter:blur(12px) saturate(115%);transition:transform .3s ease,background .3s ease,box-shadow .3s ease}
.trust-profile__header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.trust-profile__header small{display:block;color:rgba(110,87,80,.74);font-size:.68rem;font-weight:700;letter-spacing:.13em;line-height:1.4}.trust-profile__header h4{margin:11px 0 0;color:var(--ink);font-family:'Kaiti TC','Songti TC',serif;font-size:clamp(1.65rem,1.7vw,2rem);font-weight:700;line-height:1.35;letter-spacing:.045em}.trust-profile__verified{display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:0 0 auto;min-height:28px;padding:5px 9px;border:0;border-radius:8px;background:#e6ecdf;color:#426456;font-size:.72rem;font-weight:800;line-height:1;white-space:nowrap}.trust-profile__verified svg{stroke-width:1.9}
.trust-profile__metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;margin-top:25px;padding:20px 0;border-top:1px solid rgba(110,87,80,.12);border-bottom:1px solid rgba(110,87,80,.12)}.trust-profile__metrics>div{min-width:0}.trust-profile__metrics>div+div{padding-left:22px;border-left:1px solid rgba(110,87,80,.1)}.trust-profile__metrics small{display:block;margin-bottom:8px;color:rgba(110,87,80,.72);font-size:.72rem;font-weight:700;letter-spacing:.03em}.trust-profile__metrics strong{display:block;color:var(--ink);font-size:1.04rem;font-weight:800;line-height:1.35}.trust-profile__metrics>div+div strong{color:#b96d2d}.trust-profile__metrics span{display:block;margin-top:5px;color:var(--chestnut);font-size:.72rem;line-height:1.35}
.trust-profile__areas{margin-top:21px}.trust-profile__areas small{display:block;margin-bottom:8px;color:rgba(110,87,80,.72);font-size:.72rem;font-weight:700}.trust-profile__areas p{margin:0;color:var(--ink);font-size:.88rem;font-weight:600;line-height:1.65}.trust-profile__services{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.trust-profile__services span{display:inline-flex;align-items:center;min-height:27px;padding:4px 9px;border:1px solid rgba(200,86,24,.07);border-radius:7px;background:#f8f1eb;color:#76594e;font-size:.7rem;font-weight:650;line-height:1.35}.trust-profile__intro{display:-webkit-box;overflow:hidden;margin:19px 0 0;color:var(--chestnut);font-size:.84rem;line-height:1.78;-webkit-box-orient:vertical;-webkit-line-clamp:3}
.trust-profile__link{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:42px;margin-top:auto;padding:10px 16px;border:0;border-radius:999px;background:#c66d35;color:#fffdfb;font-size:.86rem;font-weight:800;line-height:1;text-decoration:none;box-shadow:0 5px 12px rgba(151,77,34,.16);transition:background .22s ease,transform .22s ease,box-shadow .22s ease}.trust-profile__link svg,.scene05-trust__all svg{flex:0 0 auto;transition:transform .22s ease}.trust-profile__link:active{transform:translateY(0);background:#a95124;box-shadow:0 2px 7px rgba(110,65,42,.12)}
.scene05-trust__all{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:max-content;min-height:48px;margin:28px 0 0;padding:0 22px;border:0;border-radius:999px;background:rgba(200,86,24,.94);color:#fffdfb;font-size:.94rem;font-weight:800;text-decoration:none;box-shadow:0 7px 18px rgba(200,86,24,.12);transition:transform .24s ease,box-shadow .24s ease,background .24s ease}.trust-profile__link:focus-visible,.scene05-trust__all:focus-visible,.trust-carousel__arrow:focus-visible,.trust-carousel__dot:focus-visible{outline:3px solid rgba(200,86,24,.24);outline-offset:3px}
.trust-carousel__arrow{position:absolute;z-index:4;top:50%;display:grid;place-items:center;width:48px;height:48px;padding:0;border:0;border-radius:0;background:transparent;color:rgba(73,56,51,.72);box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;cursor:pointer;transform:translateY(-50%);transition:color .22s ease,transform .22s ease}.trust-carousel__arrow--prev{left:-54px}.trust-carousel__arrow--next{right:-54px}.trust-carousel__dots{display:flex;align-items:center;justify-content:center;gap:0;margin-top:28px}.trust-carousel__dot{position:relative;width:44px;height:44px;margin-inline:-13.5px;padding:0;border:0;background:transparent;cursor:pointer}.trust-carousel__dot::before{content:'';position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:999px;background:rgba(110,87,80,.2);transform:translate(-50%,-50%);transition:width .28s ease,background .28s ease}.trust-carousel__dot.is-active::before{width:24px;background:var(--persimmon)}
.scene05-trust__state{display:flex;min-height:180px;align-items:center;justify-content:center;flex-direction:column;gap:9px;padding:28px;text-align:center;background:rgba(255,253,251,.74);border:1px solid rgba(73,56,51,.1);border-radius:20px}.scene05-trust__state span{color:#6e5750}.scene05-trust__state button{min-height:44px;margin-top:10px;padding:0 18px;border:1px solid #c85618;border-radius:999px;background:transparent;color:#a94216;font:inherit;font-weight:800;cursor:pointer}
.trust-profile--skeleton{min-height:300px;background:linear-gradient(100deg,rgba(255,253,251,.7) 30%,rgba(235,144,121,.1) 50%,rgba(255,253,251,.7) 70%);background-size:300% 100%;animation:trust-loading 1.5s ease-in-out infinite}@keyframes trust-loading{to{background-position:-150% 0}}
@media(hover:hover) and (pointer:fine){.trust-profile:hover{transform:translateY(-4px);background:linear-gradient(135deg,rgba(255,253,251,.52),rgba(255,249,245,.34));box-shadow:inset 0 1px 0 rgba(255,255,255,.42),0 12px 28px rgba(73,56,51,.07)}.trust-profile__link:hover{background:#ae5728;box-shadow:0 7px 16px rgba(151,77,34,.2);transform:translateY(-1px)}.trust-profile__link:hover svg,.scene05-trust__all:hover svg{transform:translateX(3px)}.scene05-trust__all:hover{transform:translateY(-2px);background:#b84916;box-shadow:0 11px 24px rgba(200,86,24,.19)}.trust-carousel__arrow:hover{color:var(--persimmon)}}
.scene-progress{margin-top:32px;color:#fff}.scene-progress-route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}.scene-progress-route>div:not(.scene-progress-line){display:grid;place-items:center;gap:4px;font-weight:700}.scene-progress-line{position:relative;height:4px;background:rgba(255,255,255,.4)}.scene-progress-line i{position:absolute;inset:0;background:#fff;transform-origin:left}.route-dot{position:absolute;left:0;top:50%;width:16px;height:16px;background:#fff;border-radius:50%;transform:translate(-50%,-50%)}.scene-progress-steps{display:flex;justify-content:space-between;gap:12px;margin:22px 0 0;padding:0;list-style:none}.scene-progress-steps li{display:flex;align-items:center;gap:6px;color:#fff;font-size:.85rem}.scene-ending-cta{margin-top:34px}.scene-ending-eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.18em}.scene-ending-cta h3{margin:10px 0;font-size:clamp(1.8rem,3.2vw,3.4rem);line-height:1.15}.scene-ending-actions{display:flex;align-items:center;gap:14px;margin-top:26px}.scene-ending-actions a,.scene-ending-actions button{min-height:50px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 22px;border-radius:999px;color:#fff;text-decoration:none;font:inherit;font-weight:700;cursor:pointer}.scene-ending-actions a{background:#c85618;border:1px solid #c85618}.scene-ending-actions button{background:transparent;border:1px solid #fff}@media(max-width:900px){.scene-progress{margin-top:24px}.scene-progress-route svg{width:34px}.scene-progress-steps li{display:grid;place-items:center;text-align:center;font-size:.68rem}.scene-progress-steps svg{width:18px}.scene-ending-cta{margin-top:24px}.scene-ending-actions{align-items:stretch;flex-direction:column}.scene-ending-actions a,.scene-ending-actions button{width:100%}}.scene-progress-caption{font-size:.9rem;line-height:1.6}.scene-ending-cta h3{font-family:'Kaiti TC','Songti TC',serif;line-height:1.4}.scene-ending-actions{flex-wrap:wrap}.scene-ending-actions a{background:#b84916}.scene-ending-actions button{line-height:1.6;padding-block:12px}.scene-progress-steps{flex-wrap:wrap}.scene-progress-steps li{font-size:.85rem}
@media(max-width:599px){
  .scene06-calculator{order:4;width:100%;max-width:none;margin-top:22px;padding:18px 16px;border-radius:18px;background:rgba(255,253,251,.88);box-shadow:0 5px 18px rgba(73,56,51,.055);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
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
@media(min-width:1100px){.scene05-trust{left:-36px;top:72px}}
@media(min-width:600px) and (max-width:1099px){.scene05-trust{left:0;top:36px}.scene06-calculator{max-width:620px;padding:24px;border-radius:22px}.trust-carousel--loading .trust-carousel__track{--visible-count:2}}
@media(max-width:599px){.scene05-trust{left:0;top:0;width:100%;margin:26px 0 0}.trust-carousel{padding:0 4px}.trust-carousel--loading .trust-carousel__track{--visible-count:1}.trust-carousel .trust-profile{flex-basis:calc(100% - 16px);min-height:auto;padding:23px 20px 20px;border-radius:22px}.trust-profile__header h4{font-size:1.55rem}.trust-profile__metrics{margin-top:20px;padding:17px 0}.trust-profile__link{min-height:46px;margin-top:22px;font-size:.88rem}.trust-carousel__arrow{top:auto;bottom:-64px;width:44px;height:44px}.trust-carousel__arrow--prev{left:calc(50% - 78px)}.trust-carousel__arrow--next{right:calc(50% - 78px)}.scene05-trust__all{min-height:50px;margin-top:54px;padding-inline:22px}}
@media(prefers-reduced-motion:reduce){.scene06-calculator{transition:none}}
@media(prefers-reduced-motion:reduce){.trust-profile--skeleton{animation:none}.trust-carousel__track,.trust-carousel__arrow,.trust-carousel__dot::before{transition:none}}
</style>
