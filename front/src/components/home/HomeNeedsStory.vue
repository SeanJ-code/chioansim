<template>
  <section id="needs" ref="root" class="needs-story" data-panel="right" aria-labelledby="needs-title" tabindex="0" @keydown.left.prevent="changeScene(-1)" @keydown.right.prevent="changeScene(1)">
    <div class="needs-story__wash" aria-hidden="true"></div>
    <div class="needs-copy">
      <p class="needs-kicker">生活裡的大小事，<br>都有人一起。</p>
      <h2 id="needs-title">今天，<br>需要哪一種<span>幫忙</span>？</h2>
      <p class="needs-intro">照顧不只是一件事，<br>而是生活裡的每一個日常。<br>無論是備餐、陪伴、家務，<br>還是外出，我們都在。</p>
      <div class="needs-controls">
        <p class="needs-count" aria-live="polite"><span ref="activeLabel">{{ slides[activeIndex]?.id }}</span><i aria-hidden="true"></i><span class="needs-count__total">04</span></p>
        <div class="needs-buttons">
          <button type="button" aria-label="上一個照護場景" :disabled="locked || activeIndex === 0" @click="changeScene(-1)"><span aria-hidden="true">←</span></button>
          <button type="button" aria-label="下一個照護場景" :disabled="locked || activeIndex === slides.length - 1" @click="changeScene(1)"><span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>
    <div class="needs-scenes" :class="`is-active-${activeIndex + 1}`" aria-label="照護生活場景" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointercancel="pointerStart = null">
      <article v-for="(slide,index) in slides" :key="slide.id" :ref="el => setSceneRef(el,index)" class="needs-scene" :class="sceneClass(index)" :aria-current="index === activeIndex ? 'true' : undefined" :aria-label="`${slide.id} ${slide.title}`" role="button" tabindex="0" @click="activateScene(index)" @keydown.enter.prevent="activateScene(index)" @keydown.space.prevent="activateScene(index)">
        <div class="needs-scene__asset">
          <img :src="slide.image" :alt="`${slide.title}照護場景`" class="needs-scene__image" decoding="async" @error="hideFailedImage">
          <i v-for="ambient in slide.ambient" :key="ambient" :data-ambient="ambient" aria-hidden="true"></i>
        </div>
        <div class="needs-scene__caption"><b>{{ slide.id }}</b><h3>{{ slide.title }}</h3><p v-for="line in slide.description" :key="line">{{ line }}</p></div>
      </article>
      <div class="needs-dots" aria-label="選擇照護場景">
        <button v-for="(slide,index) in slides" :key="slide.id" type="button" :class="{ 'is-active': index === activeIndex }" :aria-label="`切換至 ${slide.title}`" :aria-current="index === activeIndex ? 'true' : undefined" :disabled="locked" @click.stop="activateScene(index)"></button>
      </div>
    </div>
    <p class="needs-swipe-hint">左右滑動，看看更多日常照顧的場景</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount,onMounted,ref,type ComponentPublicInstance } from 'vue';
import { gsap } from '@/composables/useGsap';
import mealImage from '@/assets/home-world/needs/meal.webp';
import companionshipImage from '@/assets/home-world/needs/companionship.webp';
import houseworkImage from '@/assets/home-world/needs/housework.webp';
import outingImage from '@/assets/home-world/needs/outing.webp';

const slides = [
  { id:'01',title:'備餐',description:['用一餐溫熱的飯菜，','照顧每天的營養與健康。'],image:mealImage,ambient:['steam'] },
  { id:'02',title:'生活陪伴',description:['聊聊天、喝杯茶，','讓日子多一點笑聲。'],image:companionshipImage,ambient:['cat','steam'] },
  { id:'03',title:'簡單家務',description:['整理家裡的整潔，','也讓生活更輕鬆舒適。'],image:houseworkImage,ambient:['cloth','plant'] },
  { id:'04',title:'陪同外出',description:['一起走出家門，','去曬曬太陽，看看更大的世界。'],image:outingImage,ambient:['sunlight','bag'] },
];
const root=ref<HTMLElement>(),activeLabel=ref<HTMLElement>(),activeIndex=ref(0),locked=ref(false);
const sceneElements:HTMLElement[]=[];
let context:gsap.Context|undefined,media:gsap.MatchMedia|undefined,pointerStart:number|null=null;

