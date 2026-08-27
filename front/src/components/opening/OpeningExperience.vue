<template>
  <div v-if="visible" ref="opening" class="opening" aria-hidden="true">
    <div ref="artwork" class="opening__artwork">
      <svg class="opening-hands" viewBox="0 0 1600 700" role="presentation">
        <g id="young-side">
          <g id="young-arm">
            <path class="draw-path" d="M-20 345 C96 359 174 396 274 397 C365 398 433 357 504 317" />
            <path class="draw-path" d="M-20 617 C126 582 248 552 375 566 C476 578 559 558 646 506" />
          </g>
          <g id="young-hand">
            <path class="draw-path" d="M274 397 C369 393 428 354 504 317 C575 283 635 258 706 252 C748 248 777 258 782 279 C788 306 750 323 701 329" />
            <path class="draw-path" d="M701 329 C750 322 796 314 825 326 C848 336 845 358 824 373 C797 391 753 391 713 395" />
            <path class="draw-path" d="M713 395 C765 387 815 387 839 404 C859 418 850 441 826 452 C792 469 744 459 704 462" />
            <path class="draw-path" d="M704 462 C748 459 790 467 796 488 C802 509 771 522 735 520 C702 517 674 509 646 506" />
            <path class="draw-path" d="M504 317 C558 282 601 242 655 214 C697 192 737 190 751 208 C766 229 735 251 706 252" />
            <path class="draw-path young-detail" d="M510 446 C556 454 598 469 633 493" />
            <path class="draw-path young-detail" d="M613 292 C642 306 671 315 701 329" />
          </g>
        </g>

        <g id="contact-zone">
          <path class="draw-path" d="M655 214 C698 188 748 178 796 186 C839 193 873 215 912 230" />
          <path class="draw-path" d="M824 373 C855 376 884 372 913 361" />
          <path class="draw-path" d="M796 488 C831 487 861 476 887 456" />
        </g>

        <g id="elder-side">
          <g id="elder-hand-main">
            <path class="draw-path" d="M912 230 C878 218 850 202 818 184 C790 168 786 143 807 130 C832 115 872 139 904 152" />
            <path class="draw-path" d="M904 152 C863 132 827 107 839 82 C851 58 893 76 925 91 C977 115 1018 139 1065 147" />
            <path class="draw-path" d="M1065 147 C1024 135 992 115 1000 92 C1009 68 1048 82 1081 96 C1140 121 1184 146 1240 170" />
            <path class="draw-path" d="M1240 170 C1187 142 1155 117 1168 96 C1182 74 1223 98 1253 115 C1302 143 1347 164 1402 174" />
            <path class="draw-path" d="M913 361 C952 340 980 310 1024 294 C1065 279 1104 286 1130 307 C1152 325 1150 346 1128 357 C1102 370 1067 356 1038 357" />
            <path class="draw-path" d="M1038 357 C1088 355 1127 366 1133 389 C1138 410 1110 423 1076 421 C1045 419 1018 408 991 408" />
            <path class="draw-path" d="M991 408 C1033 408 1070 421 1072 444 C1074 465 1044 475 1015 469 C989 464 964 450 941 447" />
            <path class="draw-path" d="M941 447 C972 455 995 473 988 492 C981 511 950 510 925 498 C908 489 896 473 887 456" />
            <path class="draw-path" d="M1128 357 C1180 370 1219 397 1260 430 C1311 471 1361 500 1427 519" />
          </g>
          <g id="elder-wrist">
            <path class="draw-path" d="M1402 174 C1472 176 1531 188 1620 210" />
            <path class="draw-path" d="M1427 519 C1491 537 1543 556 1620 588" />
            <path class="draw-path" d="M1390 174 C1368 225 1362 276 1375 328 C1388 380 1411 430 1444 482" />
            <path class="draw-path elder-detail" d="M1432 188 C1415 235 1412 279 1425 321" />
            <path class="draw-path elder-detail" d="M1468 192 C1450 240 1448 283 1461 327" />
            <path class="draw-path elder-detail" d="M1478 471 C1497 501 1520 526 1549 549" />
          </g>
          <g id="elder-details">
            <path class="draw-path elder-detail" d="M917 173 C938 177 957 186 972 201" />
            <path class="draw-path elder-detail" d="M947 198 C971 202 990 212 1005 228" />
            <path class="draw-path elder-detail" d="M1000 235 C1026 232 1050 239 1069 254" />
            <path class="draw-path elder-detail" d="M1060 272 C1086 268 1111 275 1130 292" />
            <path class="draw-path elder-detail" d="M1176 190 C1210 204 1238 225 1260 253" />
            <path class="draw-path elder-detail" d="M1193 222 C1225 237 1250 258 1268 284" />
            <path class="draw-path elder-detail" d="M1204 258 C1235 272 1258 293 1274 318" />
            <path class="draw-path elder-detail" d="M1198 303 C1226 316 1247 335 1261 357" />
            <path class="draw-path elder-detail" d="M955 335 C978 325 999 324 1021 331" />
            <path class="draw-path elder-detail" d="M948 381 C971 372 993 373 1016 382" />
            <path class="draw-path elder-detail" d="M929 426 C953 419 974 423 993 436" />
            <path class="draw-path elder-detail" d="M1080 456 C1115 466 1146 484 1170 508" />
            <path class="draw-path elder-detail" d="M1101 429 C1137 440 1169 459 1192 484" />
          </g>
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
const forceOpening = import.meta.env.DEV;
const staticDebug = import.meta.env.DEV && new URLSearchParams(location.search).has('opening-static');

