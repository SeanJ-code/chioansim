<template>
  <article :id="`care-scene-${scene.id}`" class="care-scene" :class="`care-scene--${scene.layout}`" :data-scene="scene.id" :aria-labelledby="`care-scene-title-${scene.id}`">
    <div class="care-scene__media">
      <picture class="care-scene__picture">
        <source v-if="scene.mobileImage" media="(max-width:599px)" :srcset="scene.mobileImage">
        <img class="care-scene__image" :src="scene.image" :alt="scene.alt"
          :style="{
            '--desktop-position': scene.desktopObjectPosition ?? scene.objectPosition ?? 'center',
            '--mobile-position': scene.mobileObjectPosition ?? scene.objectPosition ?? 'center'
          }"
          :loading="['02', '03'].includes(scene.id) ? 'eager' : 'lazy'" width="1672" height="941" decoding="async">
      </picture>
      <div class="care-scene__overlay"></div>
    </div>
    <div class="care-scene__copy"><div class="care-scene__meta"><span class="care-scene__number">{{ scene.id }}</span><span> {{ scene.label }}</span></div><h2 :id="`care-scene-title-${scene.id}`"><template v-if="scene.id === '01'">今天的陪伴，<br>從家門口開始。</template><template v-else>{{ scene.title }}</template></h2><p>{{ scene.description }}</p>
      <div v-if="scene.id === '01'" class="scene01-service-grid" aria-label="照安心服務特色">
        <div class="scene01-service-item"><BadgeCheck :size="24" aria-hidden="true" /><div><strong>照護資格</strong><small>專業審核，安心託付</small></div></div>
        <div class="scene01-service-item"><CalendarCheck :size="24" aria-hidden="true" /><div><strong>線上預約</strong><small>找到合適的照護夥伴</small></div></div>
        <div class="scene01-service-item"><Route :size="24" aria-hidden="true" /><div><strong>服務進度</strong><small>每一步，都心裡有底</small></div></div>
        <div class="scene01-service-item"><Calculator :size="24" aria-hidden="true" /><div><strong>費用試算</strong><small>先了解，再安心安排</small></div></div>
      </div>
      <ol v-if="scene.journey?.length" class="scene-journey" aria-label="安心預約流程"><li v-for="item in scene.journey" :key="item.number" class="scene-journey__item"><span class="scene-journey__number">{{ item.number }}</span><span class="scene-journey__label">{{ item.label }}</span></li></ol>
      <slot v-if="scene.id === '05'" name="caregiver" /><slot v-if="scene.id === '07'" name="progress" /><slot v-if="scene.id === '08'" name="ending" />
    </div>
    <HomeMobileChapters :current="Number(scene.id)" />
  </article>
