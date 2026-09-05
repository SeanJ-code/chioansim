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
          :loading="Number(scene.id) <= 3 ? 'eager' : 'lazy'" decoding="async">
      </picture>
      <div class="care-scene__overlay"></div>
    </div>
    <div class="care-scene__copy"><div class="care-scene__meta"><span class="care-scene__number">{{ scene.id }}</span></div><h2 :id="`care-scene-title-${scene.id}`">{{ scene.title }}</h2><p>{{ scene.description }}</p>
      <div v-if="scene.id === '02'" class="care-scene__hints" aria-label="常見照護需求"><span><CookingPot :size="20" />備餐</span><span><MessagesSquare :size="20" />陪伴</span><span><Shirt :size="20" />家務</span><span><Footprints :size="20" />外出</span></div>
      <slot v-if="scene.id === '07'" name="progress" /><slot v-if="scene.id === '08'" name="ending" />
    </div>
  </article>
</template>
<script setup lang="ts">
import { CookingPot, Footprints, MessagesSquare, Shirt } from '@lucide/vue';
type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';
interface CareScene{id:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number}
defineProps<{scene:CareScene}>();
</script>
<style scoped>
.care-scene{position:relative;width:100%;min-height:100vh;overflow:hidden;display:flex;align-items:center;color:#fffdfb}.care-scene__picture,.care-scene__media{position:absolute;inset:0;width:100%;height:100%;background:#f4e8de}.care-scene__media{overflow:hidden}.care-scene__image{width:100%;height:100%;object-fit:cover;display:block;object-position:var(--desktop-position);backface-visibility:hidden;background:#f4e8de}.care-scene__overlay{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(58,39,31,.72),rgba(58,39,31,.42) 34%,rgba(58,39,31,.08) 62%,transparent)}.care-scene__copy{position:relative;z-index:2;width:min(1440px,calc(100% - 96px));margin-inline:auto}.care-scene__copy>*{max-width:560px}.care-scene__meta{margin-bottom:18px}.care-scene__number{font-size:clamp(1.1rem,2vw,1.6rem);font-weight:700;letter-spacing:.12em}.care-scene h2{margin:0 0 16px;font-size:clamp(2.4rem,4.8vw,5rem);line-height:1.08;letter-spacing:-.04em;text-wrap:balance}.care-scene__copy>p{margin:0;color:#fffdfbe6;font-size:clamp(1.05rem,1.3vw,1.3rem);line-height:1.7}.care-scene__hints{display:flex;flex-wrap:wrap;gap:24px;margin-top:28px}.care-scene__hints span{display:flex;align-items:center;gap:6px;color:#fff;font-weight:700}.care-scene--hero .care-scene__copy,.care-scene--split .care-scene__copy,.care-scene--reverse .care-scene__copy,.care-scene--work .care-scene__copy{display:flex;flex-direction:column;align-items:flex-start}.care-scene--cinematic .care-scene__copy,.care-scene--detail .care-scene__copy{display:flex;flex-direction:column;align-items:flex-end}.care-scene--cinematic .care-scene__copy{padding-top:8vh}.care-scene--reverse .care-scene__copy{padding-top:10vh}.care-scene--detail{align-items:flex-end}.care-scene--detail .care-scene__copy{padding-bottom:10vh}.care-scene--work .care-scene__copy{padding-top:5vh}.care-scene--outdoor{align-items:flex-end}.care-scene--outdoor .care-scene__copy{padding-bottom:44px}.care-scene--cinematic .care-scene__overlay,.care-scene--detail .care-scene__overlay{background:linear-gradient(270deg,rgba(58,39,31,.70),rgba(58,39,31,.38) 34%,rgba(58,39,31,.06) 62%,transparent)}.care-scene--outdoor .care-scene__overlay{background:linear-gradient(0deg,rgba(45,32,25,.76),rgba(45,32,25,.16) 58%,transparent)}.care-scene--ending .care-scene__overlay{background:linear-gradient(90deg,rgba(45,32,25,.80),rgba(45,32,25,.50) 38%,rgba(45,32,25,.12) 68%,transparent)}
@media(max-width:900px){.care-scene{min-height:100svh;align-items:flex-end}.care-scene__copy,.care-scene--cinematic .care-scene__copy,.care-scene--detail .care-scene__copy,.care-scene--outdoor .care-scene__copy{width:calc(100% - 36px);align-items:flex-start;padding:0 0 calc(env(safe-area-inset-bottom,0px) + 72px)}.care-scene__copy>*{max-width:100%}.care-scene h2{font-size:clamp(2rem,9vw,3.4rem)}.care-scene__overlay,.care-scene--cinematic .care-scene__overlay,.care-scene--detail .care-scene__overlay,.care-scene--outdoor .care-scene__overlay,.care-scene--ending .care-scene__overlay{background:linear-gradient(0deg,rgba(45,32,25,.9),rgba(45,32,25,.46) 45%,rgba(45,32,25,.04) 78%)}.care-scene__hints{gap:14px 20px}.care-scene--outdoor .care-scene__copy{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 120px)}}@media(max-width:599px){.care-scene__image{object-position:var(--mobile-position)}}@media(prefers-reduced-motion:reduce){.care-scene__image{transform:none!important}}
</style>
