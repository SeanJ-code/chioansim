<template>
  <section
    id="home-mobile-start"
    ref="root"
    class="home-hero"
    aria-labelledby="hero-title"
  >
    <div class="hero-background" aria-hidden="true">
      <div class="hero-atmosphere"></div>
      <div class="hero-light"></div>
      <div class="hero-texture"></div>
    </div>

    <div class="hero-copy" data-hero-copy>
      <span class="hero-eyebrow">01・開始陪伴</span>

      <h1 id="hero-title">
        <span>今天，需要</span>
        <em>哪一種幫忙？</em>
      </h1>

      <p>
        照顧不只是一件事，<br>
        而是生活裡每天不同的需要。
      </p>

      <div class="hero-actions">
        <router-link
          class="hero-primary"
          to="/caregivers"
        >
          找居服員
          <span aria-hidden="true">→</span>
        </router-link>

        <button
          class="hero-secondary"
          type="button"
          @click="emit('journey')"
        >
          第一次使用？看看怎麼預約
        </button>
      </div>
    </div>

    <div
      class="hero-world"
      aria-hidden="true"
      data-hero-world
    >
      <img
        class="hero-world__image"
        src="/images/home/hero-world-master.png"
        alt=""
        width="1672"
        height="941"
        fetchpriority="high"
      >
    </div>

    <HomeMobileChapters :current="1" />

    <button
      class="hero-scroll-cue"
      type="button"
      @click="emit('journey')"
    >
      往下看看
      <span aria-hidden="true">↓</span>
    </button>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import HomeMobileChapters from './HomeMobileChapters.vue';
import { gsap } from '@/composables/useGsap';

const emit = defineEmits<{
  journey: [];
}>();

const root = ref<HTMLElement>();

let context: gsap.Context | undefined;
let started = false;

function startEntrance() {
  if (started || !root.value) return;

  started = true;

  const rootEl = root.value;

  context = gsap.context(() => {
    const media = gsap.matchMedia();

    media.add(
      '(prefers-reduced-motion: reduce)',
      () => {
        gsap.set(
          '[data-hero-copy] > *, [data-hero-world]',
          {
            clearProps: 'all',
          },
        );
      },
    );

    media.add(
      '(min-width: 600px) and (prefers-reduced-motion: no-preference)',
      () => {
        gsap
          .timeline()
          .from('.hero-eyebrow', {
            y: 16,
            autoAlpha: 0,
            duration: 0.45,
          })
          .from(
            '.hero-copy h1',
            {
              y: 42,
              autoAlpha: 0,
              duration: 0.8,
              ease: 'power3.out',
            },
            '-=.18',
          )
          .from(
            '.hero-copy p',
            {
              y: 22,
              autoAlpha: 0,
              duration: 0.6,
              ease: 'power3.out',
            },
            '-=.38',
          )
          .from(
            '.hero-actions',
            {
              y: 18,
              autoAlpha: 0,
              duration: 0.55,
              ease: 'power3.out',
            },
            '-=.3',
          )
          .from(
            '[data-hero-world]',
            {
              autoAlpha: 0,
              duration: 0.8,
              ease: 'power2.out',
            },
            '-=.55',
          );
      },
    );

    return () => media.revert();
  }, rootEl);
}

defineExpose({
  startEntrance,
});

onBeforeUnmount(() => {
  context?.revert();
});
</script>

<style scoped>
.home-hero {
  position: relative;
  isolation: isolate;
  min-height: 88dvh;

  display: grid;
  grid-template-columns: minmax(22rem, 0.8fr) 1.2fr;
  align-items: center;

  gap: clamp(2rem, 5vw, 7rem);

  overflow: hidden;

  padding:
    clamp(4rem, 8vh, 7rem)
    max(
      clamp(1.5rem, 5vw, 6rem),
      calc((100vw - 1440px) / 2)
    );

  color: var(--ink);
}


/* =========================================================
   Background
   ========================================================= */

.hero-background,
.hero-atmosphere,
.hero-light,
.hero-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-background {
  z-index: -2;
  background: #fff8ef;
}

.hero-atmosphere {
  inset: -10%;

  background:
    radial-gradient(
      circle at 18% 72%,
      #b8cba84d,
      transparent 35%
    );

  filter: blur(30px);

  animation:
    atmosphere-drift
    24s
    ease-in-out
    infinite
    alternate;
}

