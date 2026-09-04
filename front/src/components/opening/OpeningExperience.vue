<template>
  <div
    v-if="visible"
    ref="opening"
    class="opening"
    role="dialog"
    aria-label="照安心首頁開場動畫"
  >
    <!--
      主視覺 SVG
      hands-web.svg 會透過 v-html 直接插入
    -->
    <div
      ref="artwork"
      class="opening__artwork"
      role="img"
      aria-label="雙手溫柔擡住長者雙手的線稿"
      v-html="handsSvg"
    ></div>

    <!-- 品牌文案 -->
    <div ref="brand" class="opening__brand">
      <small>CHIOANSIM</small>

      <strong>
        照顧的路上，
        <span>有我們陪你一起。</span>
      </strong>

      <p>
        讓需要幫助的人，找到值得信任的陪伴。
      </p>
    </div>

    <!-- Skip -->
    <button
      class="opening__skip"
      type="button"
      @click="finish(true)"
    >
      skip
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';

import { gsap } from '@/composables/useGsap';

import handsSvg from '@/assets/opening/hands-web.svg?raw';

/* =========================================================
   Emits
========================================================= */

const emit = defineEmits<{
  finished: [];
}>();



/* =========================================================
   DOM refs
========================================================= */

const visible = ref(true);

const opening = ref<HTMLElement>();
const artwork = ref<HTMLElement>();
const brand = ref<HTMLElement>();



/* =========================================================
   GSAP Timeline
========================================================= */

let timeline: gsap.core.Timeline | undefined;
let finished = false;



/* =========================================================
   開發模式設定
========================================================= */

/*
  DEV 模式每次重新整理都播放 Opening，
  Production 則一個 session 只播放一次。
*/
const forceOpening = import.meta.env.DEV;


/*
  URL 加上：

  ?opening-static

  可以讓 Opening 停在完整畫面，
  方便調整 SVG 與 CSS。
*/
const staticDebug =
  import.meta.env.DEV &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('opening-static');



/* =========================================================
   Finish
========================================================= */

function complete() {
  if (finished) return;
  finished = true;
  timeline?.kill();

  sessionStorage.setItem(
    'chioansim-opening-played',
    'true',
  );

  document.documentElement.classList.remove(
    'opening-lock',
  );

  visible.value = false;

  emit('finished');
}

function finish(skipped = false, instant = false) {
  if (finished || !opening.value || instant) return complete();
  timeline?.kill();
  timeline = gsap.timeline({ onComplete: complete }).to(opening.value, {
    clipPath: 'inset(0 0 100% 0)',
    duration: skipped ? 0.45 : 1.2,
    ease: 'power3.inOut',
  });
}



/* =========================================================
   SVG 線條分級
========================================================= */

/*
  目前 SVG 是直接透過 v-html 插入。

  所以這裡依照 path 長度，
  自動分成三個視覺層級：

  1. hand-outline
     主輪廓
     深珊瑚色

  2. hand-secondary
     衣物、中段線條
     暖粉棕

  3. hand-detail
     手紋、皺紋、小細節
     淺蜜桃色

  hands-web.svg 已有人工可覆寫的分類 class，
  這段也不會覆蓋既有分類。
*/

function classifyHandPaths(
  paths: SVGPathElement[],
) {
  const pathData = paths.map((path) => ({
    path,
    length: path.getTotalLength(),
  }));


  /*
    使用全部 path 長度，
    找出約 35% / 72% 的分界。

    相較於直接寫死 100px、300px，
    對 SVG 尺寸與 path 數量更有彈性。
  */
  const lengths = pathData
    .map((item) => item.length)
    .sort((a, b) => a - b);


  const detailIndex = Math.floor(
    lengths.length * 0.35,
  );

  const outlineIndex = Math.floor(
    lengths.length * 0.72,
  );


  const detailLimit =
    lengths[detailIndex] ?? 80;

  const outlineLimit =
    lengths[outlineIndex] ?? 240;


  pathData.forEach(({ path, length }) => {
    /*
      如果 SVG 未來人工指定過分類，
      就保留人工分類。
    */
    if (
      path.classList.contains('hand-outline') ||
      path.classList.contains('hand-detail') ||
      path.classList.contains('hand-secondary')
    ) {
      return;
    }


    if (length >= outlineLimit) {
      path.classList.add('hand-outline');
      return;
    }


    if (length <= detailLimit) {
      path.classList.add('hand-detail');
      return;
    }


    path.classList.add('hand-secondary');
  });
}



