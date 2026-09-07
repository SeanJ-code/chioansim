<template>
  <section ref="root" class="care-day-story" aria-label="一天的照護故事">
    <CareStoryScene v-for="scene in scenes" :key="scene.id" :scene="scene">
      <template v-if="scene.id === '05'" #caregiver>
        <section class="scene05-trust" aria-labelledby="scene05-trust-title">
          <header class="scene05-trust__intro">
            <p class="scene05-trust__eyebrow">適合的照護夥伴</p>
            <h3 id="scene05-trust-title">這樣的陪伴，<br>來自值得信任的人。</h3>
            <p>不靠一張照片認識照護夥伴，<br>從經驗、服務地區與真實評價開始了解。</p>
          </header>

          <div v-if="caregiverLoading" class="scene05-trust__profiles" aria-label="正在載入居服員">
            <div v-for="n in 3" :key="n" class="trust-profile trust-profile--skeleton" aria-hidden="true"></div>
          </div>

          <div v-else-if="caregiverErrorMessage" class="scene05-trust__state" role="alert">
            <strong>暫時讀不到照護夥伴資料</strong>
            <span>稍後再試一次，故事還會繼續。</span>
            <button type="button" @click="emit('retryCaregivers')">重新整理</button>
          </div>

          <div v-else-if="caregivers.length" class="scene05-trust__profiles" aria-label="已認證居服員名單">
            <article v-for="(caregiver, index) in caregivers.slice(0, 3)" :key="caregiver._id" class="trust-profile">
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
              <router-link to="/caregivers">查看服務介紹 <ArrowRight :size="17" aria-hidden="true" /></router-link>
            </article>
          </div>

          <div v-else class="scene05-trust__state" role="status">
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
import { onBeforeUnmount, onMounted, ref } from 'vue';

