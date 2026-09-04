<template>
  <section id="needs" ref="root" class="needs-story" data-panel="right" aria-labelledby="needs-title" tabindex="0" @keydown.left.prevent="changeScene(-1)" @keydown.right.prevent="changeScene(1)">
    <div class="needs-story__wash" aria-hidden="true"></div>
    <div class="needs-copy">
      <p class="needs-kicker">生活裡的大小事，<br>都有人一起。</p>
      <h2 id="needs-title">今天，<br>需要哪一種<span>幫忙？</span></h2>
      <p class="needs-intro">照顧不只是一件事，<br>而是生活裡的每一個日常。<br>無論是備餐、陪伴、家務，<br>還是外出，我們都在。</p>
      <div class="needs-controls">
        <p class="needs-count" aria-live="polite"><span ref="activeLabel">{{ slides[activeIndex]?.id }}</span><i aria-hidden="true"></i><span class="needs-count__total">04</span></p>
        <div class="needs-buttons">
          <button type="button" aria-label="上一個照護場景" :disabled="locked || activeIndex === 0" @click="changeScene(-1)"><span aria-hidden="true">←</span></button>
          <button type="button" aria-label="下一個照護場景" :disabled="locked || activeIndex === slides.length - 1" @click="changeScene(1)"><span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>
    <div class="needs-scenes" aria-label="照護生活場景" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointercancel="pointerStart = null" @pointerenter="hoverArtwork(true)" @pointerleave="hoverArtwork(false)">
      <article v-for="(slide,index) in slides" :key="slide.id" :ref="el => setSceneRef(el,index)" class="needs-scene" :class="{ 'is-active': index === activeIndex }" :aria-hidden="index !== activeIndex">
        <div class="needs-scene__asset">
          <img :src="slide.image" :alt="`${slide.title}照護場景`" class="needs-scene__image" decoding="async" @error="hideFailedImage">
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
function hideFailedImage(event:Event){(event.currentTarget as HTMLImageElement).hidden=true}
function activateScene(index:number){
  if(locked.value||index===activeIndex.value||index<0||index>=slides.length)return;
  const oldScene=sceneElements[activeIndex.value],newScene=sceneElements[index];
  const oldImage=oldScene?.querySelector<HTMLElement>('.needs-scene__image');
  const newImage=newScene?.querySelector<HTMLElement>('.needs-scene__image');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const direction=index>activeIndex.value?1:-1;
  const targets=[oldScene,newScene,oldImage,newImage,activeLabel.value].filter(Boolean);
  locked.value=true;gsap.killTweensOf(targets);
  const timeline=gsap.timeline({defaults:{ease:'care-soft'},onComplete:()=>{gsap.set(targets,{clearProps:'all'});locked.value=false}});
  if(newScene)gsap.set(newScene,{autoAlpha:0,pointerEvents:'none'});
  if(reduced){
    if(oldScene)timeline.to(oldScene,{autoAlpha:0,duration:.25},0);
    timeline.call(()=>{activeIndex.value=index},undefined,.12);
    if(newScene)timeline.to(newScene,{autoAlpha:1,duration:.3},.12);
    return;
  }
  if(activeLabel.value)timeline.to(activeLabel.value,{y:-8,opacity:0,duration:.35},0);
  if(oldScene)timeline.to(oldScene,{autoAlpha:0,duration:.72},0);
  if(oldImage)timeline.to(oldImage,{scale:1.012,x:-4*direction,duration:.72},0);
  if(newImage)gsap.set(newImage,{scale:1.025,x:8*direction});
  timeline.call(()=>{activeIndex.value=index},undefined,.35);
  if(newScene)timeline.to(newScene,{autoAlpha:1,duration:.9},.12);
  if(newImage)timeline.to(newImage,{scale:1,x:0,duration:.9},.12);
  if(activeLabel.value)timeline.fromTo(activeLabel.value,{y:8,opacity:0},{y:0,opacity:1,duration:.4},.36);
}
function changeScene(step:number){activateScene(Math.min(slides.length-1,Math.max(0,activeIndex.value+step)))}
function hoverArtwork(active:boolean){
  if(window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches||locked.value)return;
  const image=sceneElements[activeIndex.value]?.querySelector<HTMLElement>('.needs-scene__image');
  if(image)gsap.to(image,{scale:active?1.008:1,filter:`brightness(${active?1.018:1})`,duration:.72,ease:'care-soft',overwrite:true});
}
function onPointerDown(event:PointerEvent){pointerStart=event.clientX}
function onPointerUp(event:PointerEvent){if(pointerStart===null)return;const distance=event.clientX-pointerStart;pointerStart=null;if(Math.abs(distance)>=52)changeScene(distance<0?1:-1)}
onMounted(()=>{if(!root.value)return;const rootEl=root.value;context=gsap.context(()=>{media=gsap.matchMedia();media.add('(prefers-reduced-motion: no-preference)',()=>{
  const scrollTrigger={trigger:rootEl,start:'top 75%',toggleActions:'play none none reverse'};
  gsap.from('.needs-copy > *',{y:28,autoAlpha:0,duration:.7,stagger:.1,ease:'care-soft',immediateRender:false,scrollTrigger});
  gsap.from('.needs-scene.is-active',{x:30,autoAlpha:0,duration:.72,ease:'care-soft',immediateRender:false,scrollTrigger});
})},rootEl)})
onBeforeUnmount(()=>{media?.revert();context?.revert();gsap.killTweensOf(sceneElements)})
</script>

