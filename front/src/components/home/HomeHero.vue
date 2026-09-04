<template>
  <section ref="root" class="home-hero" aria-labelledby="hero-title">
    <div class="hero-background" aria-hidden="true">
      <div class="hero-atmosphere"></div>
      <div class="hero-light"></div>
      <div class="hero-texture"></div>
    </div>

    <div class="hero-copy" data-hero-copy>
      <span class="hero-eyebrow">照顧，不必一個人扛</span>
      <h1 id="hero-title"><span>讓照顧，</span><em>有人一起分擔。</em></h1>
      <p>找到合適的居服員，<br>從預約開始，多一份安心。</p>
      <div class="hero-actions">
        <router-link class="hero-primary" to="/caregivers">
          找居服員 <span aria-hidden="true">→</span>
        </router-link>
        <button class="hero-secondary" type="button" @click="emit('journey')">
          第一次使用？看看怎麼預約
        </button>
      </div>
    </div>

    <div class="hero-world" aria-hidden="true" data-hero-world>
      <img
        class="hero-world__image"
        src="/images/home/hero-world-master.png"
        alt=""
        width="1672"
        height="941"
        fetchpriority="high"
      >
    </div>

    <button class="hero-scroll-cue" type="button" @click="emit('journey')">
      往下看看 <span aria-hidden="true">↓</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { gsap } from '@/composables/useGsap';

const emit = defineEmits<{ journey: [] }>();
const root = ref<HTMLElement>();
let context: gsap.Context | undefined;
let started = false;

function startEntrance() {
  if (started || !root.value) return;
  started = true;
  const rootEl = root.value;
  context = gsap.context(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: reduce)', () => gsap.set('[data-hero-copy] > *, [data-hero-world]', { clearProps: 'all' }));
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline()
        .from('.hero-eyebrow', { y: 16, autoAlpha: 0, duration: .45 })
        .from('.hero-copy h1', { y: 42, autoAlpha: 0, duration: .8, ease: 'power3.out' }, '-=.18')
        .from('.hero-copy p', { y: 22, autoAlpha: 0, duration: .6, ease: 'power3.out' }, '-=.38')
        .from('.hero-actions', { y: 18, autoAlpha: 0, duration: .55, ease: 'power3.out' }, '-=.3')
        .from('[data-hero-world]', { x: 30, scale: .98, autoAlpha: 0, duration: 1, ease: 'power3.out' }, '-=.55')
        .to('.hero-world__image', { scale: 1.02, duration: 24, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('[data-hero-world]', {
        yPercent: 3,
        ease: 'none',
        scrollTrigger: { trigger: rootEl, start: 'top top', end: 'bottom top', scrub: .8 },
      });
    });
    return () => media.revert();
  }, rootEl);
}

defineExpose({ startEntrance });
onBeforeUnmount(() => context?.revert());
</script>

