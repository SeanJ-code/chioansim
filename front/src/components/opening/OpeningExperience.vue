<template>
  <div v-if="visible" ref="opening" class="opening" role="dialog" aria-label="照安心首頁開場動畫">
    <div ref="artwork" class="opening__artwork" role="img" aria-label="雙手溫柔擡住長者雙手的線稿" v-html="handsSvg"></div>
    <div ref="brand" class="opening__brand">
      <small>CHIOANSIM</small>
      <strong>照顧的路上，<span>有我們陪你一起。</span></strong>
      <p>讓需要幫助的人，找到值得信任的陪伴。</p>
    </div>
    <button class="opening__skip" type="button" @click="finish">略過</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from '@/composables/useGsap';
import handsSvg from '@/assets/opening/hands-path.svg?raw';

const emit = defineEmits<{ finished: [] }>();
const visible = ref(true), opening = ref<HTMLElement>(), artwork = ref<HTMLElement>(), brand = ref<HTMLElement>();
let timeline: gsap.core.Timeline | undefined;
const forceOpening = import.meta.env.DEV;
const staticDebug = import.meta.env.DEV && new URLSearchParams(location.search).has('opening-static');

function finish() {
  timeline?.kill();
  sessionStorage.setItem('chioansim-opening-played', 'true');
  document.documentElement.classList.remove('opening-lock');
  visible.value = false;
  emit('finished');
}

async function start() {
  if (!forceOpening && sessionStorage.getItem('chioansim-opening-played') === 'true') return finish();
  await nextTick();
  if (!opening.value || !artwork.value || !brand.value) return finish();
  document.documentElement.classList.add('opening-lock');
  const paths = [...artwork.value.querySelectorAll<SVGPathElement>('path')];
  if (!paths.length) return finish();
  if (staticDebug) {
    gsap.set([artwork.value, brand.value, paths], { autoAlpha: 1, strokeDashoffset: 0 });
    return;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set([artwork.value, brand.value, paths], { autoAlpha: 1, strokeDashoffset: 0 });
    timeline = gsap.timeline({ onComplete: finish }).to({}, { duration: .5 }).to(opening.value, { autoAlpha: 0, duration: .2 });
    return;
  }
  paths.sort((a, b) => {
    const aa = a.getBBox(), bb = b.getBBox();
    return (bb.x + bb.width / 2 - (bb.y + bb.height / 2) * .8) - (aa.x + aa.width / 2 - (aa.y + aa.height / 2) * .8);
  });
  paths.forEach(path => {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, visibility: 'visible' });
  });
  timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: finish })
    .fromTo(opening.value, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 })
    .to(paths, { strokeDashoffset: 0, duration: .22, stagger: .026, ease: 'power1.inOut' })
    .fromTo(brand.value, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.2')
    .to({}, { duration: .6 })
    .to(opening.value, { autoAlpha: 0, duration: .7 });
}

onMounted(start);
onBeforeUnmount(() => { timeline?.kill(); document.documentElement.classList.remove('opening-lock'); });
</script>

<style scoped>
.opening{position:fixed;inset:0;z-index:9999;overflow:hidden;width:100vw;height:100dvh;background:#fff9f5}.opening__artwork{position:absolute;z-index:20;left:50%;top:45%;width:min(100vw,1536px);aspect-ratio:3/2;transform:translate(-50%,-50%)}.opening__artwork :deep(svg){display:block;width:100%;height:100%;overflow:visible}.opening__artwork :deep(path){visibility:hidden}.opening__brand{position:absolute;z-index:30;left:clamp(28px,6vw,96px);bottom:clamp(28px,5vh,60px);max-width:540px;padding:18px 22px;visibility:hidden;opacity:0;color:#493833;background:rgb(255 249 245/.92);border-radius:18px;box-shadow:0 12px 36px rgb(73 56 51/.08)}.opening__brand small{display:block;margin-bottom:8px;color:#b84f16;font-size:.75rem;font-weight:700;letter-spacing:.22em}.opening__brand strong{display:block;font-size:clamp(1.8rem,3.4vw,3.1rem);line-height:1.22}.opening__brand strong span{display:block;color:#6e5750}.opening__brand p{margin:12px 0 0;color:#6e5750;font-size:clamp(.9rem,1.3vw,1.05rem);line-height:1.7}.opening__skip{position:absolute;z-index:40;top:max(18px,env(safe-area-inset-top));right:24px;min-width:56px;min-height:44px;padding:0 12px;color:#6e5750;background:rgb(255 249 245/.8);border:0;border-radius:12px;font:inherit;cursor:pointer}.opening__skip:hover{background:#fff9f5}.opening__skip:focus-visible{outline:3px solid #f3a089;outline-offset:3px}
@media(max-width:768px){.opening__artwork{top:39%;width:150vw}.opening__brand{left:20px;right:20px;bottom:24px;max-width:none;padding:16px 18px}.opening__brand strong{font-size:1.75rem}.opening__brand p{margin-top:8px}}
</style>

<style>
html.opening-lock,html.opening-lock body{overflow:hidden}
</style>
