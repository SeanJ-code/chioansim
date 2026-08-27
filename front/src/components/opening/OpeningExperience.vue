<template>
  <div v-if="visible" ref="opening" class="opening" aria-hidden="true">
    <div ref="artwork" class="opening__artwork">
      <svg viewBox="0 0 1400 620" role="presentation">
        <g class="young-hand">
          <path class="draw-path" d="M-20 395 C110 368 210 349 324 349 C397 349 447 335 489 304" />
          <path class="draw-path" d="M489 304 C520 279 538 244 570 222 C591 207 615 213 624 231 C632 247 619 261 604 273" />
          <path class="draw-path" d="M604 273 C630 243 653 223 671 231 C692 242 680 266 660 287" />
          <path class="draw-path" d="M660 287 C686 263 707 257 719 271 C733 288 713 307 692 321" />
          <path class="draw-path" d="M692 321 C718 307 737 309 744 324 C753 344 725 356 704 362" />
          <path class="draw-path" d="M-15 477 C135 449 262 436 385 440 C497 444 580 419 704 362" />
          <path class="draw-path young-detail" d="M516 314 C554 326 586 329 620 318" />
        </g>

        <g class="connection">
          <path class="draw-path" d="M704 362 C735 375 760 382 789 377" />
          <path class="draw-path" d="M744 324 C761 340 777 354 789 377" />
        </g>

        <g class="elder-hand">
          <path class="draw-path elder-main" d="M789 377 C818 343 844 321 877 309 C904 299 929 300 953 315" />
          <path class="draw-path elder-main" d="M953 315 C978 330 995 344 1022 351 C1042 356 1057 345 1051 331 C1046 319 1025 310 1005 299" />
          <path class="draw-path elder-main" d="M1005 299 C1036 310 1061 312 1068 296 C1074 280 1053 267 1025 256" />
          <path class="draw-path elder-main" d="M1025 256 C1055 266 1081 265 1086 247 C1091 230 1065 219 1039 211" />
          <path class="draw-path elder-main" d="M1039 211 C1066 218 1090 212 1090 195 C1090 177 1063 171 1034 165 C991 156 950 142 916 119" />
          <path class="draw-path elder-main" d="M789 377 C833 413 895 434 963 439 C1083 448 1192 431 1420 397" />
          <path class="draw-path elder-main" d="M916 119 C1008 158 1108 183 1420 204" />

          <path class="draw-path elder-detail" d="M842 350 C875 337 907 338 936 352" />
          <path class="draw-path elder-detail" d="M865 380 C902 367 941 373 970 393" />
          <path class="draw-path elder-detail" d="M907 323 C927 328 944 339 957 355" />
          <path class="draw-path elder-detail" d="M963 287 C984 280 1003 282 1022 291" />
          <path class="draw-path elder-detail" d="M980 244 C1000 237 1020 239 1038 248" />
          <path class="draw-path elder-detail" d="M989 202 C1008 194 1027 196 1044 204" />
          <path class="draw-path elder-detail" d="M1077 372 C1116 360 1154 361 1191 371" />
          <path class="draw-path elder-detail" d="M1097 397 C1140 387 1184 389 1222 399" />
        </g>
      </svg>
    </div>

    <div ref="brand" class="opening__brand">
      <img src="/chioansimicon.svg" alt="">
      <strong>照安心</strong>
      <p>陪伴每一步，安心每一天</p>
    </div>
    <div ref="revealCircle" class="opening__reveal" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from '@/composables/useGsap';

const emit = defineEmits<{ finished: [] }>();
const visible = ref(true), opening = ref<HTMLElement>(), artwork = ref<HTMLElement>(), brand = ref<HTMLElement>(), revealCircle = ref<HTMLElement>();
let timeline: gsap.core.Timeline | undefined;

function finish() {
  sessionStorage.setItem('chioansim-opening-played', 'true');
  document.documentElement.classList.remove('opening-lock');
  visible.value = false;
  emit('finished');
}

async function start() {
  if (sessionStorage.getItem('chioansim-opening-played') === 'true') return finish();
  await nextTick();
  if (!opening.value || !artwork.value || !brand.value || !revealCircle.value) return finish();
  document.documentElement.classList.add('opening-lock');
  const paths = artwork.value.querySelectorAll<SVGPathElement>('.draw-path');
  paths.forEach(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(paths, { strokeDashoffset: 0 });
    timeline = gsap.timeline({ onComplete: finish }).to(brand.value, { autoAlpha: 1, duration: .2 }).to(opening.value, { autoAlpha: 0, duration: .2 }, '+=.25');
    return;
  }
  const main = artwork.value.querySelectorAll('.young-hand .draw-path, .connection .draw-path, .elder-main');
  const details = artwork.value.querySelectorAll('.elder-detail');
  timeline = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish })
    .fromTo(opening.value, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35 })
    .to(main, { strokeDashoffset: 0, duration: .46, stagger: .13, ease: 'power1.inOut' }, .2)
    .to(details, { strokeDashoffset: 0, duration: .22, stagger: .045 }, 1.72)
    .fromTo(brand.value, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .5 }, 2.3)
    .fromTo(revealCircle.value, { scale: 0, autoAlpha: 1 }, { scale: 46, duration: .72, ease: 'power3.inOut' }, 3.08)
    .to([artwork.value, brand.value], { autoAlpha: 0, duration: .25 }, 3.3)
    .to(opening.value, { autoAlpha: 0, duration: .28 }, 3.7);
}

onMounted(start);
onBeforeUnmount(() => { timeline?.kill(); document.documentElement.classList.remove('opening-lock'); });
</script>

<style scoped>
.opening{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;width:100vw;height:100dvh;background:radial-gradient(circle at 50% 48%,rgb(235 144 121/.1),transparent 38%),#fff9f5}.opening__artwork{position:relative;z-index:2;width:min(92vw,1200px)}svg{display:block;width:100%;overflow:visible}.draw-path{fill:none;stroke:#6e5750;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.young-detail,.elder-detail{stroke-width:1.35;opacity:.72}.opening__brand{position:absolute;z-index:3;left:50%;bottom:clamp(48px,8vh,88px);display:grid;grid-template-columns:auto auto;align-items:center;gap:4px 10px;transform:translateX(-50%);visibility:hidden;opacity:0;color:#c85618;white-space:nowrap}.opening__brand img{width:42px;height:42px;grid-row:span 2}.opening__brand strong{font-size:clamp(1.65rem,3vw,2.4rem);letter-spacing:.08em}.opening__brand p{margin:0;color:#6e5750;font-size:clamp(.82rem,1.2vw,1rem);letter-spacing:.08em}.opening__reveal{position:absolute;z-index:5;left:50%;top:50%;width:10vmax;aspect-ratio:1;border-radius:50%;background:#eb9079;transform:translate(-50%,-50%) scale(0);visibility:hidden;opacity:0}
@media(max-width:768px){.opening__artwork{width:132vw;transform:translateX(-3%)}.draw-path{stroke-width:1.8}.opening__brand{bottom:11vh}}
@media(max-width:430px){.opening__artwork{width:162vw}.opening__brand{grid-template-columns:auto 1fr}.opening__brand img{width:36px;height:36px}.opening__brand strong{font-size:1.65rem}}
</style>

<style>
html.opening-lock,html.opening-lock body{overflow:hidden}
</style>