.hero-light {
  background:
    linear-gradient(
      118deg,
      transparent 48%,
      #fffdfb4d 58%,
      transparent 72%
    );

  animation:
    sunlight-drift
    28s
    ease-in-out
    infinite
    alternate;
}

.hero-texture {
  opacity: 0.1;

  background-image:
    radial-gradient(
      #6e575052 0.65px,
      transparent 0.8px
    );

  background-size: 7px 7px;

  mix-blend-mode: multiply;
}


/* =========================================================
   Hero Copy
   ========================================================= */

.hero-copy {
  position: absolute;
  z-index: 2;

  /* 1920×1080 桌機：文字放在左下區域 */
  left: 6%;
  bottom: 11%;

  width: 580px;
  max-width: 580px;

  transform: none;
}

.hero-eyebrow {
  display: block;

  margin-bottom: 1rem;

  color: var(--persimmon);

  font-size: 0.88rem;
  font-weight: 700;

  letter-spacing: 0.14em;
}

.hero-copy h1 {
  margin: 0;

  color: var(--ink);

  font-size:
    clamp(
      3.6rem,
      5.4vw,
      6.4rem
    );

  font-weight: 700;

  line-height: 0.98;

  letter-spacing: -0.035em;
}

.hero-copy h1 span,
.hero-copy h1 em {
  display: block;

  white-space: nowrap;
}

.hero-copy h1 em {
  color: var(--ink);

  font-style: normal;
}

.hero-copy p {
  margin:
    clamp(
      1.5rem,
      3vw,
      2.5rem
    )
    0
    0;

  color: var(--chestnut);

  font-size:
    clamp(
      1.05rem,
      1.5vw,
      1.3rem
    );

  line-height: 1.75;
}


/* =========================================================
   Hero Actions
   ========================================================= */

.hero-actions {
  display: flex;
  align-items: center;

  gap: 1.25rem;

  margin-top: 2rem;
}

.hero-primary {
  min-height: 54px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  gap: 0.6rem;

  padding: 0 1.5rem;

  color: #fff;
  background: var(--persimmon);

  border-radius: 15px;

  box-shadow:
    0 10px 24px #b84f1633;

  font-size: 1.05rem;
  font-weight: 700;

  text-decoration: none;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.hero-primary span {
  transition:
    transform 0.2s ease;
}

.hero-primary:hover {
  transform:
    translateY(-2px);

  box-shadow:
    0 14px 30px #b84f1642;
}

.hero-primary:hover span {
  transform:
    translateX(4px);
}

.hero-primary:active {
  transform:
    scale(0.97);
}

.hero-secondary {
  min-height: 48px;

  padding: 0.5rem 0;

  color: var(--chestnut);

  background: transparent;

  border: 0;

  border-bottom:
    1px solid #6e575059;

  font: inherit;
  font-weight: 700;

  cursor: pointer;
}

.hero-primary:focus-visible,
.hero-secondary:focus-visible,
.hero-scroll-cue:focus-visible {
  outline:
    3px solid #b84f16;

  outline-offset: 4px;
}


/* =========================================================
   Hero World
   ========================================================= */

.hero-world {
  position: absolute;

  z-index: -1;

  inset: 0;

  overflow: hidden;

  transform-origin: center;
}

.hero-world::after {
  content: "";

  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      90deg,
      #fff8effa 0%,
      #fff8efcf 28%,
      transparent 50%
    );
}

.hero-world__image {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;

  object-position: 72% center;

  transform-origin: 72% 50%;

  backface-visibility: hidden;
}


/* =========================================================
   Scroll Cue
   ========================================================= */

.hero-scroll-cue {
  position: absolute;

  left: 50%;
  bottom: 1rem;

  min-height: 48px;

  display: flex;
  align-items: center;

  gap: 0.55rem;

  padding: 0 0.75rem;

  color: var(--chestnut);

  background: transparent;

  border: 0;

  font: inherit;
  font-size: 0.9rem;

  cursor: pointer;

  transform:
    translateX(-50%);
}

.hero-scroll-cue span {
  animation:
    scroll-cue
    2.8s
    ease-in-out
    infinite;
}


/* =========================================================
   Keyframes
   ========================================================= */

@keyframes atmosphere-drift {
  to {
    transform:
      translate(4%, -3%)
      scale(1.05);
  }
}

