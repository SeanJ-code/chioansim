<template>
  <section
    id="needs"
    ref="root"
    class="needs-story"
    data-panel="right"
    aria-labelledby="needs-title"
    tabindex="0"
    @keydown.left.prevent="changeScene(-1)"
    @keydown.right.prevent="changeScene(1)"
  >
    <div class="needs-story__wash" aria-hidden="true"></div>

    <div class="needs-copy">
      <p class="needs-kicker">生活裡的大小事，<br>都有人一起。</p>
      <h2 id="needs-title">今天，<br>需要哪一種<span>幫忙</span>？</h2>
      <p class="needs-intro">照顧不只是一件事，<br>而是生活裡的每一個日常。</p>

      <div class="needs-controls">
        <p class="needs-count" aria-live="polite">
          <span ref="activeLabel">{{ slides[activeIndex]?.id }}</span>
          <i aria-hidden="true"></i>
          <span class="needs-count__total">04</span>
        </p>
        <div class="needs-buttons">
          <button type="button" aria-label="上一個照護場景" :disabled="locked" @click="changeScene(-1)">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" aria-label="下一個照護場景" :disabled="locked" @click="changeScene(1)">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>

    <div
      class="needs-scenes"
      aria-label="照護生活場景"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="pointerStart = null"
    >
      <article
        v-for="(slide, index) in slides"
        :key="slide.id"
        :ref="el => setSceneRef(el, index)"
        class="needs-scene"
        :class="sceneClass(index)"
        :aria-current="index === activeIndex ? 'true' : undefined"
        :aria-hidden="index === activeIndex ? undefined : 'true'"
      >
        <div class="needs-scene__asset" role="img" :aria-label="`${slide.title}照護場景`">
          <template v-if="showAssetDebug">
            <span>[ASSET REQUIRED]</span>
            <small>{{ slide.asset }}</small>
          </template>
        </div>
        <div class="needs-scene__caption">
          <b>{{ slide.id }}</b>
          <h3>{{ slide.title }}</h3>
          <p>{{ slide.description }}</p>
        </div>
      </article>
    </div>

    <p class="needs-swipe-hint">左右滑動，看看更多日常照顧的場景</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type ComponentPublicInstance } from 'vue';
import { gsap } from '@/composables/useGsap';

const slides = [
  { id: '01', title: '備餐', description: '用一餐溫熱的飯菜，照顧每天的營養與健康。', asset: 'src/assets/home-world/needs/meal.webp' },
  { id: '02', title: '生活陪伴', description: '聊聊天、喝杯茶，讓日子多一點笑聲。', asset: 'src/assets/home-world/needs/companionship.webp' },
  { id: '03', title: '簡單家務', description: '整理家裡的整潔，也讓生活更輕鬆舒適。', asset: 'src/assets/home-world/needs/housework.webp' },
  { id: '04', title: '陪同外出', description: '一起走出家門，去曬曬太陽、看看更大的世界。', asset: 'src/assets/home-world/needs/outing.webp' },
];
const showAssetDebug = import.meta.env.DEV;

const root = ref<HTMLElement>();
const activeLabel = ref<HTMLElement>();
const activeIndex = ref(0);
const locked = ref(false);
const sceneElements: HTMLElement[] = [];
let context: gsap.Context | undefined;
let media: gsap.MatchMedia | undefined;
let pointerStart: number | null = null;

function setSceneRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el instanceof HTMLElement) sceneElements[index] = el;
}

function offsetFromActive(index: number) {
  const offset = (index - activeIndex.value + slides.length) % slides.length;
  return offset === slides.length - 1 ? -1 : offset;
}

function sceneClass(index: number) {
  const offset = offsetFromActive(index);
  return { 'is-active': offset === 0, 'is-next': offset === 1, 'is-previous': offset === -1, 'is-far': offset > 1 };
}