/* =========================================================
   Opening Start
========================================================= */

async function start() {
  /*
    Production 模式：

    同一個 session 已播放過 Opening，
    就不重複播放。
  */
  if (
    !forceOpening &&
    sessionStorage.getItem(
      'chioansim-opening-played',
    ) === 'true'
  ) {
    return finish(false, true);
  }


  await nextTick();


  if (
    !opening.value ||
    !artwork.value ||
    !brand.value
  ) {
    return finish(false, true);
  }


  /*
    Opening 顯示期間禁止頁面 Scroll
  */
  document.documentElement.classList.add(
    'opening-lock',
  );


  /*
    取得 SVG 所有 path
  */
  const paths = [
    ...artwork.value.querySelectorAll<SVGPathElement>(
      'path',
    ),
  ];


  if (!paths.length) {
    return finish(false, true);
  }



  /* =======================================================
     SVG 三階顏色分類
  ======================================================= */

  classifyHandPaths(paths);



  /* =======================================================
     Static Debug
  ======================================================= */

  if (staticDebug) {
    gsap.set(
      [
        artwork.value,
        brand.value,
        paths,
      ],
      {
        autoAlpha: 1,
        strokeDashoffset: 0,
      },
    );

    return;
  }



  /* =======================================================
     prefers-reduced-motion
  ======================================================= */

  if (
    matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
  ) {
    gsap.set(
      [
        artwork.value,
        brand.value,
        paths,
      ],
      {
        autoAlpha: 1,
        strokeDashoffset: 0,
      },
    );


    timeline = gsap
      .timeline({
        onComplete: complete,
      })

      /*
        完整畫面停留
      */
      .to(
        {},
        {
          duration: 1,
        },
      )

      /*
        Opening 淡出
      */
      .to(
        opening.value,
        {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.55,
          ease: 'power2.inOut',
        },
      );


    return;
  }



  /* =======================================================
     SVG Path 排序
  ======================================================= */

  /*
    讓描繪方向由：

    右上 → 左下

    形成手慢慢被描繪出來的感覺。
  */

  paths.sort((a, b) => {
    const aa = a.getBBox();
    const bb = b.getBBox();


    const aScore =
      aa.x +
      aa.width / 2 -
      (aa.y + aa.height / 2) * 0.8;


    const bScore =
      bb.x +
      bb.width / 2 -
      (bb.y + bb.height / 2) * 0.8;


    return bScore - aScore;
  });



  /* =======================================================
     Path 初始化
  ======================================================= */

  paths.forEach((path) => {
    const length =
      path.getTotalLength();


    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
      visibility: 'visible',
    });
  });



  /* =======================================================
     Timeline
  ======================================================= */

  timeline = gsap.timeline({
    defaults: {
      ease: 'power2.inOut',
    },

    onComplete: complete,
  });



  timeline

    /* -----------------------------------------------------
       ① Opening 淡入
    ----------------------------------------------------- */

    .fromTo(
      opening.value,

      {
        autoAlpha: 0,
      },

      {
        autoAlpha: 1,
        duration: 0.25,
      },
    )



    /* -----------------------------------------------------
       ② SVG 線稿描繪
    ----------------------------------------------------- */

    .to(
      paths,
      {
        strokeDashoffset: 0,

        duration: 0.1,

        stagger: 0.008,

        ease: 'power1.inOut',
      },
    )



    /* -----------------------------------------------------
       ③ artwork 整體 Reveal
    ----------------------------------------------------- */

    .fromTo(
      artwork.value,

      {
        clipPath:
          'inset(0 0 100% 100%)',
      },

      {
        clipPath:
          'inset(0)',

        duration: 2.2,

        ease: 'power1.inOut',
      },

      '<',
    )



    /* -----------------------------------------------------
       ④ 品牌文案進場
    ----------------------------------------------------- */

    .fromTo(
      brand.value,

      {
        autoAlpha: 0,
        y: 18,
      },

      {
        autoAlpha: 1,
        y: 0,

        duration: 0.6,

        ease: 'power3.out',
      },

      '-=0.15',
    )



    /* -----------------------------------------------------
       ⑤ 情緒停留與手部呼吸
    ----------------------------------------------------- */

    .to(
      {},
      {
        duration: 1.25,
      },
    )

    .to(
      artwork.value,
      {
        scale: 1.012,
        duration: 0.65,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
      },
      '<',
    )



    /* -----------------------------------------------------
       ⑥ Curtain 揭露 Hero
    ----------------------------------------------------- */

    .to(
      opening.value,
      {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1.2,
        ease: 'power3.inOut',
      },
    );
}