<style scoped>
.needs-story{position:relative;isolation:isolate;min-height:100dvh;display:grid;grid-template-columns:minmax(320px,34vw) minmax(0,1fr);align-items:center;overflow:hidden;padding:clamp(5rem,9vw,8rem) 0 clamp(5rem,9vw,8rem) clamp(1.5rem,5vw,6rem);color:var(--ink);background:#fff9f5;outline:none}
.needs-story__wash{position:absolute;z-index:-1;inset:0;background:radial-gradient(circle at 12% 18%,#fffdfb 0 18%,transparent 48%),linear-gradient(120deg,#fff9f5 0 42%,#f6dfd2 100%)}
.needs-copy{position:relative;z-index:20;padding-right:clamp(1rem,2vw,2.5rem)}.needs-kicker{margin:0 0 clamp(2.5rem,6vw,5rem);color:#c66a43;font-size:clamp(.95rem,1.2vw,1.1rem);line-height:1.8;letter-spacing:.12em}.needs-copy h2{margin:0;font-size:clamp(2.7rem,4.4vw,5rem);line-height:1.08;letter-spacing:-.04em}.needs-copy h2 span{display:inline-block;color:var(--persimmon)}.needs-intro{margin:1.8rem 0 0;color:var(--chestnut);font-size:clamp(1rem,1.2vw,1.15rem);line-height:1.8}
.needs-controls{margin-top:clamp(2.5rem,5vw,4.5rem)}.needs-count{display:flex;align-items:center;gap:.65rem;margin:0 0 1rem;color:var(--persimmon);font-weight:700;font-variant-numeric:tabular-nums}.needs-count i{width:1.8rem;height:1px;background:#b84f1666}.needs-count__total{color:var(--chestnut);opacity:.65}.needs-buttons{display:flex;gap:.75rem}.needs-buttons button{width:54px;height:54px;display:grid;place-items:center;padding:0;color:var(--persimmon);background:#fffaf599;border:1px solid #b84f1673;border-radius:50%;font:inherit;font-size:1.35rem;cursor:pointer;touch-action:manipulation;transition:transform .2s ease,background .2s ease,border-color .2s ease}.needs-buttons button:hover:not(:disabled){border-color:var(--persimmon);background:#fffdfb;transform:translateY(-2px)}.needs-buttons button:first-child:hover:not(:disabled) span{transform:translateX(-4px)}.needs-buttons button:last-child:hover:not(:disabled) span{transform:translateX(4px)}.needs-buttons button:active:not(:disabled){transform:scale(.96)}.needs-buttons button:disabled{cursor:default;opacity:.35}.needs-buttons span{display:block;transition:transform .2s ease}
.needs-scenes{position:relative;min-width:0;height:min(68vw,48rem);min-height:35rem;overflow:hidden;touch-action:pan-y}.needs-scenes::before{content:"";position:absolute;z-index:10;inset:0 auto 0 0;width:clamp(110px,18vw,300px);pointer-events:none;background:linear-gradient(90deg,#fff9f5 0%,rgba(255,249,245,.96) 12%,rgba(255,249,245,.72) 38%,rgba(255,249,245,.32) 68%,transparent 100%)}
.needs-scene{position:absolute;inset:0;overflow:hidden;color:#fffdfb;opacity:0;visibility:hidden;pointer-events:none}.needs-scene.is-active{z-index:1;opacity:1;visibility:visible;pointer-events:auto}.needs-scene::after{content:"";position:absolute;z-index:2;inset:auto 0 0;height:45%;background:linear-gradient(to top,rgba(65,43,34,.48),rgba(65,43,34,.12) 58%,transparent);pointer-events:none}
.needs-scene__asset{position:absolute;inset:0;background:#f1dfd2}.needs-scene__image{width:100%;height:100%;object-fit:cover;object-position:center;display:block;will-change:transform,filter}
.needs-scene__caption{position:absolute;z-index:12;left:clamp(2rem,7vw,7rem);bottom:clamp(3rem,6vw,6rem);max-width:320px;color:#fffdfb;text-shadow:0 2px 14px rgba(40,20,12,.18)}.needs-scene__caption b{display:block;margin-bottom:.35rem;font-size:1rem;font-weight:600;letter-spacing:.08em}.needs-scene__caption h3{margin:0 0 .75rem;font-size:clamp(2rem,3.2vw,3.5rem);line-height:1;font-weight:500}.needs-scene__caption p{margin:.15rem 0;font-size:clamp(.95rem,1.1vw,1.08rem);line-height:1.65}
.needs-dots{position:absolute;z-index:20;right:clamp(2rem,5vw,5rem);bottom:clamp(1.25rem,3vw,2.5rem);display:flex}.needs-dots button{width:44px;height:44px;display:grid;place-items:center;padding:0;background:transparent;border:0;cursor:pointer}.needs-dots button::before{content:"";width:12px;height:12px;background:#fffdfb;border-radius:50%;opacity:.4;transform:scale(.72);transition:opacity .35s ease,transform .35s ease}.needs-dots button.is-active::before{opacity:1;transform:scale(1)}.needs-dots button:disabled{cursor:default}.needs-swipe-hint{position:absolute;right:clamp(1.5rem,5vw,6rem);bottom:2rem;margin:0;color:var(--chestnut);font-size:.8rem;letter-spacing:.08em;opacity:.65}
.needs-dots button:focus-visible,.needs-buttons button:focus-visible,.needs-story:focus-visible{outline:3px solid var(--persimmon);outline-offset:4px}
@media(max-width:900px){.needs-story{grid-template-columns:1fr;gap:2.5rem;min-height:auto;padding:5rem 0 5rem clamp(1.5rem,5vw,3rem)}.needs-copy{display:grid;grid-template-columns:1fr 1fr;gap:1rem 3rem;padding-right:clamp(1.5rem,5vw,3rem)}.needs-kicker{grid-column:1/-1;margin-bottom:1rem}.needs-intro{margin-top:1rem}.needs-controls{grid-column:1/-1;margin-top:1rem}.needs-scenes{height:min(78vw,38rem);min-height:28rem}.needs-scenes::before{width:clamp(60px,12vw,110px)}.needs-swipe-hint{position:static;grid-column:1/-1;padding-right:clamp(1.5rem,5vw,3rem);text-align:center}}
@media(max-width:599px){.needs-story{display:flex;flex-direction:column;align-items:stretch;gap:1.75rem;padding:4.5rem 1.125rem}.needs-copy{display:contents}.needs-kicker{order:0;margin:0 0 .75rem}.needs-copy h2{order:1;font-size:clamp(2.65rem,13vw,4rem)}.needs-intro{order:2;margin:0}.needs-scenes{order:3;width:calc(100% + 1.125rem);height:clamp(19rem,76vw,25rem);min-height:0}.needs-scenes::before{display:none}.needs-scene{inset:0 -1.125rem 0 0;border-radius:1.5rem 0 0 1.5rem}.needs-scene__caption{left:1.5rem;right:1.5rem;bottom:4.25rem;max-width:20rem}.needs-scene__caption h3{font-size:clamp(1.8rem,9vw,2.7rem)}.needs-scene__caption p{font-size:.95rem}.needs-controls{order:4;display:flex;align-items:center;justify-content:space-between;margin:0}.needs-count{margin:0}.needs-buttons button{width:48px;height:48px}.needs-dots{right:1rem;bottom:.75rem}.needs-swipe-hint{order:5;padding:0;text-align:left}}
@media(prefers-reduced-motion:reduce){.needs-scene__image,.needs-dots button,.needs-buttons button,.needs-buttons span{transition:none!important}}
</style>