import {
  ArrowRight,
  BadgeCheck,
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
import scene08 from '@/assets/home-world/story/scene-08.webp';type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';interface CareScene{id:string;label:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number;journey?:Array<{number:string;label:string}>}defineProps<{progressSteps:Array<{label:string;icon:any}>;caregivers:Caregiver[];caregiverLoading:boolean;caregiverErrorMessage:string}>();const emit=defineEmits<{line:[];retryCaregivers:[]}>();
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
function caregiverName(caregiver:Caregiver){return typeof caregiver.userId==='object'?caregiver.userId.name||'照安心夥伴':'照安心夥伴'}
function experienceLabel(caregiver:Caregiver){return caregiver.yearsExperience?`${caregiver.yearsExperience} 年`:'新進夥伴'}
function ratingLabel(caregiver:Caregiver){return caregiver.ratingCount?`★ ${(caregiver.ratingAverage||0).toFixed(1)}`:'新加入'}
onMounted(() => {
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
onBeforeUnmount(() => { media?.revert(); context?.revert(); });

</script>
<style scoped>.care-day-story{position:relative;background:#fff9f5}
.scene05-trust{--trust-width:min(1180px,calc(100vw - 64px));position:relative;isolation:isolate;width:var(--trust-width);margin:clamp(320px,45vh,500px) 0 0 calc((100% - var(--trust-width))/2);padding:110px 0 120px;color:#493833}
.scene05-trust::before{content:'';position:absolute;z-index:-1;left:50%;top:-260px;width:100vw;height:calc(100% + 260px);transform:translateX(-50%);background:linear-gradient(180deg,rgba(255,249,245,0) 0%,rgba(255,249,245,.7) 180px,#fff9f5 300px)}
.scene05-trust__intro{max-width:660px;margin-bottom:54px}.scene05-trust__eyebrow{margin:0 0 12px;color:#c85618;font-size:.82rem;font-weight:800;letter-spacing:.16em}.scene05-trust__intro h3{margin:0;font-family:'Kaiti TC','Songti TC',serif;font-size:clamp(2rem,3.5vw,3.8rem);font-weight:700;line-height:1.35;letter-spacing:.02em}.scene05-trust__intro>p:last-child{margin:18px 0 0;color:#6e5750;font-size:1rem;line-height:1.8}
.scene05-trust__profiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}
.trust-profile{display:flex;min-width:0;min-height:360px;flex-direction:column;padding:28px 4px 24px;background:rgba(255,253,251,.84);border-top:1px solid rgba(73,56,51,.18);border-bottom:1px solid rgba(73,56,51,.18)}
.trust-profile__header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.trust-profile small{display:block;color:#806b64;font-size:.72rem;font-weight:700;letter-spacing:.1em}.trust-profile h4{margin:8px 0 0;font-family:'Kaiti TC','Songti TC',serif;font-size:1.75rem;line-height:1.3}.trust-profile__verified{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;color:#315746;background:#eef8f1;font-size:.78rem;font-weight:800;white-space:nowrap}.trust-profile__metrics{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px;padding:20px 0;border-top:1px solid rgba(73,56,51,.11);border-bottom:1px solid rgba(73,56,51,.11)}.trust-profile__metrics strong,.trust-profile__metrics span{display:block}.trust-profile__metrics strong{margin-top:7px;font-size:1.12rem}.trust-profile__metrics span{margin-top:3px;color:#6e5750;font-size:.78rem}.trust-profile__areas{margin-top:20px}.trust-profile__areas p{margin:7px 0 0;line-height:1.6}.trust-profile__services{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.trust-profile__services span{padding:5px 8px;background:#f7e9e2;color:#6e5750;font-size:.75rem}.trust-profile__intro{display:-webkit-box;overflow:hidden;margin:18px 0;color:#6e5750;font-size:.9rem;line-height:1.7;-webkit-box-orient:vertical;-webkit-line-clamp:2}.trust-profile>a,.scene05-trust__all{display:inline-flex;align-items:center;gap:7px;min-height:44px;color:#a94216;font-weight:800;text-decoration:none}.trust-profile>a{align-self:flex-start;margin-top:auto}.scene05-trust__all{margin-top:34px}.trust-profile>a:focus-visible,.scene05-trust__all:focus-visible,.scene05-trust__state button:focus-visible{outline:3px solid #eb9079;outline-offset:3px}
.scene05-trust__state{display:flex;min-height:260px;align-items:center;justify-content:center;flex-direction:column;gap:9px;padding:32px;text-align:center;background:rgba(255,253,251,.72);border-block:1px solid rgba(73,56,51,.16)}.scene05-trust__state span{color:#6e5750}.scene05-trust__state button{min-height:44px;margin-top:10px;padding:0 18px;border:1px solid #c85618;background:transparent;color:#a94216;font:inherit;font-weight:800;cursor:pointer}
.trust-profile--skeleton{min-height:300px;background:linear-gradient(100deg,rgba(255,253,251,.7) 30%,rgba(235,144,121,.1) 50%,rgba(255,253,251,.7) 70%);background-size:300% 100%;animation:trust-loading 1.5s ease-in-out infinite}@keyframes trust-loading{to{background-position:-150% 0}}
.scene-progress{margin-top:32px;color:#fff}.scene-progress-route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}.scene-progress-route>div:not(.scene-progress-line){display:grid;place-items:center;gap:4px;font-weight:700}.scene-progress-line{position:relative;height:4px;background:rgba(255,255,255,.4)}.scene-progress-line i{position:absolute;inset:0;background:#fff;transform-origin:left}.route-dot{position:absolute;left:0;top:50%;width:16px;height:16px;background:#fff;border-radius:50%;transform:translate(-50%,-50%)}.scene-progress-steps{display:flex;justify-content:space-between;gap:12px;margin:22px 0 0;padding:0;list-style:none}.scene-progress-steps li{display:flex;align-items:center;gap:6px;color:#fff;font-size:.85rem}.scene-ending-cta{margin-top:34px}.scene-ending-eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.18em}.scene-ending-cta h3{margin:10px 0;font-size:clamp(1.8rem,3.2vw,3.4rem);line-height:1.15}.scene-ending-actions{display:flex;align-items:center;gap:14px;margin-top:26px}.scene-ending-actions a,.scene-ending-actions button{min-height:50px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 22px;border-radius:999px;color:#fff;text-decoration:none;font:inherit;font-weight:700;cursor:pointer}.scene-ending-actions a{background:#c85618;border:1px solid #c85618}.scene-ending-actions button{background:transparent;border:1px solid #fff}@media(max-width:900px){.scene05-trust{width:100%;margin:48px 0 0;padding:72px 0 90px}.scene05-trust::before{top:-110px;height:calc(100% + 110px)}.scene05-trust__profiles{grid-template-columns:1fr 1fr}.trust-profile:nth-child(n+3){display:none}.scene-progress{margin-top:24px}.scene-progress-route svg{width:34px}.scene-progress-steps li{display:grid;place-items:center;text-align:center;font-size:.68rem}.scene-progress-steps svg{width:18px}.scene-ending-cta{margin-top:24px}.scene-ending-actions{align-items:stretch;flex-direction:column}.scene-ending-actions a,.scene-ending-actions button{width:100%}}.scene-progress-caption{font-size:.9rem;line-height:1.6}.scene-ending-cta h3{font-family:'Kaiti TC','Songti TC',serif;line-height:1.4}.scene-ending-actions{flex-wrap:wrap}.scene-ending-actions a{background:#b84916}.scene-ending-actions button{line-height:1.6;padding-block:12px}.scene-progress-steps{flex-wrap:wrap}.scene-progress-steps li{font-size:.85rem}
@media(max-width:599px){
  .scene05-trust{width:100%;margin:28px 0 0;padding:64px 0 30px}
  .scene05-trust::before{top:-64px;height:calc(100% + 64px);background:linear-gradient(180deg,rgba(255,249,245,0),#fff9f5 64px)}
  .scene05-trust__intro{margin-bottom:28px}
  .scene05-trust__intro h3{font-size:clamp(27px,7.6vw,34px);line-height:1.45}
  .scene05-trust__intro>p:last-child{font-size:16px}
  .scene05-trust__profiles{grid-template-columns:1fr;gap:0}
  .trust-profile{min-height:340px;padding:24px 0}
  .trust-profile:nth-child(n+2){display:none}
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
@media(prefers-reduced-motion:reduce){.trust-profile--skeleton{animation:none}}
</style>
