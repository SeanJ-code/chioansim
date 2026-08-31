import { gsap, Flip, ScrollTrigger } from './useGsap';

export type CareMotionTone = 'joy' | 'calm' | 'serious';

export const careMotion = {
  duration: { fast: 0.18, normal: 0.28, slow: 0.55 },
  ease: { joy: 'back.out(1.45)', calm: 'care-soft', serious: 'power2.out' },
  stagger: 0.06,
} as const;

export function useCareMotion(scope?: Element | null) {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const select = (target: gsap.TweenTarget) => typeof target === 'string' && scope ? scope.querySelectorAll(target) : target;

  function entrance() {
    if (reduced()) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: careMotion.ease.calm } });
      const heading = gsap.utils.toArray('.hero, [data-motion-heading]');
      const summaries = gsap.utils.toArray('.summary-grid > *, [data-motion-summary] > *');
      const main = gsap.utils.toArray('.work-grid, [data-motion-main]');
      if (heading.length) timeline.from(heading, { y: 18, autoAlpha: 0, duration: careMotion.duration.slow });
      if (summaries.length) timeline.from(summaries, { y: 20, scale: 0.97, autoAlpha: 0, stagger: careMotion.stagger, duration: 0.42 }, '-=.28');
      if (main.length) timeline.from(main, { y: 24, autoAlpha: 0, duration: careMotion.duration.slow }, '-=.2');
    }, scope || undefined);
    return () => context.revert();
  }

  function revealSections(selector = '[data-care-section]') {
    if (reduced()) return;
    const context = gsap.context(() => gsap.utils.toArray<HTMLElement>(selector).forEach((section) =>
      gsap.from(section, { y: 28, autoAlpha: 0, duration: careMotion.duration.slow, ease: careMotion.ease.calm,
        scrollTrigger: { trigger: section, start: 'top 84%', once: true } })), scope || undefined);
    return () => context.revert();
  }

  function feedback(target: gsap.TweenTarget, tone: CareMotionTone = 'calm') {
    if (reduced()) return;
    const element = select(target);
    return tone === 'joy'
      ? gsap.fromTo(element, { scale: 0.94 }, { scale: 1, duration: 0.45, ease: careMotion.ease.joy, boxShadow: '0 0 0 10px rgb(235 144 121 / 0)', clearProps: 'boxShadow' })
      : gsap.from(element, { y: tone === 'serious' ? -8 : 10, autoAlpha: 0, duration: careMotion.duration.normal, ease: careMotion.ease[tone] });
  }

  async function flip(targets: string | Element[], update: () => Promise<void>) {
    if (reduced()) return update();
    const state = Flip.getState(targets);
    await update();
    return Flip.from(state, { duration: careMotion.duration.slow, ease: careMotion.ease.calm, absolute: true, nested: true });
  }

  return { reduced, entrance, revealSections, feedback, flip, refresh: () => ScrollTrigger.refresh() };
}
