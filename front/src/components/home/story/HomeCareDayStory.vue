<template>
  <section
    ref="root"
    class="care-day-story"
    aria-label="一天的照護故事"
  >
    <!--
      Scene 01
      Opening 結束後直接靜態顯示。
      不建立任何 GSAP / ScrollTrigger 動畫。
    -->
    <CareStoryScene :scene="scene01Data" />

    <!-- Scene 02 -->
    <CareStoryScene :scene="scene02Data" />

    <!--
      Scene 03 ~ 06
      Desktop：
      垂直滾動控制水平換幕。

      Tablet / Mobile：
      維持一般垂直排列。
    -->
    <section
      ref="horizontalSection"
      class="horizontal-story"
      aria-label="照護日常"
    >
      <div class="horizontal-story__viewport">
        <div
          ref="horizontalTrack"
          class="horizontal-story__track"
        >
          <CareStoryScene
            v-for="scene in horizontalScenes"
            :key="scene.id"
            :scene="scene"
          />
        </div>

        <div
          class="horizontal-story__indicator"
          aria-hidden="true"
        >
          <span
            v-for="scene in horizontalScenes"
            :key="scene.id"
            :class="{
              'is-active': activeHorizontalScene === scene.id,
            }"
          />
        </div>
      </div>
    </section>

    <!--
      Scene 07
      Horizontal story 結束後，
      恢復正常垂直故事。
    -->
    <CareStoryScene :scene="scene07Data">
      <template #progress>
        <div
          class="scene-progress"
          data-progress-route
        >
          <p class="scene-progress-caption">
            服務進度示意・每一步，都讓家人安心
          </p>

          <div class="scene-progress-route">
            <div>
              <UserRoundCheck :size="44" />
              <span>居服員</span>
            </div>

            <div class="scene-progress-line">
              <i></i>
              <span class="route-dot"></span>
            </div>

            <div>
              <HouseHeart :size="46" />
              <span>家</span>
            </div>
          </div>

          <ol class="scene-progress-steps">
            <li
              v-for="item in progressSteps"
              :key="item.label"
            >
              <component
                :is="item.icon"
                :size="24"
              />

              <span>
                {{ item.label }}
              </span>
            </li>
          </ol>
        </div>
      </template>
    </CareStoryScene>

    <!-- Scene 08 -->
    <CareStoryScene :scene="scene08Data">
      <template #ending>
        <div class="scene-ending-cta">
          <p class="scene-ending-eyebrow">
            一直都在
          </p>

          <h3>
            照顧的路上，<br />
            有人陪你一起。
          </h3>

          <p>
            照顧不孤單，我們一直都在。
          </p>

          <div class="scene-ending-actions">
            <router-link to="/caregivers">
              找居服員
              <ArrowRight :size="20" />
            </router-link>

            <button
              type="button"
              @click="emit('line')"
            >
              不熟悉網站？請 LINE 專人協助
            </button>
          </div>
        </div>
      </template>
    </CareStoryScene>
  </section>
</template>

<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';

import {
  ArrowRight,
  HouseHeart,
  UserRoundCheck,
} from '@lucide/vue';

import {
  gsap,
  ScrollTrigger,
} from '@/composables/useGsap';

import CareStoryScene from './CareStoryScene.vue';

import scene01 from '@/assets/home-world/story/scene-01.webp';
import scene02 from '@/assets/home-world/story/scene-02.webp';
import scene03 from '@/assets/home-world/story/scene-03.webp';
import scene04 from '@/assets/home-world/story/scene-04.webp';
import scene05 from '@/assets/home-world/story/scene-05.webp';
import scene06 from '@/assets/home-world/story/scene-06.webp';
import scene07 from '@/assets/home-world/story/scene-07.webp';
import scene08 from '@/assets/home-world/story/scene-08.webp';

type SceneLayout =
  | 'hero'
  | 'split'
  | 'cinematic'
  | 'reverse'
  | 'detail'
  | 'work'
  | 'outdoor'
  | 'ending';

interface CareScene {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  layout: SceneLayout;
  objectPosition?: string;
  mobileImage?: string;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  mobileScale?: number;
}

defineProps<{
  progressSteps: Array<{
    label: string;
    icon: any;
  }>;
}>();

const emit = defineEmits<{
  line: [];
}>();

/*
 * ==========================================================
 * Story Data
 * ==========================================================
 */