function finish() {
  sessionStorage.setItem('chioansim-opening-played', 'true');
  document.documentElement.classList.remove('opening-lock');
  visible.value = false;
  emit('finished');
}

async function start() {
  if (!forceOpening && sessionStorage.getItem('chioansim-opening-played') === 'true') return finish();
  await nextTick();
  if (!opening.value || !artwork.value || !brand.value || !revealCircle.value) return finish();
  document.documentElement.classList.add('opening-lock');
  const paths = artwork.value.querySelectorAll<SVGPathElement>('.draw-path');
  if (paths.length < 10) return finish();
  gsap.set([artwork.value, paths], { autoAlpha: 1 });
  if (staticDebug) return;
  paths.forEach(path => {
    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, visibility: 'visible' });
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(paths, { strokeDashoffset: 0 });
    timeline = gsap.timeline({ onComplete: finish }).to(brand.value, { autoAlpha: 1, duration: .2 }).to(opening.value, { autoAlpha: 0, duration: .2 }, '+=.25');
    return;
  }
  const youngArm = artwork.value.querySelectorAll('#young-arm .draw-path');
  const youngHand = artwork.value.querySelectorAll('#young-hand .draw-path');
  const contact = artwork.value.querySelectorAll('#contact-zone .draw-path');
  const elderMain = artwork.value.querySelectorAll('#elder-hand-main .draw-path');
  const elderWrist = artwork.value.querySelectorAll('#elder-wrist .draw-path');
  const elderDetails = artwork.value.querySelectorAll('#elder-details .draw-path');
  const circleScale = Math.hypot(innerWidth, innerHeight) / (Math.max(innerWidth, innerHeight) * .1) + 1;
  timeline = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish })
    .fromTo(opening.value, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35 })
    .to(youngArm, { strokeDashoffset: 0, duration: .42, stagger: .16, ease: 'power1.inOut' }, .2)
    .to(youngHand, { strokeDashoffset: 0, duration: .34, stagger: .075, ease: 'power1.inOut' }, .64)
    .to(contact, { strokeDashoffset: 0, duration: .3, stagger: .09, ease: 'power1.inOut' }, 1.18)
    .to(elderMain, { strokeDashoffset: 0, duration: .34, stagger: .07, ease: 'power1.inOut' }, 1.42)
    .to(elderWrist, { strokeDashoffset: 0, duration: .3, stagger: .065, ease: 'power1.inOut' }, 1.93)
    .to(elderDetails, { strokeDashoffset: 0, duration: .22, stagger: .04 }, 2.02)
    .fromTo(brand.value, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, 2.72)
    .fromTo(revealCircle.value, { scale: 0, autoAlpha: 1 }, { scale: circleScale, duration: .75, ease: 'power3.inOut' }, 3.3)
    .to([artwork.value, brand.value], { autoAlpha: 0, duration: .25 }, 3.52)
    .to(opening.value, { autoAlpha: 0, duration: .32 }, 3.88);
}

onMounted(start);
onBeforeUnmount(() => { timeline?.kill(); document.documentElement.classList.remove('opening-lock'); });
</script>

<style scoped>
.opening{position:fixed;inset:0;z-index:9999;overflow:hidden;width:100vw;height:100dvh;background:radial-gradient(circle at 50% 48%,rgb(235 144 121/.1),transparent 38%),#fff9f5}.opening__artwork{position:absolute;z-index:20;left:50%;top:46%;width:min(90vw,1180px);transform:translate(-50%,-50%);opacity:1;visibility:visible}.opening-hands{display:block;width:100%;height:auto;overflow:visible;opacity:1;visibility:visible}.draw-path{fill:none;stroke:#6e5750;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;visibility:visible}.young-detail,.elder-detail{stroke-width:1.35;opacity:.68}.opening__brand{position:absolute;z-index:30;left:50%;bottom:clamp(48px,8vh,88px);display:grid;grid-template-columns:auto auto;align-items:center;gap:4px 10px;transform:translateX(-50%);visibility:hidden;opacity:0;color:#c85618;white-space:nowrap}.opening__brand img{width:42px;height:42px;grid-row:span 2}.opening__brand strong{font-size:clamp(1.65rem,3vw,2.4rem);letter-spacing:.08em}.opening__brand p{margin:0;color:#6e5750;font-size:clamp(.82rem,1.2vw,1rem);letter-spacing:.08em}.opening__reveal{position:absolute;z-index:40;left:50%;top:50%;width:10vmax;aspect-ratio:1;border-radius:50%;background:#eb9079;transform:translate(-50%,-50%) scale(0);visibility:hidden;opacity:0}
@media(max-width:768px){.opening__artwork{width:130vw}.draw-path{stroke-width:1.8}.opening__brand{bottom:11vh}}
@media(max-width:430px){.opening__artwork{top:44%;width:155vw}.opening__brand{grid-template-columns:auto 1fr}.opening__brand img{width:36px;height:36px}.opening__brand strong{font-size:1.65rem}}
</style>

<style>
html.opening-lock,html.opening-lock body{overflow:hidden}
</style>