function changeScene(step: number) {
  if (locked.value) return;
  const fromIndex = activeIndex.value;
  const toIndex = (fromIndex + step + slides.length) % slides.length;
  const outgoing = sceneElements[fromIndex];
  const incoming = sceneElements[toIndex];
  if (!outgoing || !incoming) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  locked.value = true;
  if (reduced) {
    activeIndex.value = toIndex;
    locked.value = false;
    return;
  }

  if (activeLabel.value) gsap.killTweensOf(activeLabel.value);
  gsap.killTweensOf([outgoing, incoming]);
  const timeline = gsap.timeline({ defaults: { ease: 'care-soft' }, onComplete: () => { gsap.set([outgoing, incoming], { clearProps: 'all' }); locked.value = false; } })
    .to(outgoing, { x: step > 0 ? -48 : 48, autoAlpha: 0, scale: .985, duration: .42 }, 0)
    .call(() => { activeIndex.value = toIndex; }, undefined, .16)
    .fromTo(incoming, { x: step > 0 ? 40 : -40, autoAlpha: 0, scale: .985 }, { x: 0, autoAlpha: 1, scale: 1, duration: .62 }, .08);
  if (activeLabel.value) timeline
    .to(activeLabel.value, { y: -6, autoAlpha: .25, duration: .16 }, 0)
    .fromTo(activeLabel.value, { y: 6, autoAlpha: .25 }, { y: 0, autoAlpha: 1, duration: .42 }, .2);
}

function onPointerDown(event: PointerEvent) {
  pointerStart = event.clientX;
}

function onPointerUp(event: PointerEvent) {
  if (pointerStart === null) return;
  const distance = event.clientX - pointerStart;
  pointerStart = null;
  if (Math.abs(distance) >= 52) changeScene(distance < 0 ? 1 : -1);
}

onMounted(() => {
  if (!root.value) return;
  const rootEl = root.value;
  context = gsap.context(() => {
    media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ scrollTrigger: { trigger: rootEl, start: 'top 75%', toggleActions: 'play none none reverse' } })
        .from('.needs-copy > *', { y: 30, autoAlpha: 0, duration: .7, stagger: .1, ease: 'care-soft' })
        .from('.needs-scene', { x: 30, autoAlpha: 0, duration: .72, stagger: .1, ease: 'care-soft' }, '-=.45');
    });
  }, rootEl);
});

onBeforeUnmount(() => {
  media?.revert();
  context?.revert();
  gsap.killTweensOf(sceneElements);
});
</script>

