<template>
  <article
    :id="`care-scene-${scene.id}`"
    class="care-scene"
    :class="`care-scene--${scene.layout}`"
    :data-scene="scene.id"
    :aria-labelledby="`care-scene-title-${scene.id}`"
  >
    <div class="care-scene__media">
      <picture class="care-scene__picture">
        <source
          v-if="scene.mobileImage"
          media="(max-width:599px)"
          :srcset="scene.mobileImage"
        />

        <img
          class="care-scene__image"
          :src="scene.image"
          :alt="scene.alt"
          :style="{
            '--desktop-position':
              scene.desktopObjectPosition ??
              scene.objectPosition ??
              'center',

            '--mobile-position':
              scene.mobileObjectPosition ??
              scene.objectPosition ??
              'center',
          }"
          :loading="
            ['01', '02', '03'].includes(scene.id)
              ? 'eager'
              : 'lazy'
          "
          width="1672"
          height="941"
          decoding="async"
        />
      </picture>

      <div class="care-scene__overlay"></div>
    </div>

    <div class="care-scene__copy">
      <div class="care-scene__meta">
        <span class="care-scene__number">
          {{ scene.id }}
        </span>

        <span>{{ scene.label }}</span>
      </div>

      <h2 :id="`care-scene-title-${scene.id}`">
        {{ scene.title }}
      </h2>

      <p>{{ scene.description }}</p>

      <div
        v-if="scene.id === '02'"
        class="care-scene__hints"
        aria-label="常見照護需求"
      >
        <span>
          <CookingPot :size="20" />
          備餐
        </span>

        <span>
          <MessagesSquare :size="20" />
          陪伴
        </span>

        <span>
          <Shirt :size="20" />
          家務
        </span>

        <span>
          <Footprints :size="20" />
          外出
        </span>
      </div>

      <slot
        v-if="scene.id === '07'"
        name="progress"
      />

      <slot
        v-if="scene.id === '08'"
        name="ending"
      />
    </div>

    <HomeMobileChapters
      v-if="showMobileChapters"
      :current="Number(scene.id)"
    />
  </article>
</template>

<script setup lang="ts">
import HomeMobileChapters from '../HomeMobileChapters.vue';

import {
  CookingPot,
  Footprints,
  MessagesSquare,
  Shirt,
} from '@lucide/vue';

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

withDefaults(
  defineProps<{
    scene: CareScene;
    showMobileChapters?: boolean;
  }>(),
  {
    showMobileChapters: true,
  },
);
</script>

<style scoped>
.care-scene {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: var(--ink);
  background: var(--milk);
  scroll-margin-top: 76px;
}

.care-scene__media {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.care-scene__picture {
  display: block;
  width: 100%;
  height: 100%;
}

.care-scene__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--desktop-position);
  backface-visibility: hidden;
}

.care-scene__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      #fff9f5f5 0%,
      #fff9f5d9 23%,
      #fff9f580 38%,
      transparent 62%
    );
}

.care-scene__copy {
  width: 100%;
  padding: 72px clamp(28px, 6vw, 112px);
}

.care-scene__copy > * {
  max-width: 410px;
}

.care-scene__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  color: var(--chestnut);
  font-size: 1rem;
  letter-spacing: 0.12em;
}

.care-scene__number {
  color: var(--persimmon);
  font-size: 1.5rem;
}

.care-scene h2 {
  margin: 0 0 22px;
  font-family: 'Kaiti TC', 'Songti TC', serif;
  font-size: clamp(2rem, 3.3vw, 3.6rem);
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0.025em;
  text-wrap: balance;
}

.care-scene__copy > p {
  max-width: 300px;
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.9;
}

.care-scene__hints {
  display: flex;
  gap: 26px;
  margin-top: 28px;
}

.care-scene__hints span {
  display: grid;
  gap: 10px;
  justify-items: center;
  color: #a94216;
  font-size: 0.95rem;
}

.care-scene--outdoor,
.care-scene--ending {
  align-items: flex-end;
  color: var(--paper);
}

.care-scene--outdoor .care-scene__overlay {
  background:
    linear-gradient(
      0deg,
      #243e35ed,
      transparent 85%
    );
}