/* =========================================================
   Lifecycle
========================================================= */

onMounted(start);


onBeforeUnmount(() => {
  timeline?.kill();

  document.documentElement.classList.remove(
    'opening-lock',
  );
});
</script>



<style scoped>

/* =========================================================
   OPENING ROOT
========================================================= */

.opening {
  position: fixed;

  inset: 0;

  z-index: 9999;

  overflow: hidden;

  width: 100vw;
  height: 100dvh;

  /*
    品牌 Milk
  */
  background:
    var(--milk);
}



/* =========================================================
   SVG ARTWORK
========================================================= */

.opening__artwork {
  position: absolute;

  z-index: 20;

  left: 50%;
  top: 45%;

  width:
    min(
      100vw,
      1536px
    );

  aspect-ratio:
    1536 / 976.44;

  transform:
    translate(
      -50%,
      -50%
    );
}



.opening__artwork :deep(svg) {
  display: block;

  width: 100%;
  height: 100%;

  overflow: visible;
}



/* =========================================================
   所有 SVG PATH 共通樣式
========================================================= */

.opening__artwork :deep(path) {
  visibility: hidden;

  fill: none !important;

  stroke-width: 1.35;

  stroke-linecap: round;

  stroke-linejoin: round;

  vector-effect:
    non-scaling-stroke;
}



/* =========================================================
   手部主輪廓

   最重要、最長的線
========================================================= */

.opening__artwork
:deep(.hand-outline) {
  stroke:
    var(--peach-line);

  /*
    讓主要輪廓稍微比細節清楚
  */
  stroke-width: 1.45;
}



/* =========================================================
   手部細節

   手紋、皺紋、短線條
========================================================= */

.opening__artwork
:deep(.hand-detail) {
  stroke:
    var(--peach-soft);

  stroke-width: 1.05;

  opacity: 0.92;
}



/* =========================================================
   毛衣 / 次要輪廓
========================================================= */

.opening__artwork
:deep(.hand-secondary) {
  stroke:
    var(--peach-secondary);

  stroke-width: 1.2;

  opacity: 0.94;
}



/* =========================================================
   BRAND COPY
========================================================= */

.opening__brand {
  position: absolute;

  z-index: 30;

  left:
    clamp(
      28px,
      6vw,
      96px
    );

  bottom:
    clamp(
      28px,
      5vh,
      60px
    );

  max-width: 540px;

  padding:
    18px 22px;


  visibility: hidden;

  opacity: 0;


  color:
    var(--ink);


  /*
    不再使用厚重白色 Card。

    改為非常淡的 Paper，
    讓文案像浮在畫紙上。
  */
  background:
    rgb(
      255 253 251 / 78%
    );


  /*
    背景模糊，
    讓背後 SVG 還保有存在感。
  */
  backdrop-filter:
    blur(10px);

  -webkit-backdrop-filter:
    blur(10px);


  border:
    1px solid
    rgb(
      235 144 121 / 10%
    );


  border-radius:
    18px;


  box-shadow:
    0 18px 50px
    rgb(
      73 56 51 / 6%
    );
}



/* =========================================================
   CHIOANSIM
========================================================= */

