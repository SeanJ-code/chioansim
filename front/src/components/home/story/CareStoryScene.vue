<template>
  <article :id="`care-scene-${scene.id}`" class="care-scene" :class="`care-scene--${scene.layout}`" :data-scene="scene.id" :aria-labelledby="`care-scene-title-${scene.id}`">
    <div class="care-scene__media">
      <img class="care-scene__image" :src="scene.image" :alt="scene.alt" :style="{ objectPosition: scene.objectPosition }" :loading="scene.id === '01' ? 'eager' : 'lazy'" decoding="async">
    </div>
    <div class="care-scene__copy">
      <div class="care-scene__meta"><span class="care-scene__number">{{ scene.id }}</span><time class="care-scene__time">{{ scene.time }}</time></div>
      <h2 :id="`care-scene-title-${scene.id}`" class="care-scene__title">{{ scene.title }}</h2>
      <p class="care-scene__description">{{ scene.description }}</p>
      <div v-if="scene.id === '02'" class="care-scene__hints" aria-label="常見照護需求">
        <span><CookingPot :size="20" />備餐</span><span><MessagesSquare :size="20" />陪伴</span><span><Shirt :size="20" />家務</span><span><Footprints :size="20" />外出</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { CookingPot, Footprints, MessagesSquare, Shirt } from '@lucide/vue';
type SceneLayout = 'hero' | 'split' | 'cinematic' | 'reverse' | 'detail' | 'work' | 'outdoor' | 'ending';
interface CareScene { id: string; time: string; title: string; description: string; image: string; alt: string; layout: SceneLayout; objectPosition?: string }
defineProps<{ scene: CareScene }>();
</script>
