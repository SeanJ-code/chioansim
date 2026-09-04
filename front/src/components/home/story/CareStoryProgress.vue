<template>
  <nav class="care-progress" aria-label="一天照護故事進度">
    <ol class="care-progress__desktop">
      <li v-for="(item,index) in items" :key="item.id" :class="{ 'is-active': index === active }"><a :href="`#care-scene-${item.id}`" :aria-current="index === active ? 'step' : undefined"><time>{{ item.time }}</time><i aria-hidden="true"></i></a></li>
    </ol>
    <p class="care-progress__mobile" aria-live="polite"><b>{{ current?.id }} / 08</b><time>{{ current?.time }}</time></p>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ items: { id: string; time: string }[]; active: number }>();
const current = computed(() => props.items[props.active]);
</script>