<style scoped>
.home-hero{position:relative;isolation:isolate;min-height:calc(100dvh - 76px);display:grid;grid-template-columns:minmax(22rem,.8fr) 1.2fr;align-items:center;gap:clamp(2rem,5vw,7rem);overflow:hidden;padding:clamp(4rem,8vh,7rem) max(clamp(1.5rem,5vw,6rem),calc((100vw - 1440px)/2));color:var(--ink)}
.hero-background,.hero-atmosphere,.hero-light,.hero-texture{position:absolute;inset:0;pointer-events:none}.hero-background{z-index:-2;background:#fff8ef}.hero-atmosphere{inset:-10%;background:radial-gradient(circle at 18% 72%,#b8cba84d,transparent 35%);filter:blur(30px);animation:atmosphere-drift 24s ease-in-out infinite alternate}.hero-light{background:linear-gradient(118deg,transparent 48%,#fffdfb4d 58%,transparent 72%);animation:sunlight-drift 28s ease-in-out infinite alternate}.hero-texture{opacity:.1;background-image:radial-gradient(#6e575052 .65px,transparent .8px);background-size:7px 7px;mix-blend-mode:multiply}
.hero-copy{position:relative;z-index:2;max-width:46rem}.hero-eyebrow{display:block;margin-bottom:1rem;color:var(--persimmon);font-size:.88rem;font-weight:700;letter-spacing:.14em}.hero-copy h1{margin:0;font-size:clamp(3.6rem,5.4vw,6.4rem);font-weight:700;line-height:.98;letter-spacing:-.035em}.hero-copy h1 span,.hero-copy h1 em{display:block;white-space:nowrap}.hero-copy h1 em{color:var(--persimmon);font-style:normal}.hero-copy p{margin:clamp(1.5rem,3vw,2.5rem) 0 0;color:var(--chestnut);font-size:clamp(1.05rem,1.5vw,1.3rem);line-height:1.75}.hero-actions{display:flex;align-items:center;gap:1.25rem;margin-top:2rem}.hero-primary{min-height:54px;display:inline-flex;align-items:center;justify-content:center;gap:.6rem;padding:0 1.5rem;color:#fff;background:var(--persimmon);border-radius:15px;box-shadow:0 10px 24px #b84f1633;font-size:1.05rem;font-weight:700;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}.hero-primary span{transition:transform .2s ease}.hero-primary:hover{transform:translateY(-2px);box-shadow:0 14px 30px #b84f1642}.hero-primary:hover span{transform:translateX(4px)}.hero-primary:active{transform:scale(.97)}.hero-secondary{min-height:48px;padding:.5rem 0;color:var(--chestnut);background:transparent;border:0;border-bottom:1px solid #6e575059;font:inherit;font-weight:700;cursor:pointer}.hero-primary:focus-visible,.hero-secondary:focus-visible,.hero-scroll-cue:focus-visible{outline:3px solid #b84f16;outline-offset:4px}
.hero-world{position:absolute;z-index:-1;inset:0;overflow:hidden;transform-origin:center}.hero-world::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#fff8effa 0%,#fff8efcf 28%,transparent 50%)}.hero-world__image{width:100%;height:100%;display:block;object-fit:cover;object-position:center center;transform-origin:70% 50%;will-change:transform}.hero-scroll-cue{position:absolute;left:50%;bottom:1rem;min-height:48px;display:flex;align-items:center;gap:.55rem;padding:0 .75rem;color:var(--chestnut);background:transparent;border:0;font:inherit;font-size:.9rem;cursor:pointer;transform:translateX(-50%)}.hero-scroll-cue span{animation:scroll-cue 2.8s ease-in-out infinite}
@keyframes atmosphere-drift{to{transform:translate(4%,-3%) scale(1.05)}}@keyframes sunlight-drift{to{transform:translateX(5%) scale(1.03)}}@keyframes scroll-cue{50%{transform:translateY(3px)}}
@media(max-width:1200px){.hero-world__image{object-position:58% center}}
@media(max-width:900px){.home-hero{grid-template-columns:1fr;align-content:start;gap:2rem;padding-top:clamp(3rem,8vh,5rem)}.hero-copy{max-width:35rem}.hero-copy h1{font-size:clamp(3.2rem,8vw,4.8rem)}.hero-world__image{object-position:62% center}.hero-scroll-cue{display:none}}
@media(max-width:599px){.home-hero{min-height:auto;padding:3.5rem 1.125rem 0;background:#fff8ef}.hero-copy h1{font-size:clamp(2.75rem,12vw,4rem);line-height:1}.hero-copy p br{display:none}.hero-actions{align-items:stretch;flex-direction:column}.hero-primary{width:100%}.hero-secondary{align-self:flex-start;text-align:left}.hero-world{position:relative;z-index:0;inset:auto;width:calc(100% + 2.25rem);height:min(128vw,34rem);margin:2rem -1.125rem 0}.hero-world::after{background:linear-gradient(180deg,#fff8ef 0%,transparent 18%)}.hero-world__image{object-position:68% center}.hero-background{display:none}}
@media(prefers-reduced-motion:reduce){.hero-atmosphere,.hero-light,.hero-scroll-cue span{animation:none}.hero-primary,.hero-primary span{transition:none}}
</style>