@keyframes sunlight-drift {
  to {
    transform:
      translateX(5%)
      scale(1.03);
  }
}

@keyframes scroll-cue {
  50% {
    transform:
      translateY(3px);
  }
}


/* =========================================================
   Original responsive image adjustment
   ========================================================= */

@media (max-width: 1200px) {
  .hero-world__image {
    object-position: 58% center;
  }
}


/* =========================================================
   Tablet
   ========================================================= */

@media (max-width: 900px) {
  .home-hero {
    grid-template-columns: 1fr;

    align-content: start;

    gap: 2rem;

    padding-top:
      clamp(
        3rem,
        8vh,
        5rem
      );
  }

  .hero-copy {
    max-width: 35rem;
  }

  .hero-copy h1 {
    font-size:
      clamp(
        3.2rem,
        8vw,
        4.8rem
      );
  }

  .hero-world__image {
    object-position: 62% center;
  }

  .hero-scroll-cue {
    display: none;
  }
}


/* =========================================================
   Original Mobile
   ========================================================= */

@media (max-width: 599px) {
  .home-hero {
    min-height: auto;

    padding:
      3.5rem
      1.125rem
      0;

    background:
      #fff8ef;
  }

  .hero-copy h1 {
    font-size:
      clamp(
        2.75rem,
        12vw,
        4rem
      );

    line-height: 1;
  }

  .hero-copy p br {
    display: none;
  }

  .hero-actions {
    align-items: stretch;

    flex-direction: column;
  }

  .hero-primary {
    width: 100%;
  }

  .hero-secondary {
    align-self: flex-start;

    text-align: left;
  }

  .hero-world {
    position: relative;

    z-index: 0;

    inset: auto;

    width:
      calc(
        100% + 2.25rem
      );

    height:
      min(
        128vw,
        34rem
      );

    margin:
      2rem
      -1.125rem
      0;
  }

  .hero-world::after {
    background:
      linear-gradient(
        180deg,
        #fff8ef 0%,
        transparent 18%
      );
  }

  .hero-world__image {
    object-position: 68% center;
  }

  .hero-background {
    display: none;
  }
}


/* =========================================================
   Current Home Hero presentation
   ========================================================= */

.home-hero {
  min-height:
    calc(
      100svh - 80px
    );

  grid-template-columns: 1fr;

  padding-block: 80px;
}

.hero-copy {
  max-width: 620px;
}

.hero-copy h1 {
  font-family:
    'Kaiti TC',
    'Songti TC',
    serif;

  font-size:
    clamp(
      3rem,
      4.7vw,
      5rem
    );

  line-height: 1.3;

  letter-spacing: 0.025em;
}

.hero-copy h1 em {
  color: var(--ink);
}

.hero-eyebrow {
  letter-spacing: 0.22em;
}

.hero-copy p {
  margin-top: 24px;

  line-height: 1.9;
}

.hero-world::after {
  background:
    linear-gradient(
      90deg,
      #fff8efaa,
      transparent 60%
    );
}

.hero-actions {
  gap: 12px;

  flex-wrap: wrap;
}

.hero-primary,
.hero-secondary {
  min-height: 52px;

  padding:
    12px
    24px;

  border-radius: 999px;

  font-size: 1rem;
}

.hero-primary {
  background:
    #b84916;

  box-shadow: none;
}

.hero-secondary {
  color:
    #a94216;

  background:
    #fffdfbe6;

  border:
    1px solid #c8561840;
}

.hero-scroll-cue {
  left: 6%;

  transform: none;
}


/* =========================================================
   Tablet copy size
   ========================================================= */

@media (max-width: 900px) {
  .hero-copy {
    max-width: 520px;
  }

  .hero-copy h1 {
    font-size:
      clamp(
        2.6rem,
        6vw,
        4rem
      );
  }
}


/* =========================================================
   Tablet / Mobile vertical presentation
   ========================================================= */

