<!-- src/components/BoringAvatar.vue -->
<template>
  <div class="boring-avatar-wrapper" :style="{ width: `${computedSize}px`, height: `${computedSize}px` }">
    <svg
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <mask id="mask__beam_maya" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
        <rect width="36" height="36" rx="72" fill="#FFFFFF" />
      </mask>
      <g mask="url(#mask__beam_maya)">
        <!-- 1. 背景底色 -->
        <rect width="36" height="36" :fill="data.backgroundColor" />

        <!-- 2. Maya 特有的半圓/斜切色塊 -->
        <rect
          x="0"
          y="0"
          width="36"
          height="36"
          :transform="`translate(${data.wrapperTranslateX} ${data.wrapperTranslateY}) rotate(${data.wrapperRotate} 18 18) scale(${data.wrapperScale})`"
          :fill="data.wrapperColor"
          :rx="data.isCircle ? 36 : 5"
        />

        <!-- 3. Maya 專屬五官 (大微笑 + 傾斜角) -->
        <g :transform="`translate(${data.faceTranslateX} ${data.faceTranslateY}) rotate(${data.faceRotate} 18 18)`">
          <!-- 嘴巴：Maya 特有的露齒大微笑弧線 -->
          <path
            v-if="data.isMaya"
            d="M13 19c0 3 2.5 5 5 5s5-2 5-5H13z"
            :fill="data.faceColor"
          />
          <path
            v-else-if="data.isMouthOpen"
            :d="`M15 ${19 + data.mouthY}c2 1 4 1 6 0`"
            :stroke="data.faceColor"
            stroke-width="1.5"
            stroke-linecap="round"
            fill="none"
          />
          <path
            v-else
            :d="`M13 ${19 + data.mouthY}a1 1 0 0010 0`"
            :fill="data.faceColor"
          />

          <!-- 雙眼 -->
          <circle :cx="14 + data.eyeX" :cy="14 + data.eyeY" r="1.6" :fill="data.faceColor" />
          <circle :cx="22 + data.eyeX" :cy="14 + data.eyeY" r="1.6" :fill="data.faceColor" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: {
    type: [String, Object],
    default: 'Maya'
  },
  size: {
    type: [Number, String],
    default: 76
  },
  colors: {
    type: Array,
    default: () => ["#de4c45", "#d9764d", "#cc9e8a", "#c1c5c7", "#ebdfc6"]
  }
});

const computedSize = computed(() => Number(props.size) || 76);

const safeName = computed(() => {
  if (typeof props.name === 'object' && props.name !== null) {
    return props.name.name || props.name.username || props.name.account || 'Maya';
  }
  return String(props.name || 'Maya');
});

const getNumber = (name, index) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash + index);
};

const data = computed(() => {
  const name = safeName.value;
  const isMaya = name.toLowerCase() === 'maya';

  const palette = props.colors && props.colors.length > 0
    ? props.colors
    : ["#de4c45", "#d9764d", "#cc9e8a", "#c1c5c7", "#ebdfc6"];

  const numFromName = getNumber(name, 1);
  const numFromName2 = getNumber(name, 2);

  // 配色：背景用米白/暖色，色塊用活力珊瑚紅，五官用焦黑/深色
  const backgroundColor = isMaya ? (palette[4] || "#ebdfc6") : palette[numFromName % palette.length];
  const wrapperColor = isMaya ? (palette[0] || "#de4c45") : palette[(numFromName + 1) % palette.length];
  const faceColor = isMaya ? "#2b2b2b" : (palette[(numFromName + 2) % palette.length] || "#2b2b2b");

  // Maya 專屬的斜切旋轉角與五官位置
  const wrapperRotate = isMaya ? 45 : (numFromName % 360);
  const wrapperTranslateX = isMaya ? -2 : ((numFromName % 10) - 5);
  const wrapperTranslateY = isMaya ? 3 : ((numFromName % 10) - 5);
  const wrapperScale = isMaya ? 1.2 : (1 + (numFromName % 10) / 10);
  const isCircle = isMaya ? true : (numFromName % 2 === 0);

  const faceRotate = isMaya ? -8 : ((numFromName2 % 30) - 15);
  const faceTranslateX = isMaya ? 1 : ((numFromName2 % 6) - 3);
  const faceTranslateY = isMaya ? 1 : ((numFromName2 % 6) - 3);
  const eyeX = isMaya ? 0 : ((numFromName2 % 4) - 2);
  const eyeY = isMaya ? 0 : ((numFromName2 % 4) - 2);
  const mouthY = (numFromName2 % 2);
  const isMouthOpen = numFromName2 % 2 === 0;

  return {
    isMaya,
    backgroundColor,
    wrapperColor,
    faceColor,
    wrapperRotate,
    wrapperTranslateX,
    wrapperTranslateY,
    wrapperScale,
    isCircle,
    faceRotate,
    faceTranslateX,
    faceTranslateY,
    eyeX,
    eyeY,
    mouthY,
    isMouthOpen
  };
});
</script>

<style scoped>
.boring-avatar-wrapper {
  display: inline-block;
  border-radius: 50%;
  overflow: hidden;
  vertical-align: middle;
}
</style>