const scenes: CareScene[] = [
  {
    id: '01',
    label: '抵達的家',
    title: '今天的陪伴，從家門口開始。',
    description: '熟悉彼此，也準備開始今天的照顧。',
    image: scene01,
    alt: '居服員在玄關替長者整理衣領，虎斑貓好奇地在旁觀察',
    layout: 'hero',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: 'center',
    mobileScale: 1,
  },

  {
    id: '02',
    label: '開始陪伴',
    title: '今天，需要哪一種幫忙？',
    description: '照顧不只是一件事，而是生活裡每天不同的需要。',
    image: scene02,
    alt: '居服員與長者在客廳喝茶聊天，虎斑貓霸佔沙發前最舒服的位置',
    layout: 'split',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: '55% center',
    mobileScale: 1,
  },

  {
    id: '03',
    label: '準備午餐',
    title: '一起準備午餐。',
    description: '一餐熱騰騰的飯，也是每天的安心。',
    image: scene03,
    alt: '居服員與長者一起在廚房準備午餐，虎斑貓靠近聞香',
    layout: 'cinematic',
    objectPosition: '43% center',
    desktopObjectPosition: '43% center',
    mobileObjectPosition: '48% center',
    mobileScale: 1,
  },

  {
    id: '04',
    label: '享用午餐',
    title: '一起享用午餐。',
    description: '一頓飯，也是一段陪伴。',
    image: scene04,
    alt: '居服員替正在用餐的長者盛菜，虎斑貓在餐桌旁探頭',
    layout: 'reverse',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: '52% center',
    mobileScale: 1,
  },

  {
    id: '05',
    label: '飯後時光',
    title: '飯後，喝杯茶聊聊天。',
    description: '有些照顧，只是有人願意坐下來聽。',
    image: scene05,
    alt: '居服員與長者在客廳喝茶聊天，虎斑貓在沙發旁休息',
    layout: 'detail',
    objectPosition: '38% center',
    desktopObjectPosition: '38% center',
    mobileObjectPosition: '58% center',
    mobileScale: 1,
  },

  {
    id: '06',
    label: '整理生活',
    title: '一起整理生活。',
    description: '需要幫忙的地方有人接手，也保留自己能做的事。',
    image: scene06,
    alt: '居服員與長者一起摺衣服，虎斑貓守著洗衣籃',
    layout: 'work',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: '55% center',
    mobileScale: 1,
  },

  {
    id: '07',
    label: '外出走走',
    title: '陪奶奶走出家門。',
    description: '外面的世界，也有人陪你一起。',
    image: scene07,
    alt: '居服員陪拿著手杖的長者走出家門，虎斑貓停在門檻內',
    layout: 'outdoor',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: '50% center',
    mobileScale: 1,
  },

  {
    id: '08',
    label: '安心道別',
    title: '今天的服務結束了。',
    description: '照顧告一段落，安心沒有離開。',
    image: scene08,
    alt: '傍晚長者在門口向準備離開的居服員揮手，虎斑貓在牆頭目送',
    layout: 'ending',
    objectPosition: 'center',
    desktopObjectPosition: 'center',
    mobileObjectPosition: '50% center',
    mobileScale: 1,
  },
];

/*
 * ==========================================================
 * Scene Groups
 * ==========================================================
 */

const scene01Data = scenes[0]!;
const scene02Data = scenes[1]!;

const horizontalScenes = scenes.slice(2, 6);

const scene07Data = scenes[6]!;
const scene08Data = scenes[7]!;

/*
 * ==========================================================
 * DOM Refs
 * ==========================================================
 */

const root = ref<HTMLElement>();

const horizontalSection =
  ref<HTMLElement>();

const horizontalTrack =
  ref<HTMLElement>();

const activeHorizontalScene =
  ref('03');

let context:
  | gsap.Context
  | undefined;

let media:
  | gsap.MatchMedia
  | undefined;

/*
 * ==========================================================
 * GSAP
 * ==========================================================
 */