.care-scene--ending .care-scene__overlay {
  background:
    linear-gradient(
      90deg,
      #32231be6,
      #32231b70 45%,
      transparent 75%
    );
}

.care-scene--outdoor .care-scene__meta,
.care-scene--ending .care-scene__meta,
.care-scene--outdoor .care-scene__number,
.care-scene--ending .care-scene__number {
  color: var(--paper);
}

.care-scene--outdoor .care-scene__copy > *,
.care-scene--ending .care-scene__copy > * {
  max-width: 560px;
}

/*
 * Tablet
 */
@media (max-width: 900px) {
  .care-scene {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
  }

  .care-scene__media {
    position: relative;
    inset: auto;
    z-index: 0;
    width: 100%;
    flex: 1;
    min-height: 50svh;
  }

  .care-scene__picture {
    position: absolute;
    inset: 0;
  }

  .care-scene__image {
    object-position: var(--mobile-position);
  }

  .care-scene__overlay {
    background:
      linear-gradient(
        0deg,
        #fff9f5,
        transparent 28%
      );
  }

  .care-scene__copy {
    padding: 28px 28px 56px;
  }

  .care-scene__copy > * {
    max-width: 560px;
  }

  .care-scene h2 {
    margin-bottom: 14px;
    font-size: clamp(2rem, 5vw, 3rem);
  }

  .care-scene__meta {
    margin-bottom: 16px;
  }

  .care-scene__copy > p {
    max-width: 400px;
    font-size: 1rem;
  }

  .care-scene--outdoor {
    background: #293f35;
  }

  .care-scene--ending {
    background: #38291f;
  }

  .care-scene--outdoor .care-scene__overlay {
    background:
      linear-gradient(
        0deg,
        #293f35,
        transparent 35%
      );
  }

  .care-scene--ending .care-scene__overlay {
    background:
      linear-gradient(
        0deg,
        #38291f,
        transparent 35%
      );
  }
}

/*
 * Mobile：繪本卡片閱讀。
 *
 * 注意：
 * Scene01 不再 display:none。
 */
@media (max-width: 599px) {
  .care-scene {
    min-height: calc(100svh - 68px);
    padding:
      24px
      20px
      calc(12px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    color: var(--ink);
    background: var(--milk);
    scroll-margin-top: 68px;
  }

  .care-scene__copy {
    display: contents;
  }

  .care-scene__copy > * {
    max-width: none;
  }

  .care-scene__meta {
    order: 0;
    margin: 0 0 4px;
    letter-spacing: 0;
  }

  .care-scene__meta > span:last-child {
    display: none;
  }

  .care-scene__number,
  .care-scene--outdoor .care-scene__number,
  .care-scene--ending .care-scene__number {
    color: var(--ink);
    font-size: 22px;
  }

  .care-scene h2 {
    order: 1;
    margin: 0 0 12px;
    font-size: clamp(27px, 7.6vw, 34px);
    line-height: 1.4;
    text-wrap: initial;
  }

  .care-scene__copy > p {
    order: 2;
    max-width: 22em;
    margin: 0 0 20px;
    color: var(--chestnut);
    font-size: 16px;
    line-height: 1.7;
  }

  .care-scene__media {
    order: 3;
    position: relative;
    width: 100%;
    height: auto;
    min-height: 0;
    flex: none;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: 12px;
  }

  .care-scene__picture {
    position: static;
    width: 100%;
    height: 100%;
  }

  .care-scene__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: var(--mobile-position);
    transform: none !important;
  }

  .care-scene__overlay {
    display: none;
  }

  .care-scene__hints {
    order: 4;
    justify-content: space-around;
    gap: 8px;
    margin: 18px 0 8px;
  }

  .care-scene__hints span {
    gap: 8px;
    color: var(--ink);
    font-size: 15px;
  }

  .care-scene__hints svg {
    box-sizing: content-box;
    padding: 12px;
    color: #b84916;
    background: var(--paper);
    border-radius: 50%;
  }

  .mobile-chapters {
    order: 6;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .care-scene__image {
    transform: none !important;
  }
}
</style>
