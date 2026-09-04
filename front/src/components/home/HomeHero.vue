<template>
  <section ref="root" class="home-hero" aria-labelledby="hero-title">
    <div class="hero-background" aria-hidden="true">
      <div class="hero-atmosphere"></div>
      <div class="hero-light"></div>
      <div class="hero-texture"></div>
    </div>

    <div class="hero-copy" data-hero-copy>
      <span class="hero-eyebrow">照顧，不必一個人扛</span>
      <h1 id="hero-title">讓照顧，<br><em>有人一起分擔。</em></h1>
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
      <div class="asset-slot asset-slot--room" data-asset-slot="window-sunlight-sofa"></div>
      <div class="asset-slot asset-slot--plant" data-asset-slot="plant"></div>
      <div class="asset-slot asset-slot--grandma" data-asset-slot="grandma"></div>
      <div class="asset-slot asset-slot--caregiver" data-asset-slot="caregiver"></div>
      <div class="asset-slot asset-slot--tea" data-asset-slot="tea-steam"></div>
      <div class="asset-slot asset-slot--cat" data-asset-slot="cat-body-tail"></div>
      <div class="asset-slot asset-slot--foreground" data-asset-slot="foreground"></div>
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
  context = gsap.context(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: reduce)', () => gsap.set('[data-hero-copy] > *, [data-hero-world]', { clearProps: 'all' }));
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline()
        .from('.hero-eyebrow', { y: 16, autoAlpha: 0, duration: .45 })
        .from('.hero-copy h1', { y: 42, autoAlpha: 0, duration: .8, ease: 'power3.out' }, '-=.18')
        .from('.hero-copy p', { y: 22, autoAlpha: 0, duration: .6, ease: 'power3.out' }, '-=.38')
        .from('.hero-actions', { y: 18, autoAlpha: 0, duration: .55, ease: 'power3.out' }, '-=.3')
        .from('[data-hero-world]', { x: 30, scale: .98, autoAlpha: 0, duration: 1, ease: 'power3.out' }, '-=.55');
    });
    return () => media.revert();
  }, root.value);
}

defineExpose({ startEntrance });
onBeforeUnmount(() => context?.revert());
</script>