</template>
<script setup lang="ts">
import HomeMobileChapters from '../HomeMobileChapters.vue';
import { BadgeCheck, Calculator, CalendarCheck, Route } from '@lucide/vue';
type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';
interface CareScene{id:string;label:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number;journey?:Array<{number:string;label:string}>}
defineProps<{scene:CareScene}>();
</script>
<style scoped>
.care-scene{position:relative;isolation:isolate;min-height:100svh;display:flex;align-items:center;overflow:hidden;background:var(--milk);color:var(--ink);scroll-margin-top:76px}
.care-scene__media{position:absolute;inset:0;z-index:-1;overflow:hidden}.care-scene__picture{display:block;width:100%;height:100%}.care-scene__image{display:block;width:100%;height:100%;object-fit:cover;object-position:var(--desktop-position)}
.care-scene__overlay{position:absolute;inset:0;background:linear-gradient(90deg,#fff9f5f5 0%,#fff9f5d9 23%,#fff9f580 38%,transparent 62%)}
.care-scene__copy{width:100%;padding:72px clamp(28px,6vw,112px)}.care-scene__copy>*{max-width:410px}.care-scene__meta{display:flex;align-items:center;gap:12px;margin-bottom:28px;color:var(--chestnut);font-size:1rem;letter-spacing:.12em}.care-scene__number{font-size:1.5rem;color:var(--persimmon)}
.care-scene[data-scene="05"]{min-height:clamp(1350px,175svh,1850px);align-items:flex-start}
.care-scene__copy>:slotted(.scene05-trust){max-width:none}
.care-scene h2{font-family:'Kaiti TC','Songti TC',serif;margin:0 0 22px;font-size:clamp(2rem,3.3vw,3.6rem);line-height:1.45;font-weight:700;text-wrap:balance;letter-spacing:.025em}.care-scene__copy>p{max-width:300px;margin:0;font-size:1.15rem;line-height:1.9}
.scene-journey{display:grid;grid-template-columns:repeat(4,max-content);align-items:end;gap:clamp(22px,2.4vw,42px);width:max-content;max-width:100%;margin:clamp(24px,3vh,36px) 0 0;padding:0;list-style:none}.scene-journey__item{position:relative;display:flex;flex-direction:column;gap:6px;min-width:58px;color:#493833}.scene-journey__number{color:#c85618;font-size:.72rem;font-weight:700;line-height:1;letter-spacing:.08em;opacity:.9}.scene-journey__label{color:#493833;font-size:clamp(.86rem,.82vw,.98rem);font-weight:700;line-height:1.35;white-space:nowrap}.scene-journey__item:not(:last-child)::after{content:'';position:absolute;top:5px;left:calc(100% + 8px);width:clamp(8px,1.2vw,22px);height:1px;background:rgba(200,86,24,.32)}
.scene01-service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:min(560px,100%);max-width:560px;margin-top:30px;border-top:1px solid rgba(73,56,51,.18);border-bottom:1px solid rgba(73,56,51,.18)}
.scene01-service-item{min-height:82px;display:flex;align-items:center;gap:14px;padding:17px 18px;color:var(--ink);border-bottom:1px solid rgba(73,56,51,.18)}
.scene01-service-item:nth-child(odd){border-right:1px solid rgba(73,56,51,.18)}
.scene01-service-item:nth-child(n+3){border-bottom:0}
.scene01-service-item svg{flex:0 0 auto;color:var(--persimmon);stroke-width:1.8}
.scene01-service-item strong,.scene01-service-item small{display:block}
.scene01-service-item strong{font-size:clamp(.96rem,1vw,1.08rem);font-weight:800;line-height:1.35}
.scene01-service-item small{margin-top:6px;color:var(--chestnut);font-size:clamp(.72rem,.72vw,.82rem);line-height:1.45;white-space:nowrap}
.care-scene--outdoor,.care-scene--ending{color:var(--paper);align-items:flex-end}.care-scene--outdoor .care-scene__overlay{background:linear-gradient(0deg,#243e35ed,transparent 85%)}.care-scene--ending .care-scene__overlay{background:linear-gradient(90deg,#32231be6, #32231b70 45%,transparent 75%)}.care-scene--outdoor .care-scene__meta,.care-scene--ending .care-scene__meta,.care-scene--outdoor .care-scene__number,.care-scene--ending .care-scene__number{color:var(--paper)}.care-scene--outdoor .care-scene__copy>*{max-width:560px}.care-scene--ending .care-scene__copy>*{max-width:560px}
@media(max-width:900px){.care-scene{display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;min-height:100svh}.care-scene__media{position:relative;inset:auto;z-index:0;width:100%;flex:1;min-height:50svh}.care-scene__picture{position:absolute;inset:0}.care-scene__image{object-position:var(--mobile-position)}.care-scene__overlay{background:linear-gradient(0deg,#fff9f5,transparent 28%)}.care-scene__copy{padding:28px 28px 56px}.care-scene__copy>*{max-width:560px}.care-scene h2{font-size:clamp(2rem,5vw,3rem);margin-bottom:14px}.care-scene__meta{margin-bottom:16px}.care-scene__copy>p{max-width:400px;font-size:1rem}.care-scene--outdoor{background:#293f35}.care-scene--ending{background:#38291f}.care-scene--outdoor .care-scene__overlay{background:linear-gradient(0deg,#293f35,transparent 35%)}.care-scene--ending .care-scene__overlay{background:linear-gradient(0deg,#38291f,transparent 35%)}}
@media(max-width:599px){.care-scene__media{flex:none;min-height:0;height:66vw}.care-scene{justify-content:flex-start;min-height:auto;padding-top:24px}.care-scene__image{object-position:center}.care-scene__copy{padding:20px 24px 48px}}
@media(prefers-reduced-motion:reduce){.care-scene__image{transform:none!important}}
@media(max-width:599px){
  .care-scene[data-scene="01"]{display:none}
  .care-scene{display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;min-height:calc(100svh - 68px);padding:24px 20px calc(12px + env(safe-area-inset-bottom));color:var(--ink);background:var(--milk);scroll-margin-top:68px}
  .care-scene__copy{display:contents}
  .care-scene__copy>*{max-width:none}
  .care-scene__meta{order:0;margin:0 0 4px;letter-spacing:0}
  .care-scene__meta>span:last-child{display:none}
  .care-scene__number,.care-scene--outdoor .care-scene__number,.care-scene--ending .care-scene__number{color:var(--ink);font-size:22px}
  .care-scene h2{order:1;font-size:clamp(27px,7.6vw,34px);line-height:1.4;margin:0 0 12px;text-wrap:initial}
  .care-scene__copy>p{order:2;max-width:22em;margin:0 0 20px;font-size:16px;line-height:1.7;color:var(--chestnut)}
  .care-scene__media{order:3;flex:none;position:relative;width:100%;height:auto;min-height:0;aspect-ratio:4/3;border-radius:12px;overflow:hidden}
  .care-scene__picture{position:static}
  .care-scene__image{object-position:var(--mobile-position);transform:none!important}
  .care-scene__overlay{display:none}
  .care-scene[data-scene="05"]{min-height:auto;overflow:visible}
  .care-scene__copy>:slotted(.scene05-trust){order:4}
  .scene-journey{order:4;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px;width:100%;margin:18px 0 8px}
  .scene-journey__item{min-width:0}
  .scene-journey__item::after{display:none}
  .scene-journey__number{font-size:.68rem}
  .scene-journey__label{font-size:.88rem}
  .mobile-chapters{order:6;width:100%}
}
</style>