function setSceneRef(el:Element|ComponentPublicInstance|null,index:number){if(el instanceof HTMLElement){sceneElements[index]=el;el.dataset.index=String(index)}}
function sceneClass(index:number){const offset=index-activeIndex.value;return {'is-active':offset===0,'is-next':offset===1,'is-previous':offset===-1,'is-before':offset<0,'is-after':offset>0,[`is-distance-${Math.abs(offset)}`]:offset!==0}}
function hideFailedImage(event:Event){(event.currentTarget as HTMLImageElement).hidden=true}
function activateScene(index:number){
  if(locked.value||index===activeIndex.value||index<0||index>=slides.length)return;
  const oldScene=sceneElements[activeIndex.value],newScene=sceneElements[index];
  const oldImage=oldScene?.querySelector<HTMLElement>('.needs-scene__image');
  const newImage=newScene?.querySelector<HTMLElement>('.needs-scene__image');
  const oldCaption=oldScene?.querySelector<HTMLElement>('.needs-scene__caption');
  const newCaption=sceneElements[index]?.querySelector<HTMLElement>('.needs-scene__caption');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const direction=index>activeIndex.value?1:-1;
  const targets=[oldImage,newImage,oldCaption,newCaption,activeLabel.value].filter(Boolean);
  locked.value=true;gsap.killTweensOf(targets);
  const timeline=gsap.timeline({defaults:{ease:'care-soft'},onComplete:()=>{gsap.set(targets,{clearProps:'all'});locked.value=false}});
  if(reduced){
    if(oldImage)timeline.to(oldImage,{opacity:.65,duration:.2},0);
    timeline.call(()=>{activeIndex.value=index},undefined,.18);
    if(newImage)timeline.fromTo(newImage,{opacity:.65},{opacity:1,duration:.3},.18);
    return;
  }
  if(oldImage)timeline.to(oldImage,{scale:.985,x:-8*direction,filter:'brightness(.97)',duration:.36},0);
  if(oldCaption)timeline.to(oldCaption,{y:-5,opacity:.48,duration:.36},0);
  timeline.call(()=>{activeIndex.value=index},undefined,.3);
  if(newImage)timeline.fromTo(newImage,{scale:1.015,x:10*direction,filter:'brightness(1)'},{scale:1,x:0,filter:'brightness(1)',duration:.78},.3);
  if(newCaption)timeline.fromTo(newCaption,{y:6,opacity:.5},{y:0,opacity:1,duration:.62},.3);
  if(activeLabel.value)timeline.fromTo(activeLabel.value,{y:6,opacity:.3},{y:0,opacity:1,duration:.5},.3);
}
function changeScene(step:number){activateScene(Math.min(slides.length-1,Math.max(0,activeIndex.value+step)))}
function onPointerDown(event:PointerEvent){pointerStart=event.clientX}
function onPointerUp(event:PointerEvent){if(pointerStart===null)return;const distance=event.clientX-pointerStart;pointerStart=null;if(Math.abs(distance)>=52)changeScene(distance<0?1:-1)}
onMounted(()=>{if(!root.value)return;const rootEl=root.value;context=gsap.context(()=>{media=gsap.matchMedia();media.add('(prefers-reduced-motion: no-preference)',()=>{
  const scrollTrigger={trigger:rootEl,start:'top 75%',toggleActions:'play none none reverse'};
  gsap.from('.needs-copy > *',{y:28,autoAlpha:0,duration:.7,stagger:.1,ease:'care-soft',immediateRender:false,scrollTrigger});
  gsap.from('.needs-scene',{x:30,autoAlpha:0,duration:.72,stagger:.1,ease:'care-soft',immediateRender:false,scrollTrigger});
})},rootEl)})
onBeforeUnmount(()=>{media?.revert();context?.revert();gsap.killTweensOf(sceneElements)})
</script>