<style scoped>
.home-hero{position:relative;isolation:isolate;min-height:calc(100dvh - 76px);display:grid;grid-template-columns:minmax(22rem,.8fr) 1.2fr;align-items:center;gap:clamp(2rem,5vw,7rem);overflow:hidden;padding:clamp(4rem,8vh,7rem) max(clamp(1.5rem,5vw,6rem),calc((100vw - 1440px)/2));color:var(--ink)}
.hero-background,.hero-atmosphere,.hero-light,.hero-texture{position:absolute;inset:0;pointer-events:none}.hero-background{z-index:-2;background:linear-gradient(135deg,#fff9f5 0%,#f6ecdf 48%,#dfe8d8 100%)}.hero-atmosphere{inset:-10%;background:radial-gradient(circle at 78% 24%,#fff9d9b8 0 13%,transparent 34%),radial-gradient(circle at 72% 72%,#eaa48b42,transparent 38%),radial-gradient(circle at 18% 72%,#b8cba86b,transparent 35%);filter:blur(30px);animation:atmosphere-drift 24s ease-in-out infinite alternate}.hero-light{background:linear-gradient(118deg,transparent 48%,#fffdfb85 58%,transparent 72%);animation:sunlight-drift 28s ease-in-out infinite alternate}.hero-texture{opacity:.2;background-image:radial-gradient(#6e575052 .65px,transparent .8px);background-size:7px 7px;mix-blend-mode:multiply}
.hero-copy{position:relative;z-index:2;max-width:46rem}.hero-eyebrow{display:block;margin-bottom:1rem;color:var(--persimmon);font-size:.88rem;font-weight:700;letter-spacing:.14em}.hero-copy h1{margin:0;font-size:clamp(4rem,7.5vw,8.5rem);font-weight:700;line-height:.98;letter-spacing:-.055em}.hero-copy h1 em{color:var(--persimmon);font-style:normal}.hero-copy p{margin:clamp(1.5rem,3vw,2.5rem) 0 0;color:var(--chestnut);font-size:clamp(1.05rem,1.5vw,1.3rem);line-height:1.75}.hero-actions{display:flex;align-items:center;gap:1.25rem;margin-top:2rem}.hero-primary{min-height:54px;display:inline-flex;align-items:center;justify-content:center;gap:.6rem;padding:0 1.5rem;color:#fff;background:var(--persimmon);border-radius:15px;box-shadow:0 10px 24px #b84f1633;font-size:1.05rem;font-weight:700;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}.hero-primary span{transition:transform .2s ease}.hero-primary:hover{transform:translateY(-2px);box-shadow:0 14px 30px #b84f1642}.hero-primary:hover span{transform:translateX(4px)}.hero-primary:active{transform:scale(.97)}.hero-secondary{min-height:48px;padding:.5rem 0;color:var(--chestnut);background:transparent;border:0;border-bottom:1px solid #6e575059;font:inherit;font-weight:700;cursor:pointer}.hero-primary:focus-visible,.hero-secondary:focus-visible,.hero-scroll-cue:focus-visible{outline:3px solid #b84f16;outline-offset:4px}
.hero-world{position:relative;min-height:clamp(31rem,62vw,46rem)}.asset-slot{position:absolute;background:#fffdfb4d;border:1px dashed #6e57502b}.asset-slot--room{inset:8% 2% 10% 0;border-radius:44% 56% 22% 18%/28% 35% 20% 18%;background:#fffdfb3d}.asset-slot--plant{left:4%;bottom:12%;width:16%;height:38%;border-radius:50% 50% 12% 12%}.asset-slot--grandma{left:25%;bottom:13%;width:27%;height:54%;border-radius:48% 48% 24% 24%}.asset-slot--caregiver{right:15%;bottom:14%;width:25%;height:64%;border-radius:48% 48% 20% 20%}.asset-slot--tea{left:48%;bottom:17%;width:11%;height:12%;border-radius:50%}.asset-slot--cat{right:1%;bottom:11%;width:23%;height:22%;border-radius:55% 45% 42% 24%}.asset-slot--foreground{left:-3%;right:-3%;bottom:3%;height:12%;border-radius:50% 50% 0 0}.hero-scroll-cue{position:absolute;left:50%;bottom:1rem;min-height:48px;display:flex;align-items:center;gap:.55rem;padding:0 .75rem;color:var(--chestnut);background:transparent;border:0;font:inherit;font-size:.9rem;cursor:pointer;transform:translateX(-50%)}.hero-scroll-cue span{animation:scroll-cue 2.8s ease-in-out infinite}
@keyframes atmosphere-drift{to{transform:translate(4%,-3%) scale(1.05)}}@keyframes sunlight-drift{to{transform:translateX(5%) scale(1.03)}}@keyframes scroll-cue{50%{transform:translateY(3px)}}
@media(max-width:900px){.home-hero{grid-template-columns:1fr;align-content:start;gap:2rem;padding-top:clamp(3rem,8vh,5rem)}.hero-copy{max-width:42rem}.hero-copy h1{font-size:clamp(3.5rem,11vw,6.5rem)}.hero-world{min-height:30rem}.hero-scroll-cue{display:none}}
@media(max-width:599px){.home-hero{min-height:auto;padding:3.5rem 1.125rem 2.5rem}.hero-copy h1{font-size:clamp(3rem,14vw,5rem);line-height:1}.hero-copy p br{display:none}.hero-actions{align-items:stretch;flex-direction:column}.hero-primary{width:100%}.hero-secondary{align-self:flex-start;text-align:left}.hero-world{min-height:23rem;margin-inline:-2rem}.asset-slot--grandma{left:20%;width:31%}.asset-slot--caregiver{right:10%;width:29%}}
@media(prefers-reduced-motion:reduce){.hero-atmosphere,.hero-light,.hero-scroll-cue span{animation:none}.hero-primary,.hero-primary span{transition:none}}
</style>
