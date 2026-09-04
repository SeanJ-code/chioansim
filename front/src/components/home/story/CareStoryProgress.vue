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

<style scoped>
.care-progress{position:fixed;z-index:20;right:clamp(10px,1.5vw,24px);top:50%;transform:translateY(-50%)}.care-progress__desktop{display:grid;gap:3px;margin:0;padding:8px;list-style:none;background:#fffdfba8;border-radius:14px;backdrop-filter:blur(8px)}.care-progress__desktop a{min-height:28px;display:flex;align-items:center;justify-content:flex-end;gap:7px;color:#6e5750;text-decoration:none;font-size:.68rem;opacity:.22;transition:opacity .2s ease}.care-progress__desktop a.is-active,.care-progress__desktop .is-active a{opacity:1}.care-progress__desktop i{width:7px;height:7px;background:#c85618;border-radius:50%;transform:scale(.65);transition:transform .2s ease}.care-progress__desktop .is-active i{transform:scale(1)}.care-progress__mobile{display:none}
@media(max-width:900px){.care-progress{right:12px;top:auto;bottom:12px;transform:none}.care-progress__desktop{display:none}.care-progress__mobile{display:flex;gap:8px;margin:0;padding:8px 11px;color:#493833;background:#fffdfbe8;border:1px solid #6e57501f;border-radius:12px;box-shadow:0 8px 24px #49383319;backdrop-filter:blur(8px);font-size:.78rem}.care-progress__mobile b{color:#c85618}.care-progress__mobile time::before{content:'· ';color:#6e5750}}
</style>