<style scoped>
.needs-story{position:relative;isolation:isolate;min-height:100dvh;display:grid;grid-template-columns:minmax(17rem,34vw) minmax(0,1fr);align-items:center;gap:clamp(2rem,3vw,4rem);overflow:hidden;padding:clamp(5rem,9vw,8rem) 0 clamp(5rem,9vw,8rem) clamp(1.5rem,5vw,6rem);color:var(--ink);background:#fff9f2;outline:none}
.needs-story__wash{position:absolute;z-index:-1;inset:0;background:radial-gradient(circle at 12% 18%,#fffdfb 0 18%,transparent 48%),linear-gradient(120deg,#fffaf4 0 30%,#f6dfd2 100%)}
.needs-copy{position:relative;z-index:10}.needs-kicker{margin:0 0 clamp(2.5rem,6vw,5rem);color:#c66a43;font-size:clamp(.95rem,1.2vw,1.1rem);line-height:1.8;letter-spacing:.12em}.needs-copy h2{margin:0;font-size:clamp(2.7rem,4.4vw,5rem);line-height:1.08;letter-spacing:-.04em}.needs-copy h2 span{color:var(--persimmon)}.needs-intro{margin:1.8rem 0 0;color:var(--chestnut);font-size:clamp(1rem,1.2vw,1.15rem);line-height:1.8}
.needs-controls{margin-top:clamp(2.5rem,5vw,4.5rem)}.needs-count{display:flex;align-items:center;gap:.65rem;margin:0 0 1rem;color:var(--persimmon);font-weight:700;font-variant-numeric:tabular-nums}.needs-count i{width:1.8rem;height:1px;background:#b84f1666}.needs-count__total{color:var(--chestnut);opacity:.65}.needs-buttons{display:flex;gap:.75rem}.needs-buttons button{width:54px;height:54px;display:grid;place-items:center;padding:0;color:var(--persimmon);background:#fffaf599;border:1px solid #b84f1673;border-radius:50%;font:inherit;font-size:1.35rem;cursor:pointer;touch-action:manipulation;transition:transform .2s ease,background .2s ease,border-color .2s ease}.needs-buttons button:hover:not(:disabled){border-color:var(--persimmon);background:#fffdfb;transform:translateY(-2px)}.needs-buttons button:first-child:hover:not(:disabled) span{transform:translateX(-4px)}.needs-buttons button:last-child:hover:not(:disabled) span{transform:translateX(4px)}.needs-buttons button:active:not(:disabled){transform:scale(.96)}.needs-buttons button:disabled{cursor:default;opacity:.35}.needs-buttons span{display:block;transition:transform .2s ease}
.needs-scenes{position:relative;min-width:0;height:min(65vw,46rem);max-height:72dvh;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;overflow:clip;padding-bottom:2.25rem;touch-action:pan-y;transition:grid-template-columns .8s cubic-bezier(.16,1,.3,1)}.needs-scenes.is-active-2{grid-template-columns:1fr 2fr 1fr 1fr}.needs-scenes.is-active-3{grid-template-columns:1fr 1fr 2fr 1fr}.needs-scenes.is-active-4{grid-template-columns:1fr 1fr 1fr 2fr}
.needs-scene{position:relative;min-width:0;height:100%;margin-left:-clamp(.55rem,1vw,1.25rem);overflow:hidden;color:inherit;background:#f1dfd2;border:0;border-radius:clamp(1.25rem,2vw,2.5rem);clip-path:polygon(5% 0,100% 2%,95% 100%,0 97%);cursor:pointer;opacity:.56;transform:scale(.985);transform-origin:center;transition:opacity .48s cubic-bezier(.16,1,.3,1),transform .48s cubic-bezier(.16,1,.3,1),filter .48s cubic-bezier(.16,1,.3,1)}.needs-scene:first-child{margin-left:0;clip-path:polygon(0 0,100% 3%,94% 100%,0 100%)}.needs-scene:nth-child(2){clip-path:polygon(6% 2%,100% 0,94% 97%,0 100%)}.needs-scene:nth-child(3){clip-path:polygon(7% 0,100% 4%,96% 100%,0 97%)}.needs-scene:nth-child(4){clip-path:polygon(5% 3%,100% 0,100% 100%,0 98%)}.needs-scene.is-active{z-index:6;opacity:1;transform:scale(1)}.needs-scene.is-distance-1{z-index:4;opacity:.6;transform:scale(.985)}.needs-scene.is-distance-2{z-index:3;opacity:.5;transform:scale(.975)}.needs-scene.is-distance-3{z-index:2;opacity:.44;transform:scale(.97)}
.needs-scene__asset{position:absolute;inset:0;overflow:hidden;background:linear-gradient(145deg,#f5e9de,#e6cfc1)}.needs-scene__image{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .45s cubic-bezier(.16,1,.3,1),filter .45s cubic-bezier(.16,1,.3,1)}
.needs-scene__caption{position:absolute;z-index:2;left:clamp(1rem,2vw,2rem);right:clamp(.8rem,1.6vw,1.5rem);bottom:clamp(1.2rem,2vw,2rem);padding-top:5rem;background:linear-gradient(transparent,#f7eee7ed 48%);transition:opacity .45s cubic-bezier(.16,1,.3,1)}.needs-scene__caption b{color:var(--persimmon);font-size:clamp(.9rem,1.2vw,1.15rem);font-weight:600}.needs-scene__caption h3{margin:.3rem 0 .5rem;font-size:clamp(1.25rem,2vw,2.5rem);line-height:1.15}.needs-scene__caption p{margin:0;color:var(--chestnut);font-size:clamp(.78rem,.9vw,1rem);line-height:1.55}.needs-scene:not(.is-active) .needs-scene__caption{opacity:.82}
.needs-dots{position:absolute;z-index:12;left:50%;bottom:.3rem;display:flex;gap:.7rem;transform:translateX(-50%)}.needs-dots button{width:12px;height:12px;padding:0;background:var(--persimmon);border:0;border-radius:50%;cursor:pointer;opacity:.28;transform:scale(.72);transition:opacity .35s ease,transform .35s ease}.needs-dots button.is-active{opacity:1;transform:scale(1)}.needs-dots button:disabled{cursor:default}.needs-swipe-hint{position:absolute;right:clamp(1.5rem,5vw,6rem);bottom:2rem;margin:0;color:var(--chestnut);font-size:.8rem;letter-spacing:.08em;opacity:.65}
.needs-scene:focus-visible,.needs-dots button:focus-visible,.needs-buttons button:focus-visible,.needs-story:focus-visible{outline:3px solid var(--persimmon);outline-offset:4px}
@media(hover:hover){.needs-scene:not(.is-active):hover{z-index:7;opacity:.76;transform:translateY(-4px) scale(1.01)}.needs-scene:not(.is-active):hover .needs-scene__image{transform:scale(1.015);filter:brightness(1.025)}.needs-scene:not(.is-active):hover .needs-scene__caption{opacity:1}.needs-scene.is-active:hover .needs-scene__image{transform:scale(1.008);filter:brightness(1.012)}}
@media(max-width:900px){.needs-story{grid-template-columns:1fr;gap:2.5rem;min-height:auto;padding:5rem 0 5rem clamp(1.5rem,5vw,3rem)}.needs-copy{display:grid;grid-template-columns:1fr 1fr;gap:1rem 3rem;padding-right:clamp(1.5rem,5vw,3rem)}.needs-kicker{grid-column:1/-1;margin-bottom:1rem}.needs-intro{margin-top:1rem}.needs-controls{grid-column:1/-1;margin-top:1rem}.needs-scenes{height:min(78vw,38rem)}.needs-swipe-hint{position:static;grid-column:1/-1;padding-right:clamp(1.5rem,5vw,3rem);text-align:center}}
@media(max-width:599px){.needs-story{display:flex;flex-direction:column;align-items:stretch;gap:1.75rem;padding:4.5rem 1.125rem}.needs-copy{display:contents}.needs-kicker{order:0;margin:0 0 .75rem}.needs-copy h2{order:1;font-size:clamp(2.65rem,13vw,4rem)}.needs-intro{order:2;margin:0}.needs-scenes,.needs-scenes.is-active-2,.needs-scenes.is-active-3,.needs-scenes.is-active-4{order:3;display:block;width:calc(100% + 1.125rem);height:min(128vw,34rem);padding-bottom:2rem}.needs-scene{position:absolute;inset:0 -1.125rem 2rem 0;margin:0;clip-path:none;border-radius:1.75rem 0 0 1.75rem;opacity:0;transform:translateX(105%) scale(.97);pointer-events:none}.needs-scene.is-active{z-index:3;opacity:1;transform:translateX(0) scale(1);pointer-events:auto}.needs-scene.is-next{z-index:2;opacity:.48;transform:translateX(92%) translateY(6px) scale(.97);pointer-events:auto}.needs-scene.is-previous,.needs-scene.is-before{transform:translateX(-105%) scale(.97)}.needs-scene:not(.is-active) .needs-scene__caption{opacity:0}.needs-controls{order:4;display:flex;align-items:center;justify-content:space-between;margin:0}.needs-count{margin:0}.needs-buttons button{width:48px;height:48px}.needs-dots{bottom:.1rem}.needs-dots button{width:14px;height:14px}.needs-swipe-hint{order:5;padding:0;text-align:left}}
@media(prefers-reduced-motion:reduce){.needs-scenes,.needs-scene,.needs-scene__image,.needs-scene__caption,.needs-dots button,.needs-buttons button,.needs-buttons span{transition:none!important}.needs-scene:hover .needs-scene__image{transform:none!important;filter:none!important}}
</style>
