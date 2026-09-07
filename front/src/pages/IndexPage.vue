<template>
  <q-page class="home-page">
    <main
      ref="homePage"
      class="home-main"
    >
      <HomeHero
        ref="homeHero"
        @journey="
          scrollToSection(
            'care-scene-02'
          )
        "
      />

      <HomeCareDayStory
        :progress-steps="
          progressSteps
        "
        :caregivers="caregivers"
        :caregiver-loading="caregiverLoading"
        :caregiver-error-message="caregiverErrorMessage"
        @retry-caregivers="caregiverStore.fetchCaregivers(undefined, true)"
        @line="
          handleFeatureItem(
            'LINE 專人服務'
          )
        "
      />
    </main>

    <HomeQuickAccess
      @line="
        handleFeatureItem(
          'LINE 專人服務'
        )
      "
    />

    <OpeningExperience
      @finished="
        handleOpeningFinished
      "
    />

    <q-dialog
      v-model="lineDialog"
    >
      <q-card
        class="line-dialog"
      >
        <q-card-section
          class="line-dialog__mark"
        >
          <MessageCircleHeart
            :size="42"
          />
        </q-card-section>

        <q-card-section
          class="line-dialog__copy"
        >
          <button
            type="button"
            aria-label="關閉 LINE 專人服務"
            v-close-popup
          >
            <X :size="22" />
          </button>

          <small>
            照安心 LINE 官方帳號
          </small>

          <h2>
            需要時，我們就在 LINE 裡陪您
          </h2>

          <p>
            官方 LINE ID
          </p>

          <strong>
            @690hzupc
          </strong>

          <a
            href="https://line.me/R/ti/p/@690hzupc"
            target="_blank"
            rel="noopener noreferrer"
          >
            開啟 LINE 加好友

            <ArrowRight
              :size="20"
            />
          </a>
        </q-card-section>

        <q-card-actions
          align="center"
        >
          <q-btn
            flat
            no-caps
            label="稍後再說"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';

import { storeToRefs } from 'pinia';

import {
  ArrowRight,
  BellRing,
  Bike,
  CheckCircle2,
  MapPinned,
  MessageCircleHeart,
  Route,
  X,
} from '@lucide/vue';

import OpeningExperience
  from '@/components/opening/OpeningExperience.vue';

import HomeHero
  from '@/components/home/HomeHero.vue';

import HomeCareDayStory
  from '@/components/home/story/HomeCareDayStory.vue';

import HomeQuickAccess
  from '@/components/home/HomeQuickAccess.vue';

import { useCaregiverStore } from '@/stores/caregiver-store';

import {
  gsap,
  ScrollTrigger,
} from '@/composables/useGsap';

const reduceMotion =
  typeof window !==
    'undefined' &&
  window
    .matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    .matches;

const homePage =
  ref<HTMLElement>();

const homeHero =
  ref<
    InstanceType<
      typeof HomeHero
    >
  >();

const caregiverStore = useCaregiverStore();

const {
  caregivers,
  loading: caregiverLoading,
  errorMessage: caregiverErrorMessage,
} = storeToRefs(caregiverStore);

const lineDialog =
  ref(false);

let motionContext:
  | gsap.Context
  | undefined;

let media:
  | gsap.MatchMedia
  | undefined;

let motionStarted =
  false;

const progressSteps = [
  {
    label:
      '承接任務',

    icon:
      markRaw(
        CheckCircle2,
      ),
  },

  {
    label:
      '準備出發',

    icon:
      markRaw(
        Bike,
      ),
  },

  {
    label:
      '抵達服務地點',

    icon:
      markRaw(
        MapPinned,
      ),
  },

  {
    label:
      '家人收到通知',

    icon:
      markRaw(
        BellRing,
      ),
  },

  {
    label:
      '完成服務',

    icon:
      markRaw(
        Route,
      ),
  },
];

function scrollToSection(
  id: string,
) {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior:
        reduceMotion
          ? 'auto'
          : 'smooth',
    });
}

function handleFeatureItem(
  name: string,
) {
  if (
    name ===
    'LINE 專人服務'
  ) {
    lineDialog.value =
      true;
  }
}

