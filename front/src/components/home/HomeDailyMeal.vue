<template>
  <section ref="root" class="daily-meal" aria-labelledby="daily-meal-title">
    <div class="daily-meal__copy">
      <span class="daily-meal__chapter">03</span>
      <h2 id="daily-meal-title">好好吃飯，<br>也是好好生活。</h2>
      <p>從備餐到日常陪伴，把需要幫忙的小事一起做好。</p>
      <ul aria-label="服務內容">
        <li>備餐協助</li>
        <li>生活陪伴</li>
      </ul>
    </div>
    <figure class="daily-meal__visual">
      <img :src="mealImage" alt="居服員與奶奶一起準備午餐，貓咪在旁陪伴" class="daily-meal__image daily-meal__image--visible" decoding="async">
    </figure>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from '@/composables/useGsap';
import mealImage from '@/assets/home-world/needs/meal.webp';

const root = ref<HTMLElement | null>(null);
let context: gsap.Context | undefined;

onMounted(() => {
  if (!root.value) return;
  context = gsap.context(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set('.daily-meal__image--visible, .daily-meal__copy > *, .daily-meal__copy li', { clearProps: 'all' });
      return;
    }
    const scrollTrigger = { trigger: root.value, start: 'top 78%', toggleActions: 'play none none reverse' };
    gsap.fromTo('.daily-meal__image--visible', { autoAlpha: 0, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 1, ease: 'power2.out', scrollTrigger });
    gsap.fromTo('.daily-meal__copy > *', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .65, stagger: .1, ease: 'power2.out', scrollTrigger });
    gsap.fromTo('.daily-meal__copy li', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .45, stagger: .1, ease: 'power2.out', scrollTrigger });
  }, root.value);
});

onBeforeUnmount(() => context?.revert());
</script>

<style scoped>
.daily-meal{--milk:#fff9f5;--paper:#fffdfb;--ink:#493833;--chestnut:#6e5750;--peach:#eb9079;--persimmon:#c85618;--sage:#4f7264;position:relative;isolation:isolate;min-height:100dvh;display:grid;grid-template-columns:minmax(19rem,.7fr) minmax(0,1.6fr);align-items:stretch;overflow:hidden;color:var(--ink);background:var(--milk)}
.daily-meal__copy{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;padding:clamp(4rem,9vw,8rem) clamp(2rem,5vw,6rem);background:radial-gradient(circle at 18% 46%,var(--paper) 0 22%,transparent 70%),linear-gradient(100deg,var(--milk) 0 72%,rgba(255,249,245,.72) 100%)}
.daily-meal__chapter{margin-bottom:1.5rem;color:var(--persimmon);font-size:.85rem;font-weight:700;letter-spacing:.2em}.daily-meal h2{margin:0;color:var(--ink);font-size:clamp(2.8rem,5vw,5.5rem);line-height:1.08;letter-spacing:-.03em}.daily-meal__copy p{max-width:25rem;margin:1.75rem 0 0;color:var(--chestnut);font-size:clamp(1rem,1.25vw,1.2rem);line-height:1.8}.daily-meal__copy ul{display:flex;flex-wrap:wrap;gap:.7rem;margin:2.5rem 0 0;padding:0;list-style:none}.daily-meal__copy li{padding:.55rem .95rem;color:var(--sage);border:1px solid color-mix(in srgb,var(--sage) 38%,transparent);border-radius:999px;font-size:.9rem;font-weight:700;letter-spacing:.06em}
.daily-meal__visual{position:relative;min-width:0;min-height:100dvh;margin:0;overflow:hidden;background:var(--peach)}.daily-meal__visual::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,249,245,.82),transparent 27%),linear-gradient(0deg,rgba(73,56,51,.12),transparent 35%);pointer-events:none}.daily-meal__image{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:center;opacity:0}.daily-meal__image--visible{opacity:1;will-change:transform,opacity}
@media(max-width:767px){.daily-meal{display:flex;flex-direction:column;min-height:0}.daily-meal__visual{order:0;width:100%;height:min(72vw,28rem);min-height:18rem}.daily-meal__copy{order:1;padding:3.5rem 1.25rem 4rem;background:var(--milk)}.daily-meal h2{font-size:clamp(2.5rem,11vw,4rem)}.daily-meal__copy p{margin-top:1.25rem}.daily-meal__copy ul{margin-top:1.75rem}.daily-meal__visual::after{background:linear-gradient(0deg,rgba(73,56,51,.2),transparent 42%)}}
@media(prefers-reduced-motion:reduce){.daily-meal__image--visible{will-change:auto}}
</style>
