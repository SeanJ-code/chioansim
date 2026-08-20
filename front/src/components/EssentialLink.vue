<template>
  <q-item clickable :to="link">
   <q-item-section v-if="icon" avatar>
  <i :class="icon" class="essential-link-icon" aria-hidden="true"></i>
</q-item-section>
    <q-item-section>
      <q-item-label>{{ label }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
export interface EssentialLinkProps {
  label: string;
  caption?: string;
  link: string;
  icon?: string;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  icon: '',
});
</script>
<style scoped>
.essential-link-icon {
  font-size: 24px;
  line-height: 1;
}
</style>