function setupHomeScrollAnimations() {
  if (
    motionStarted ||
    !homePage.value
  ) {
    return;
  }

  motionStarted = true;

  motionContext =
    gsap.context(() => {
      media =
        gsap.matchMedia();

      media.add(
        '(prefers-reduced-motion: reduce)',
        () => {
          gsap.utils
            .toArray<HTMLElement>(
              '[data-reveal], [data-stagger] > *',
            )
            .forEach(
              (
                element,
              ) =>
                gsap.from(
                  element,
                  {
                    y: 10,

                    autoAlpha:
                      0,

                    duration:
                      0.25,

                    scrollTrigger:
                      {
                        trigger:
                          element,

                        start:
                          'top 88%',

                        toggleActions:
                          'play none none reverse',
                      },
                  },
                ),
            );
        },
      );

      media.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          gsap.utils
            .toArray<HTMLElement>(
              '[data-reveal]',
            )
            .forEach(
              (
                element,
              ) =>
                gsap.from(
                  element,
                  {
                    y: 42,

                    autoAlpha:
                      0,

                    duration:
                      0.85,

                    ease:
                      'power3.out',

                    scrollTrigger:
                      {
                        trigger:
                          element,

                        start:
                          'top 82%',

                        end:
                          'bottom 58%',

                        toggleActions:
                          'play none none reverse',
                      },
                  },
                ),
            );

          gsap.utils
            .toArray<HTMLElement>(
              '[data-stagger]',
            )
            .forEach(
              (
                group,
              ) =>
                gsap.from(
                  group.children,
                  {
                    y: 34,

                    autoAlpha:
                      0,

                    duration:
                      0.7,

                    stagger:
                      0.12,

                    ease:
                      'power3.out',

                    scrollTrigger:
                      {
                        trigger:
                          group,

                        start:
                          'top 82%',

                        toggleActions:
                          'play none none reverse',
                      },
                  },
                ),
            );

          gsap.utils
            .toArray<HTMLElement>(
              '[data-panel]',
            )
            .forEach(
              (
                panel,
              ) => {
                const reveal =
                  panel.querySelector<HTMLElement>(
                    '.panel-reveal',
                  );

                const copy =
                  panel.querySelector<HTMLElement>(
                    'header, :scope > div:not(.panel-reveal)',
                  );

                if (
                  !reveal ||
                  panel.id ===
                    'needs'
                ) {
                  return;
                }

                gsap.fromTo(
                  reveal,
                  {
                    scale:
                      1.05,
                  },
                  {
                    scale:
                      1,

                    ease:
                      'none',

                    scrollTrigger:
                      {
                        trigger:
                          panel,

                        start:
                          'top 72%',

                        end:
                          'bottom 28%',

                        scrub:
                          1,
                      },
                  },
                );

                if (copy) {
                  gsap.fromTo(
                    copy,
                    {
                      xPercent:
                        panel
                          .dataset
                          .panel ===
                        'left'
                          ? -5
                          : 5,
                    },
                    {
                      xPercent:
                        0,

                      ease:
                        'none',

                      scrollTrigger:
                        {
                          trigger:
                            panel,

                          start:
                            'top 75%',

                          end:
                            'bottom 25%',

                          scrub:
                            0.8,
                        },
                    },
                  );
                }
              },
            );

          gsap.utils
            .toArray<HTMLElement>(
              '.cta-motion',
            )
            .forEach(
              (
                wrapper,
              ) =>
                gsap
                  .timeline({
                    scrollTrigger:
                      {
                        trigger:
                          wrapper,

                        start:
                          'top 88%',

                        end:
                          'bottom 30%',

                        scrub:
                          0.8,
                      },
                  })
                  .fromTo(
                    wrapper,
                    {
                      y: 16,

                      scale:
                        0.94,

                      opacity:
                        0.65,
                    },
                    {
                      y: 0,

                      scale:
                        1,

                      opacity:
                        1,

                      duration:
                        0.65,
                    },
                  )
                  .to(
                    wrapper,
                    {
                      scale:
                        0.96,

                      opacity:
                        0.75,

                      duration:
                        0.35,
                    },
                  ),
            );
        },
      );

      gsap.utils
        .toArray<HTMLElement>(
          '[data-panel]',
        )
        .forEach(
          (
            panel,
            index,
          ) =>
            gsap.to(
              homePage.value!,
              {
                '--scroll-bg':
                  [
                    '#fff9f5',
                    '#fffdfb',
                    '#f4eadf',
                    '#e4ecdf',
                    '#f8ded4',
                  ][
                    Math.min(
                      index,
                      4,
                    )
                  ],

                ease:
                  'none',

                scrollTrigger:
                  {
                    trigger:
                      panel,

                    start:
                      'top bottom',

                    end:
                      'bottom top',

                    scrub:
                      1.2,
                  },
              },
            ),
        );

      ScrollTrigger.refresh();
    }, homePage.value);
}

async function handleOpeningFinished() {
  await nextTick();

  homeHero.value
    ?.startEntrance();

  ScrollTrigger.refresh();
}