onMounted(() => {
  if (!root.value) return;

  context = gsap.context(() => {
    media = gsap.matchMedia();

    /*
     * ======================================================
     * Desktop
     * Scene03 ~ Scene06 Horizontal Story
     * ======================================================
     *
     * Scene01 完全不進入這裡。
     *
     * Scene03 到達 viewport：
     * → pin
     *
     * 使用者仍然上下滾動，
     * 但畫面水平往左移。
     *
     * 往上滾時：
     * scrub 自動 reverse。
     */
    media.add(
      '(min-width: 901px) and (prefers-reduced-motion: no-preference)',
      () => {
        const section =
          horizontalSection.value;

        const track =
          horizontalTrack.value;

        if (!section || !track) {
          return;
        }

        const panels =
          gsap.utils.toArray<HTMLElement>(
            '.horizontal-story__track > .care-scene',
          );

        if (panels.length !== 4) {
          return;
        }

        /*
         * 4 個 Scene：
         *
         * 03
         * 04
         * 05
         * 06
         *
         * 每個都是 100vw。
         */
        gsap.set(track, {
          display: 'flex',
          width: `${panels.length * 100}vw`,
        });

        gsap.set(panels, {
          width: '100vw',
          minWidth: '100vw',
          height: '100vh',
          minHeight: '100vh',
          flex: '0 0 100vw',
        });

        /*
         * 整條 Track 左移 75%。
         *
         * Track 是 400vw，
         * -75% = -300vw。
         *
         * 剛好：
         *
         * Scene03 → Scene04
         * Scene04 → Scene05
         * Scene05 → Scene06
         */
        gsap.to(track, {
          xPercent: -75,

          ease: 'none',

          scrollTrigger: {
            trigger: section,

            /*
             * Scene03 頂端到達 viewport 頂端
             * = 錨點。
             */
            start: 'top top',

            /*
             * 三次換幕。
             *
             * 每一次使用一個 viewport 高度
             * 作為滾動距離。
             */
            end: () =>
              `+=${window.innerHeight * 3}`,

            pin: true,

            /*
             * Scroll 與動畫同步。
             *
             * 往下：
             * 03 → 04 → 05 → 06
             *
             * 往上：
             * 06 → 05 → 04 → 03
             */
            scrub: 0.85,

            anticipatePin: 1,

            /*
             * resize / browser width 改變時
             * 重新計算位置。
             */
            invalidateOnRefresh: true,

            onUpdate(self) {
              const index =
                Math.min(
                  3,
                  Math.round(
                    self.progress * 3,
                  ),
                );

              activeHorizontalScene.value =
                horizontalScenes[index]
                  ?.id ?? '03';
            },
          },
        });
      },
    );

    /*
     * ======================================================
     * Scene02 / Scene07 / Scene08
     * ======================================================
     *
     * 特別注意：
     *
     * Scene01 不在 selector 裡。
     *
     * 所以 Scene01：
     *
     * ❌ 沒有 fade
     * ❌ 沒有 translate
     * ❌ 沒有 scale
     * ❌ 沒有 scrub
     * ❌ 沒有 ScrollTrigger
     *
     * Opening 結束後，
     * Scene01 就是完全靜態畫面。
     */
    media.add(
      '(min-width: 600px) and (prefers-reduced-motion: no-preference)',
      () => {
        const animatedScenes =
          gsap.utils.toArray<HTMLElement>(
            [
              '#care-scene-02',
              '#care-scene-07',
              '#care-scene-08',
            ].join(','),
          );

        animatedScenes.forEach(
          (article) => {
            const id =
              article.dataset.scene;

            const copy =
              article.querySelector<HTMLElement>(
                '.care-scene__copy',
              );

            const image =
              article.querySelector<HTMLElement>(
                '.care-scene__image',
              );

            if (!copy) {
              return;
            }

            /*
             * Scene02、07、08
             * 文字簡單淡入。
             */
            gsap.fromTo(
              copy,
              {
                autoAlpha: 0,
                y: 22,
              },
              {
                autoAlpha: 1,
                y: 0,

                duration: 0.65,

                ease: 'power2.out',

                scrollTrigger: {
                  trigger: article,

                  start: 'top 78%',

                  toggleActions:
                    'play none none reverse',
                },
              },
            );

            /*
             * Scene08 Ending：
             * 保留很輕微的 zoom。
             *
             * Scene01 完全沒有這個效果。
             */
            if (
              id === '08' &&
              image
            ) {
              gsap.fromTo(
                image,
                {
                  scale: 1,
                },
                {
                  scale: 1.02,

                  ease: 'none',

                  scrollTrigger: {
                    trigger: article,

                    start:
                      'top 80%',

                    end:
                      'bottom 20%',

                    scrub: 0.8,
                  },
                },
              );
            }
          },
        );

        /*
         * ==================================================
         * Scene07 Progress
         * ==================================================
         */
        gsap
          .timeline({
            scrollTrigger: {
              trigger:
                '#care-scene-07',

              start:
                'top 70%',

              end:
                'bottom 35%',

              scrub: 0.8,
            },
          })
          .fromTo(
            '.scene-progress-line i',
            {
              scaleX: 0,
            },
            {
              scaleX: 1,

              ease: 'none',
            },
            0,
          )
          .fromTo(
            '.route-dot',
            {
              left: '0%',
            },
            {
              left: '100%',

              ease: 'none',
            },
            0,
          );
      },
    );

    /*
     * ======================================================
     * Reduced Motion
     * ======================================================
     */
    media.add(
      '(prefers-reduced-motion: reduce)',
      () => {
        gsap.set(
          '.scene-progress-line i',
          {
            scaleX: 1,
          },
        );

        gsap.set(
          '.route-dot',
          {
            left: '100%',
          },
        );
      },
    );
  }, root.value);

  /*
   * 等 DOM/layout 完成後
   * 再 refresh ScrollTrigger。
   */
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
});