.opening__brand small {
  display: block;

  margin-bottom: 8px;

  /*
    品牌強調色
  */
  color:
    var(--persimmon);

  font-size:
    0.75rem;

  font-weight:
    700;

  letter-spacing:
    0.22em;
}



/* =========================================================
   主標題
========================================================= */

.opening__brand strong {
  display: block;

  color:
    var(--ink);

  font-size:
    clamp(
      1.8rem,
      3.4vw,
      3.1rem
    );

  line-height:
    1.22;

  letter-spacing:
    -0.025em;
}



/* =========================================================
   「有我們陪你一起。」
========================================================= */

.opening__brand
strong span {
  display: block;

  color:
    var(--peach);
}



/* =========================================================
   副標
========================================================= */

.opening__brand p {
  margin:
    12px 0 0;

  color:
    var(--chestnut);

  font-size:
    clamp(
      0.9rem,
      1.3vw,
      1.05rem
    );

  line-height:
    1.7;
}



/* =========================================================
   SKIP
========================================================= */

.opening__skip {
  position: absolute;

  z-index: 40;

  top:
    max(
      18px,
      env(
        safe-area-inset-top
      )
    );

  right: 24px;


  min-width: 56px;
  min-height: 44px;

  padding:
    0 12px;


  /*
    Skip 不應成為主角，
    所以使用 Chestnut + 低透明度。
  */
  color:
    var(--chestnut);

  opacity: 0.68;


  background:
    transparent;


  border: 0;

  border-radius:
    12px;


  font:
    inherit;


  cursor:
    pointer;


  transition:
    color 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}



/* Skip Hover */

.opening__skip:hover {
  color:
    var(--persimmon);

  opacity: 1;

  background:
    rgb(
      255 253 251 / 58%
    );

  transform:
    translateY(-1px);
}



/* Skip Keyboard Focus */

.opening__skip:focus-visible {
  outline:
    3px solid
    var(--peach-soft);

  outline-offset:
    3px;

  opacity: 1;
}



/* =========================================================
   MOBILE
========================================================= */

@media (
  max-width: 768px
) {

  .opening__artwork {
    top: 39%;

    width: 150vw;
  }


  .opening__brand {
    left: 20px;

    right: 20px;

    bottom: 24px;

    max-width: none;

    padding:
      16px 18px;
  }


  .opening__brand strong {
    font-size:
      1.75rem;
  }


  .opening__brand p {
    margin-top:
      8px;
  }
}

</style>



<!-- =======================================================
     GLOBAL BRAND COLORS
======================================================= -->

<style>

:root {

  /* -------------------------------------------------------
     Background
  ------------------------------------------------------- */

  --milk:
    #fff9f5;

  --paper:
    #fffdfb;



  /* -------------------------------------------------------
     Typography
  ------------------------------------------------------- */

  --ink:
    #493833;

  --chestnut:
    #6e5750;



  /* -------------------------------------------------------
     Peach Brand Colors
  ------------------------------------------------------- */

  --peach:
    #eb9079;


  /*
    SVG 主輪廓
  */
  --peach-line:
    #e9826f;


  /*
    手紋 / 細節
  */
  --peach-soft:
    #f0a18f;


  /*
    毛衣 / 次要線條
  */
  --peach-secondary:
    #dca494;



  /* -------------------------------------------------------
     CTA / Accent
  ------------------------------------------------------- */

  --persimmon:
    #c85618;



  /* -------------------------------------------------------
     Homepage Scroll Sections

     下一階段首頁可以直接使用
  ------------------------------------------------------- */

  /*
    Hero
    鼠尾草奶綠
  */
  --sage:
    #dde5d3;


  /*
    Needs
    蜜桃奶霜
  */
  --peach-cream:
    #f4d5ca;


  /*
    Care Journey
    霧藍鼠尾草
  */
  --mist:
    #dee8e6;


  /*
    Booking
    栗子燕麥
  */
  --oat:
    #e9ddd7;
}



/* =========================================================
   OPENING SCROLL LOCK
========================================================= */

html.opening-lock,
html.opening-lock body {
  overflow: hidden;
}

</style>