onMounted(() => {
  void caregiverStore.fetchCaregivers();

  setupHomeScrollAnimations();
});

onBeforeUnmount(() => {
  media?.revert();

  motionContext?.revert();
});
</script>

<style scoped>
.home-page {
  --milk: #fff9f5;
  --paper: #fffdfb;
  --ink: #493833;
  --chestnut: #6e5750;
  --peach: #eb9079;
  --persimmon: #c85618;

  color:
    var(--ink);

  background:
    var(--milk);
}

.home-main {
  overflow:
    clip;
}

.eyebrow {
  display:
    block;

  margin-bottom:
    12px;

  color:
    var(--persimmon);

  font-size:
    0.88rem;

  font-weight:
    700;

  letter-spacing:
    0.16em;
}

h2 {
  margin:
    0
    0
    16px;

  font-size:
    clamp(
      2.3rem,
      4.5vw,
      4rem
    );

  line-height:
    1.14;

  letter-spacing:
    -0.035em;
}

h3 {
  margin:
    0
    0
    8px;

  font-size:
    1.3rem;
}

.story-panel {
  position:
    relative;

  isolation:
    isolate;

  overflow:
    hidden;
}

.story-panel
> *:not(.panel-reveal) {
  position:
    relative;

  z-index:
    1;
}

.panel-reveal {
  position:
    absolute;

  z-index:
    0;

  inset:
    0;

  will-change:
    transform;
}

.story-panel--paper
.panel-reveal {
  background:
    #fffaf7;
}

.story-panel--oat
.panel-reveal {
  background:
    #f4eee8;
}

.story-panel--chestnut
.panel-reveal {
  background:
    #f4eee8;
}

.text-link,
.primary {
  min-height:
    48px;

  display:
    inline-flex;

  align-items:
    center;

  gap:
    7px;

  color:
    var(--persimmon);

  font-weight:
    700;

  text-decoration:
    none;
}

.primary {
  min-height:
    52px;

  padding:
    0
    24px;

  color:
    #fff;

  background:
    var(--persimmon);

  border-radius:
    15px;
}

.text-link:focus-visible,
.primary:focus-visible,
button:focus-visible,
a:focus-visible {
  outline:
    3px
    solid
    #eb9079;

  outline-offset:
    3px;
}

/* =========================================================
   Caregivers
   ========================================================= */

.caregivers {
  display:
    grid;

  grid-template-columns:
    minmax(
      240px,
      0.38fr
    )
    minmax(
      0,
      1fr
    );

  gap:
    clamp(
      40px,
      6vw,
      90px
    );

  padding:
    clamp(
      80px,
      8vw,
      120px
    )
    max(
      24px,
      calc(
        (
          100vw -
          1440px
        ) /
        2
      )
    );

  background:
    #fffaf7;
}

.caregivers header {
  max-width:
    420px;
}

.caregivers header p {
  color:
    var(--chestnut);

  font-size:
    1.08rem;

  line-height:
    1.7;
}

.caregiver-row {
  display:
    grid;

  grid-template-columns:
    repeat(
      3,
      minmax(
        0,
        1fr
      )
    );

  gap:
    18px;

  min-width:
    0;
}

.caregiver-card {
  overflow:
    hidden;

  scroll-snap-align:
    start;

  color:
    var(--ink);

  background:
    var(--paper);

  border:
    1px solid
    #6e57501f;

  border-radius:
    22px;

  box-shadow:
    0
    14px
    36px
    #49383310;

  text-decoration:
    none;
}

.photo {
  position:
    relative;

  aspect-ratio:
    4 / 5;

  overflow:
    hidden;

  background:
    #f4e5de;
}

.photo img {
  width:
    100%;

  height:
    100%;

  object-fit:
    cover;
}

.photo img.is-fallback {
  padding:
    36px;

  object-fit:
    contain;
}

.photo span {
  position:
    absolute;

  left:
    10px;

  bottom:
    10px;

  display:
    flex;

  gap:
    5px;

  padding:
    6px
    9px;

  color:
    #315746;

  background:
    #eef8f1;

  border-radius:
    999px;
}

.body {
  padding:
    20px;
}

.body p,
.body b {
  display:
    flex;

  align-items:
    center;

  gap:
    7px;

  margin:
    7px
    0;

  color:
    var(--chestnut);
}

.body b {
  color:
    var(--persimmon);
}

.skeleton {
  height:
    380px;

  border-radius:
    22px;
}

.state {
  grid-column:
    2;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    16px;

  padding:
    28px;

  background:
    #fff1eb;

  border-radius:
    22px;
}

.state div {
  display:
    flex;

  flex-direction:
    column;
}