<style scoped>
.needs-story{position:relative;isolation:isolate;min-height:100dvh;display:grid;grid-template-columns:minmax(17rem,34vw) minmax(0,1fr);align-items:center;gap:clamp(2rem,3vw,4rem);overflow:hidden;padding:clamp(5rem,9vw,8rem) 0 clamp(5rem,9vw,8rem) clamp(1.5rem,5vw,6rem);color:var(--ink);background:#fff9f2;outline:none}.needs-story__wash{position:absolute;z-index:-1;inset:0;background:radial-gradient(circle at 12% 18%,#fffdfb 0 18%,transparent 48%),linear-gradient(120deg,#fffaf4 0 30%,#f6dfd2 100%)}.needs-copy{position:relative;z-index:5}.needs-kicker{margin:0 0 clamp(2.5rem,6vw,5rem);color:#c66a43;font-size:clamp(.95rem,1.2vw,1.1rem);line-height:1.8;letter-spacing:.12em}.needs-copy h2{margin:0;font-size:clamp(2.7rem,4.4vw,5rem);line-height:1.08;letter-spacing:-.04em}.needs-copy h2 span{color:var(--persimmon)}.needs-intro{margin:1.8rem 0 0;color:var(--chestnut);font-size:clamp(1rem,1.2vw,1.15rem);line-height:1.8}.needs-controls{margin-top:clamp(2.5rem,5vw,4.5rem)}.needs-count{display:flex;align-items:center;gap:.65rem;margin:0 0 1rem;color:var(--persimmon);font-weight:700;font-variant-numeric:tabular-nums}.needs-count i{width:1.8rem;height:1px;background:#b84f1666}.needs-count__total{color:var(--chestnut);opacity:.65}.needs-buttons{display:flex;gap:.75rem}.needs-buttons button{width:54px;height:54px;display:grid;place-items:center;padding:0;color:var(--persimmon);background:#fffaf599;border:1px solid #b84f1673;border-radius:50%;font:inherit;font-size:1.35rem;cursor:pointer;touch-action:manipulation;transition:transform .2s ease,background .2s ease,border-color .2s ease}.needs-buttons button:hover{border-color:var(--persimmon);background:#fffdfb;transform:translateY(-2px)}.needs-buttons button:first-child:hover span{transform:translateX(-4px)}.needs-buttons button:last-child:hover span{transform:translateX(4px)}.needs-buttons button:active{transform:scale(.96)}.needs-buttons button:disabled{cursor:default}.needs-buttons span{display:block;transition:transform .2s ease}.needs-buttons button:focus-visible,.needs-story:focus-visible{outline:3px solid var(--persimmon);outline-offset:4px}
.needs-scenes{position:relative;min-width:0;height:min(65vw,46rem);max-height:72dvh;overflow:hidden;touch-action:pan-y}.needs-scene{position:absolute;inset:0;display:grid;overflow:hidden;border-radius:clamp(1.5rem,3vw,2.5rem);background:#f4e9df;box-shadow:0 1.5rem 4rem #6e575022;transform-origin:center;transition:opacity .45s ease,transform .65s cubic-bezier(.16,1,.3,1)}.needs-scene.is-active{z-index:3;opacity:1;transform:translateX(0) scale(1)}.needs-scene.is-next{z-index:2;opacity:.38;transform:translateX(94%) translateY(7px) scale(.97)}.needs-scene.is-previous{z-index:1;opacity:.28;transform:translateX(-94%) translateY(7px) scale(.97)}.needs-scene.is-far{z-index:0;opacity:0;transform:translateX(100%) scale(.96)}.needs-scene__asset{position:absolute;inset:0;display:grid;place-content:center;gap:.55rem;color:#876e65;background:linear-gradient(145deg,#f3e7dc,#ead8cb);text-align:center}.needs-scene__asset:has(>span)::before{content:"";position:absolute;inset:1.25rem;border:1px dashed #9f7e7066;border-radius:1.5rem}.needs-scene__asset span{font-size:.82rem;font-weight:700;letter-spacing:.12em}.needs-scene__asset small{font-size:.78rem}.needs-scene__caption{position:absolute;z-index:2;left:clamp(1.4rem,3vw,2.5rem);right:clamp(1.4rem,3vw,2.5rem);bottom:clamp(1.4rem,3vw,2.5rem);padding-top:5rem;background:linear-gradient(transparent,#f7eee7e8 48%);transition:opacity .2s ease}.needs-scene:not(.is-active) .needs-scene__caption{opacity:0}.needs-scene__caption b{color:var(--persimmon);font-size:clamp(1rem,1.5vw,1.35rem);font-weight:500}.needs-scene__caption h3{margin:.35rem 0 .55rem;font-size:clamp(1.8rem,3vw,3rem)}.needs-scene__caption p{max-width:25rem;margin:0;color:var(--chestnut);font-size:1rem;line-height:1.65}.needs-swipe-hint{position:absolute;right:max(clamp(1.5rem,5vw,6rem),calc((100vw - 1440px)/2));bottom:2rem;margin:0;color:var(--chestnut);font-size:.8rem;letter-spacing:.08em;opacity:.65}
@media(max-width:900px){.needs-story{grid-template-columns:1fr;gap:2.5rem;min-height:auto}.needs-copy{display:grid;grid-template-columns:1fr 1fr;gap:1rem 3rem}.needs-kicker{grid-column:1/-1;margin-bottom:1rem}.needs-intro{margin-top:1rem}.needs-controls{grid-column:1/-1;margin-top:1rem}.needs-scenes{height:min(78vw,38rem)}.needs-swipe-hint{position:static;grid-column:1/-1;text-align:center}}
@media(max-width:599px){.needs-story{display:flex;flex-direction:column;align-items:stretch;gap:1.75rem;padding:4.5rem 1.125rem}.needs-copy{display:contents}.needs-kicker{order:0;margin:0 0 .75rem}.needs-copy h2{order:1;font-size:clamp(2.65rem,13vw,4rem)}.needs-intro{order:2;margin:0}.needs-scenes{order:3;width:calc(100% + 1.125rem);height:min(128vw,34rem)}.needs-scene{right:-1.125rem;border-radius:1.75rem 0 0 1.75rem}.needs-scene.is-next{transform:translateX(92%) translateY(6px) scale(.97)}.needs-controls{order:4;display:flex;align-items:center;justify-content:space-between;margin:0}.needs-count{margin:0}.needs-buttons button{width:48px;height:48px}.needs-swipe-hint{order:5;text-align:left}}
@media(prefers-reduced-motion:reduce){.needs-scene,.needs-buttons button,.needs-buttons span{transition:none!important}}
</style>