@media (max-width: 900px) {
  .home-hero {
    min-height:
      calc(
        100svh - 64px
      );

    display: flex;

    flex-direction: column;

    gap: 0;

    padding:
      0
      0
      44px;
  }

  .hero-world {
    position: relative;

    inset: auto;

    z-index: 0;

    flex-shrink: 0;

    order: -1;

    width: 100%;

    height: 42svh;

    min-height: 260px;

    margin: 0;
  }

  .hero-world__image {
    object-position:
      85% center;
  }

  .hero-world::after {
    background:
      linear-gradient(
        0deg,
        #fff8ef,
        transparent 28%
      );
  }

  .hero-copy {
    width: 100%;

    max-width: 640px;

    padding:
      8px
      24px
      0;
  }

  .hero-copy h1 {
    font-size:
      clamp(
        2.3rem,
        7vw,
        3.4rem
      );

    line-height: 1.3;
  }

  .hero-eyebrow {
    margin-bottom: 12px;

    font-size: 0.8rem;
  }

  .hero-copy p {
    margin-top: 14px;

    font-size: 1rem;
  }

  .hero-copy p br {
    display: initial;
  }

  .hero-actions {
    margin-top: 22px;

    gap: 10px;
  }

  .hero-secondary {
    align-self: stretch;

    text-align: center;
  }

  .hero-primary {
    width: 100%;
  }
}


/* =========================================================
   Phone presentation
   ========================================================= */

@media (max-width: 599px) {
  .home-hero {
    min-height:
      calc(
        100svh - 68px
      );

    padding:
      24px
      20px
      calc(
        12px + env(safe-area-inset-bottom)
      );

    gap: 0;

    align-items: stretch;

    scroll-margin-top: 68px;

    background:
      var(--milk);
  }

  /*
   * 手機版故意使用 display: contents，
   * 讓文字、圖片、按鈕能依 order 排列。
   * 因此手機版不要用 transform 移動 hero-copy。
   */
  .hero-copy {
    display: contents;
  }

  .hero-eyebrow {
    order: 0;

    margin:
      0
      0
      4px;

    font-size: 0;
  }

  .hero-eyebrow::after {
    content: '01';

    color: var(--persimmon);

    font-size: 22px;

    letter-spacing: 0;
  }

  .hero-copy h1 {
    order: 1;

    font-size:
      clamp(
        28px,
        8vw,
        36px
      );

    line-height: 1.35;
  }

  .hero-copy p {
    order: 2;

    align-self: flex-start;

    margin:
      12px
      0
      18px;

    font-size: 16px;

    line-height: 1.65;
  }

  .hero-world {
    order: 3;

    flex: none;

    width: 100%;
    height: auto;

    min-height: 0;

    aspect-ratio: 4 / 3;

    margin: 0;

    border-radius: 12px;

    overflow: hidden;
  }

  .hero-world__image {
    object-position:
      85% center;
  }

  .hero-world::after {
    display: none;
  }

  .hero-actions {
    order: 4;

    width: 100%;

    margin:
      12px
      0
      0;

    gap: 10px;
  }

  .hero-primary,
  .hero-secondary {
    min-height: 48px;

    padding:
      10px
      14px;

    font-size: 16px;
  }

  .hero-secondary {
    color:
      var(--ink);

    background:
      var(--paper);

    border-color:
      #8e786b;
  }

  .mobile-chapters {
    order: 5;

    width: 100%;
  }
}


/* =========================================================
   Reduced Motion
   ========================================================= */

@media (prefers-reduced-motion: reduce) {
  .hero-atmosphere,
  .hero-light,
  .hero-scroll-cue span {
    animation: none;
  }

  .hero-primary,
  .hero-primary span {
    transition: none;
  }
}


/* =========================================================
   DESKTOP HERO POSITION
   這裡就是你要調整的位置
   ========================================================= */

@media (min-width: 901px) {
  .home-hero {
    /*
     * 原本 Hero 是垂直置中。
     * 改成讓 hero-copy 可以真正落在畫面偏下位置。
     */
    align-items: stretch;
  }

  .hero-copy {
    /*
     * 放到 Grid 左下。
     */
    align-self: end;
    justify-self: start;

    /*
     * 讓文字不要太寬，
     * 避免壓到右側人物。
     */
    max-width: 580px;

    /*
     * ★ 水平位置
     *
     * -20px = 現在建議值
     *
     * 更左：
     * -40px
     * -60px
     *
     * 更右：
     * 0
     * 20px
     */
    margin-left: -20px;

    /*
     * ★ 垂直位置
     *
     * 數字越小 → 越下面
     * 數字越大 → 越上面
     *
     * 目前先設定 36px。
     */
    margin-bottom: 36px;

    /*
     * 不用 transform 做靜態定位。
     * 保留 transform 給 GSAP / interaction 使用。
     */
    transform: none;
  }
}
</style>