.state button {
  min-height:
    44px;

  padding:
    0
    16px;

  color:
    #fff;

  background:
    var(--persimmon);

  border:
    0;

  border-radius:
    12px;
}

.trust-list {
  grid-column:
    1 / -1;

  display:
    grid;

  grid-template-columns:
    repeat(
      3,
      1fr
    );

  margin:
    0;

  padding:
    0;

  border-top:
    1px solid
    #6e57502e;

  list-style:
    none;
}

.trust-list li {
  display:
    flex;

  align-items:
    center;

  gap:
    14px;

  padding:
    24px
    12px;

  border-bottom:
    1px solid
    #6e57502e;
}

.trust-list b {
  color:
    var(--persimmon);

  letter-spacing:
    0.14em;
}

.estimate p {
  color:
    var(--chestnut);

  font-size:
    1.08rem;

  line-height:
    1.7;
}

/* =========================================================
   Estimate
   ========================================================= */

.estimate {
  display:
    grid;

  grid-template-columns:
    0.9fr
    1.1fr;

  align-items:
    center;

  gap:
    clamp(
      40px,
      7vw,
      100px
    );

  padding:
    clamp(
      80px,
      8vw,
      120px
    )
    max(
      24px,
      calc(
        (
          100vw -
          1440px
        ) /
        2
      )
    );

  background:
    #f4eee8;
}

.estimate aside {
  display:
    flex;

  gap:
    10px;

  padding:
    15px;

  color:
    var(--chestnut);

  background:
    #fffdfb99;

  border-radius:
    16px;
}

.calculator {

  padding:
    clamp(
      18px,
      3vw,
      34px
    );

  background:
    var(--paper);

  border-radius:
    24px;

  box-shadow:
    0
    20px
    50px
    #49383312;
}

/* =========================================================
   LINE Dialog
   ========================================================= */

.line-dialog {
  width:
    min(
      430px,
      calc(
        100vw -
        28px
      )
    );

  padding:
    10px
    18px
    18px;

  color:
    var(--ink);

  background:
    var(--paper);

  border-radius:
    26px;
}

.line-dialog__mark {
  width:
    76px;

  height:
    76px;

  display:
    grid;

  place-items:
    center;

  margin:
    18px
    auto
    0;

  color:
    #fff;

  background:
    #4f7264;

  border-radius:
    24px;
}

.line-dialog__copy {
  position:
    relative;

  text-align:
    center;
}

.line-dialog__copy
> button {
  position:
    absolute;

  top:
    -86px;

  right:
    -8px;

  width:
    44px;

  height:
    44px;

  background:
    transparent;

  border:
    0;
}

.line-dialog__copy h2 {
  margin:
    10px
    0
    20px;
}

.line-dialog__copy p {
  margin:
    0;
}

.line-dialog__copy strong {
  display:
    block;

  margin:
    5px
    0
    20px;
}

.line-dialog__copy a {
  min-height:
    50px;

  display:
    inline-flex;

  align-items:
    center;

  gap:
    8px;

  padding:
    0
    20px;

  color:
    #fff;

  background:
    var(--persimmon);

  border-radius:
    14px;

  text-decoration:
    none;
}

/* =========================================================
   Tablet
   ========================================================= */

@media (
  max-width:
  900px
) {
  .caregivers,
  .estimate {
    grid-template-columns:
      1fr;
  }

  .caregiver-row {
    grid-auto-flow:
      column;

    grid-auto-columns:
      minmax(
        270px,
        78vw
      );

    grid-template-columns:
      none;

    overflow-x:
      auto;

    padding-bottom:
      16px;

    scroll-snap-type:
      x mandatory;
  }

  .state {
    grid-column:
      auto;
  }

  .trust-list {
    grid-column:
      auto;
  }

}

/* =========================================================
   Mobile
   ========================================================= */

@media (
  max-width:
  599px
) {
  .caregivers,
  .estimate {
    padding:
      72px
      18px;
  }

  .caregiver-row {
    grid-auto-columns:
      82vw;
  }

  .trust-list {
    grid-template-columns:
      1fr;
  }

  .primary {
    width:
      100%;

    justify-content:
      center;
  }

  .home-page
  :deep(.quick-access) {
    top:
      12px;

    right:
      12px;

    z-index:
      2001;

    padding:
      0;

    background:
      var(--paper);

    box-shadow:
      none;
  }
}

/* =========================================================
   Reduced Motion
   ========================================================= */

@media (
  prefers-reduced-motion:
  reduce
) {
  .panel-reveal,
  .cta-motion {
    transform:
      none !important;

    will-change:
      auto !important;
  }
}
</style>
