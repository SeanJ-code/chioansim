<template>
  <router-view v-slot="{ Component, route }">
    <transition name="page-soft" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<style>
.page-soft-enter-active,
.page-soft-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-soft-enter-from { opacity: 0; transform: translateY(7px); }
.page-soft-leave-to { opacity: 0; transform: translateY(-5px); }
@media (prefers-reduced-motion: reduce) {
  .page-soft-enter-active,
  .page-soft-leave-active { transition: none; }
}
</style>
