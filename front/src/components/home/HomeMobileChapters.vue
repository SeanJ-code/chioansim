<template>
  <nav class="mobile-chapters" aria-label="照護故事章節">
    <a v-for="(title, index) in titles" :key="title"
      :href="index === 0 ? '#home-mobile-start' : `#care-scene-0${index + 1}`"
      :aria-label="`${index + 1}・${title}`" :aria-current="index + 1 === current ? 'step' : undefined">
      <span aria-hidden="true"></span>
    </a>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ current: number }>();
const titles = ['照顧，不必一個人扛', '今天的幫忙', '準備午餐', '享用午餐', '飯後時光', '整理生活', '外出走走', '安心道別'];
</script>

<style scoped>
.mobile-chapters { display: none; }
@media (max-width: 599px) {
  .mobile-chapters { display: flex; justify-content: center; margin-top: auto; padding-top: 12px; }
  .mobile-chapters a { flex: 0 1 44px; min-width: 32px; height: 44px; display: grid; place-items: center; border-radius: 50%; }
  .mobile-chapters span { width: 7px; height: 7px; border-radius: 50%; background: #d9c9bd; }
  .mobile-chapters [aria-current] span { background: #b84916; width: 9px; height: 9px; }
  .mobile-chapters a:focus-visible { outline: 2px solid #b84916; outline-offset: -3px; }
}
</style>