/*
 * ==========================================================
 * Cleanup
 * ==========================================================
 */

onBeforeUnmount(() => {
  media?.revert();
  context?.revert();
});
</script>

<style scoped>
/* ==========================================================
   Root
   ========================================================== */

.care-day-story {
  position: relative;

  background: #fff9f5;
}

/*
 * Scene01 沒有任何 transition / animation。
 *
 * Opening 結束後，
 * 直接穩定呈現 Scene01。
 */
.care-day-story
  :deep(#care-scene-01),
.care-day-story
  :deep(#care-scene-01 .care-scene__image),
.care-day-story
  :deep(#care-scene-01 .care-scene__copy) {
  animation: none !important;

  transition: none !important;
}

/* ==========================================================
   Scene03 ~ Scene06
   Horizontal Story
   ========================================================== */

.horizontal-story {
  position: relative;

  width: 100%;

  height: 100vh;

  overflow: hidden;

  background: #fff9f5;
}

.horizontal-story__viewport {
  position: relative;

  width: 100%;

  height: 100vh;

  overflow: hidden;
}

.horizontal-story__track {
  display: flex;

  width: 400vw;

  height: 100vh;
}

.horizontal-story__track
  :deep(.care-scene) {
  width: 100vw;

  min-width: 100vw;

  height: 100vh;

  min-height: 100vh;

  flex:
    0 0 100vw;
}

.horizontal-story__track
  :deep(.care-scene__media) {
  height: 100%;
}

/* ==========================================================
   Horizontal Indicator
   ========================================================== */

.horizontal-story__indicator {
  position: absolute;

  z-index: 8;

  left: 50%;

  bottom: 24px;

  display: flex;

  align-items: center;

  gap: 8px;

  transform:
    translateX(-50%);

  pointer-events: none;
}

.horizontal-story__indicator span {
  width: 7px;

  height: 7px;

  background:
    rgba(
      255,
      255,
      255,
      0.55
    );

  border-radius:
    999px;

  transition:
    width 0.25s ease,
    background 0.25s ease;
}

.horizontal-story__indicator
  span.is-active {
  width: 24px;

  background: #fff;
}

/* ==========================================================
   Scene07 Progress
   ========================================================== */

.scene-progress {
  margin-top: 32px;

  color: #fff;
}

.scene-progress-caption {
  font-size: 0.9rem;

  line-height: 1.6;
}

.scene-progress-route {
  display: grid;

  grid-template-columns:
    auto
    1fr
    auto;

  align-items: center;

  gap: 20px;
}

.scene-progress-route
  > div:not(.scene-progress-line) {
  display: grid;

  place-items: center;

  gap: 4px;

  font-weight: 700;
}

.scene-progress-line {
  position: relative;

  height: 4px;

  background:
    rgba(
      255,
      255,
      255,
      0.4
    );
}

.scene-progress-line i {
  position: absolute;

  inset: 0;

  background: #fff;

  transform-origin: left;
}

.route-dot {
  position: absolute;

  left: 0;

  top: 50%;

  width: 16px;

  height: 16px;

  background: #fff;

  border-radius: 50%;

  transform:
    translate(
      -50%,
      -50%
    );
}

.scene-progress-steps {
  display: flex;

  justify-content:
    space-between;

  flex-wrap: wrap;

  gap: 12px;

  margin:
    22px
    0
    0;

  padding: 0;

  list-style: none;
}

.scene-progress-steps li {
  display: flex;

  align-items: center;

  gap: 6px;

  color: #fff;

  font-size: 0.85rem;
}

/* ==========================================================
   Scene08 Ending
   ========================================================== */

.scene-ending-cta {
  margin-top: 34px;
}

.scene-ending-eyebrow {
  font-size: 0.82rem;

  font-weight: 800;

  letter-spacing:
    0.18em;
}

.scene-ending-cta h3 {
  margin:
    10px
    0;

  font-family:
    'Kaiti TC',
    'Songti TC',
    serif;

  font-size:
    clamp(
      1.8rem,
      3.2vw,
      3.4rem
    );

  line-height: 1.4;
}

.scene-ending-actions {
  display: flex;

  align-items: center;

  flex-wrap: wrap;

  gap: 14px;

  margin-top: 26px;
}

.scene-ending-actions a,
.scene-ending-actions button {
  min-height: 50px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  padding:
    0
    22px;

  color: #fff;

  background: transparent;

  border-radius:
    999px;

  text-decoration:
    none;

  font: inherit;

  font-weight: 700;

  cursor: pointer;
}

.scene-ending-actions a {
  background:
    #b84916;

  border:
    1px
    solid
    #b84916;
}

.scene-ending-actions button {
  padding-block:
    12px;

  border:
    1px
    solid
    #fff;

  line-height: 1.6;
}

/* ==========================================================
   Tablet / Mobile
   ========================================================== */

@media (max-width: 900px) {
  /*
   * Tablet / Mobile 不使用
   * Desktop horizontal pin。
   */
  .horizontal-story {
    height: auto;

    overflow: visible;
  }

  .horizontal-story__viewport {
    height: auto;

    overflow: visible;
  }

  .horizontal-story__track {
    display: block;

    width:
      100% !important;

    height: auto;

    transform:
      none !important;
  }

  .horizontal-story__track
    :deep(.care-scene) {
    width: 100%;

    min-width: 0;

    height: auto;

    min-height: auto;
  }

  .horizontal-story__indicator {
    display: none;
  }

  .scene-progress {
    margin-top: 24px;
  }

  .scene-progress-route svg {
    width: 34px;
  }

  .scene-progress-steps li {
    display: grid;

    place-items: center;

    text-align: center;

    font-size: 0.68rem;
  }

  .scene-progress-steps svg {
    width: 18px;
  }

  .scene-ending-cta {
    margin-top: 24px;
  }

  .scene-ending-actions {
    align-items: stretch;

    flex-direction:
      column;
  }

  .scene-ending-actions a,
  .scene-ending-actions button {
    width: 100%;
  }
}

/* ==========================================================
   Mobile
   ========================================================== */

@media (max-width: 599px) {
  .scene-progress {
    order: 4;

    margin: 0;

    padding:
      16px
      12px;

    color: #fff;

    background:
      #344d40;

    border-radius:
      0
      0
      12px
      12px;
  }

  .scene-progress-caption {
    margin:
      0
      0
      12px;

    font-size:
      13px;
  }

  .scene-progress-route {
    gap: 16px;
  }

  .scene-progress-route svg {
    width: 24px;

    height: 24px;
  }

  .scene-progress-route
    > div:not(.scene-progress-line) {
    font-size: 12px;
  }

  .scene-progress-line i {
    transform:
      scaleX(1) !important;
  }

  .scene-progress-steps {
    flex-wrap: nowrap;

    gap: 6px;

    margin-top:
      14px;
  }

  .scene-progress-steps li {
    flex: 1;

    min-width: 0;

    font-size:
      12px;

    line-height:
      1.5;
  }

  .scene-ending-cta {
    order: 4;

    margin-top:
      16px;

    text-align:
      center;
  }

  .scene-ending-eyebrow,
  .scene-ending-cta
    > p:not(.scene-ending-eyebrow) {
    display: none;
  }

  .scene-ending-cta h3 {
    margin: 0;

    font-size:
      24px;

    line-height:
      1.5;
  }

  .scene-ending-actions {
    gap: 10px;

    margin-top:
      14px;
  }

  .scene-ending-actions a,
  .scene-ending-actions button {
    min-height:
      48px;

    padding:
      10px
      12px;

    font-size:
      16px;
  }

  .scene-ending-actions button {
    color:
      var(--ink);

    background:
      var(--paper);

    border-color:
      #8e786b;
  }
}

/* ==========================================================
   Reduced Motion
   ========================================================== */

@media (
  prefers-reduced-motion: reduce
) {
  .horizontal-story {
    height: auto;

    overflow: visible;
  }

  .horizontal-story__viewport {
    height: auto;

    overflow: visible;
  }

  .horizontal-story__track {
    display: block;

    width:
      100% !important;

    height: auto;

    transform:
      none !important;
  }

  .horizontal-story__track
    :deep(.care-scene) {
    width: 100%;

    min-width: 0;

    height: auto;

    min-height:
      100vh;
  }

  .horizontal-story__indicator {
    display: none;
  }
}
</style>
