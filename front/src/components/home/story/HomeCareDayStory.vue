<template>
  <section ref="root" class="care-day-story" aria-label="一天的照護故事">
    <CareStoryScene v-for="scene in scenes" :key="scene.id" :scene="scene" />
    <CareStoryProgress :items="scenes" :active="activeScene" />
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap, ScrollTrigger } from '@/composables/useGsap';
import CareStoryProgress from './CareStoryProgress.vue';
import CareStoryScene from './CareStoryScene.vue';
import scene01 from '@/assets/home-world/story/scene-01.webp';
import scene02 from '@/assets/home-world/story/scene-02.webp';
import scene03 from '@/assets/home-world/story/scene-03.webp';
import scene04 from '@/assets/home-world/story/scene-04.webp';
import scene05 from '@/assets/home-world/story/scene-05.webp';
import scene06 from '@/assets/home-world/story/scene-06.webp';
import scene07 from '@/assets/home-world/story/scene-07.webp';
import scene08 from '@/assets/home-world/story/scene-08.webp';

type SceneLayout = 'hero' | 'split' | 'cinematic' | 'reverse' | 'detail' | 'work' | 'outdoor' | 'ending';
interface CareScene { id: string; time: string; title: string; description: string; image: string; alt: string; layout: SceneLayout; objectPosition?: string }
const scenes: CareScene[] = [
  { id:'01',time:'09:00',title:'今天的陪伴，從家門口開始。',description:'熟悉彼此，也準備開始今天的照顧。',image:scene01,alt:'居服員在玄關替長者整理衣領，虎斑貓好奇地在旁觀察',layout:'hero',objectPosition:'center' },
  { id:'02',time:'09:30',title:'先坐下來，聊聊今天。',description:'照顧從理解生活開始。',image:scene02,alt:'居服員與長者在客廳喝茶聊天，虎斑貓霸佔沙發前最舒服的位置',layout:'split',objectPosition:'center' },
  { id:'03',time:'11:30',title:'一起準備午餐。',description:'一餐熱騰騰的飯，也是每天的安心。',image:scene03,alt:'居服員與長者一起在廚房準備午餐，虎斑貓靠近聞香',layout:'cinematic',objectPosition:'43% center' },
  { id:'04',time:'12:00',title:'一起享用午餐。',description:'一頓飯，也是一段陪伴。',image:scene04,alt:'居服員替正在用餐的長者盛菜，虎斑貓在餐桌旁探頭',layout:'reverse',objectPosition:'center' },
  { id:'05',time:'13:30',title:'飯後，喝杯茶聊聊天。',description:'有些照顧，只是有人願意坐下來聽。',image:scene05,alt:'飯後茶杯與交談中的雙手，虎斑貓在沙發角落休息',layout:'detail',objectPosition:'38% center' },
  { id:'06',time:'15:00',title:'一起整理生活。',description:'需要幫忙的地方有人接手，也保留自己能做的事。',image:scene06,alt:'居服員與長者一起摺衣服，虎斑貓守著洗衣籃',layout:'work',objectPosition:'center' },
  { id:'07',time:'16:30',title:'陪奶奶走出家門。',description:'外面的世界，也有人陪你一起。',image:scene07,alt:'居服員陪拿著手杖的長者走出家門，虎斑貓停在門檻內',layout:'outdoor',objectPosition:'center' },
  { id:'08',time:'18:00',title:'今天的服務結束了。',description:'照顧告一段落，安心沒有離開。',image:scene08,alt:'傍晚長者在門口向準備離開的居服員揮手，虎斑貓在牆頭目送',layout:'ending',objectPosition:'center' },
];

const root = ref<HTMLElement>();
const activeScene = ref(0);
let context: gsap.Context | undefined;
let media: gsap.MatchMedia | undefined;

onMounted(() => {
  if (!root.value) return;
  const rootEl = root.value;
  context = gsap.context(() => {
    media = gsap.matchMedia();
    media.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const articles = gsap.utils.toArray<HTMLElement>('.care-scene');
      articles.forEach((article,index) => {
        const image = article.querySelector<HTMLElement>('.care-scene__image');
        const copy = article.querySelector<HTMLElement>('.care-scene__copy');
        const layout = scenes[index]?.layout;
        ScrollTrigger.create({ trigger:article,start:'top 55%',end:'bottom 45%',onToggle:self=>{ if(self.isActive) activeScene.value=index } });
        const timeline = gsap.timeline({ scrollTrigger:{ trigger:article,start:'top 80%',end:'bottom 20%',scrub:['cinematic','outdoor','ending'].includes(layout || '') ? 1 : false,toggleActions:'play none none reverse' } });
        if (layout === 'hero') timeline.fromTo(image,{scale:1.04},{scale:1,duration:1.1,ease:'none'}).from(copy,{y:30,autoAlpha:0,duration:.65},0).to(image,{yPercent:-4,duration:.5},.65);
        else if (layout === 'split') timeline.from(copy,{x:-42,autoAlpha:0,duration:.7}).from(image,{xPercent:5,clipPath:'inset(0 0 0 18%)',duration:.9},0);
        else if (layout === 'cinematic') timeline.fromTo(image,{scale:1.035,yPercent:3},{scale:1,yPercent:-3,ease:'none'}).from(copy,{y:40,autoAlpha:0,duration:.5},0);
        else if (layout === 'reverse') timeline.from(copy,{x:-46,autoAlpha:0,duration:.7}).from(image,{xPercent:5,autoAlpha:.35,duration:.8},0);
        else if (layout === 'detail') timeline.fromTo(image,{scale:1.07},{scale:1,duration:1.5,ease:'none'}).from(copy,{y:24,autoAlpha:0,duration:1},.15);
        else if (layout === 'work') timeline.from(image,{y:32,autoAlpha:.45,duration:.8}).from('.care-scene--work .care-scene__copy > *',{x:-24,autoAlpha:0,stagger:.1,duration:.55},.05);
        else if (layout === 'outdoor') timeline.fromTo(image,{xPercent:3,scale:1.025},{xPercent:-2,scale:1,ease:'none'}).from(copy,{x:38,autoAlpha:0,duration:.5},0);
        else timeline.fromTo(image,{scale:1},{scale:1.025,ease:'none'}).fromTo(copy,{autoAlpha:0,y:22},{autoAlpha:1,y:0,duration:.65},0).to(copy,{autoAlpha:.78,duration:.35},.65);
      });
    });
    media.add('(max-width: 900px)', () => gsap.utils.toArray<HTMLElement>('.care-scene').forEach((article,index) => ScrollTrigger.create({ trigger:article,start:'top 55%',end:'bottom 45%',onToggle:self=>{ if(self.isActive) activeScene.value=index } })));
    media.add('(prefers-reduced-motion: reduce)', () => gsap.utils.toArray<HTMLElement>('.care-scene__copy').forEach(copy => gsap.from(copy,{autoAlpha:0,duration:.25,scrollTrigger:{trigger:copy,start:'top 88%'}})));
  }, rootEl);
  ScrollTrigger.refresh();
});
onBeforeUnmount(() => { media?.revert(); context?.revert(); });
</script>

<style scoped>
.care-day-story{position:relative;background:linear-gradient(180deg,#fff9f5 0%,#fffdfb 24%,#f8eee6 50%,#f2eee2 72%,#fff9f5 100%)}
.care-scene{position:relative;width:min(1480px,calc(100% - 48px));min-height:clamp(660px,82dvh,920px);display:grid;grid-template-columns:minmax(300px,38%) minmax(0,62%);align-items:center;gap:clamp(30px,6vw,90px);margin-inline:auto;padding-block:clamp(90px,10vw,150px)}
.care-scene__media{overflow:hidden;border-radius:clamp(20px,3vw,40px);box-shadow:0 28px 80px #674c3a20}.care-scene__image{width:100%;height:100%;display:block;object-fit:cover;will-change:transform}.care-scene__copy{position:relative;z-index:2;max-width:570px}.care-scene__meta{display:flex;align-items:baseline;gap:16px;color:#c85618;font-variant-numeric:tabular-nums}.care-scene__number{font-size:clamp(2.4rem,5vw,5rem);font-weight:300;line-height:1}.care-scene__time{font-size:1rem;font-weight:800;letter-spacing:.12em}.care-scene__title{margin:24px 0 16px;color:#493833;font-size:clamp(2.3rem,4.6vw,5rem);font-weight:700;line-height:1.12;letter-spacing:-.045em}.care-scene__description{max-width:30em;margin:0;color:#6e5750;font-size:clamp(1rem,1.25vw,1.2rem);line-height:1.8}.care-scene__hints{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:36px}.care-scene__hints span{min-height:76px;display:grid;place-items:center;gap:5px;padding:10px;color:#6e5750;background:#fffdfba8;border:1px solid #c8561826;border-radius:16px}.care-scene__hints svg{color:#c85618}
.care-scene--hero,.care-scene--ending{width:100%;min-height:100dvh;grid-template-columns:1fr;padding:0;overflow:hidden}.care-scene--hero .care-scene__media,.care-scene--ending .care-scene__media{position:absolute;inset:0;border-radius:0;box-shadow:none}.care-scene--hero .care-scene__media::after,.care-scene--ending .care-scene__media::after{position:absolute;inset:0;background:linear-gradient(90deg,#fff9f5f2 0%,#fff9f5b8 28%,transparent 62%),linear-gradient(0deg,#4b352638,transparent 45%);content:''}.care-scene--hero .care-scene__copy,.care-scene--ending .care-scene__copy{width:min(1480px,calc(100% - 96px));max-width:none;margin:auto}.care-scene--hero .care-scene__copy>* ,.care-scene--ending .care-scene__copy>*{max-width:600px}.care-scene--hero .care-scene__image,.care-scene--ending .care-scene__image{height:106%}
.care-scene--split .care-scene__media,.care-scene--reverse .care-scene__media,.care-scene--work .care-scene__media{height:min(62vw,700px)}.care-scene--cinematic{grid-template-columns:minmax(0,66%) minmax(280px,1fr);width:min(1600px,calc(100% - 48px))}.care-scene--cinematic .care-scene__media{height:min(48vw,760px)}.care-scene--reverse{grid-template-columns:minmax(300px,38%) minmax(0,62%)}.care-scene--detail{grid-template-columns:minmax(0,58%) minmax(300px,42%)}.care-scene--detail .care-scene__media{height:min(50vw,680px);clip-path:inset(3% 0 3% 0 round 38px)}.care-scene--detail .care-scene__image{transform-origin:38% center}.care-scene--work{grid-template-columns:minmax(300px,38%) minmax(0,62%)}.care-scene--outdoor{width:min(1600px,calc(100% - 48px));grid-template-columns:minmax(0,68%) minmax(280px,1fr);color:#345346}.care-scene--outdoor::before{position:absolute;inset:6% -100vw;background:linear-gradient(100deg,#edf1df,#e9f4ee 58%,#e9f1ef);content:''}.care-scene--outdoor .care-scene__media{height:min(48vw,700px)}.care-scene--ending .care-scene__media::after{background:linear-gradient(90deg,#fff9f5ed 0%,#fff9f5a6 34%,transparent 62%),linear-gradient(0deg,#4b35264d,transparent 55%)}
.care-progress{position:fixed;z-index:20;right:clamp(12px,2vw,32px);top:50%;transform:translateY(-50%);mix-blend-mode:multiply}.care-progress__desktop{display:grid;gap:7px;margin:0;padding:14px 9px;list-style:none;background:#fffdfbc9;border-radius:18px;backdrop-filter:blur(8px)}.care-progress__desktop a{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:30px;color:#6e5750;text-decoration:none;font-size:.7rem}.care-progress__desktop i{width:8px;height:8px;background:#c85618;border-radius:50%;opacity:.3;transform:scale(.55);transition:.25s}.care-progress__desktop .is-active i{opacity:1;transform:scale(1)}.care-progress__desktop .is-active time{color:#493833;font-weight:800}.care-progress__mobile{display:none}
@media(max-width:900px){.care-scene,.care-scene--cinematic,.care-scene--reverse,.care-scene--detail,.care-scene--work,.care-scene--outdoor{width:100%;min-height:auto;grid-template-columns:1fr;gap:22px;padding:64px 18px}.care-scene__media,.care-scene--split .care-scene__media,.care-scene--reverse .care-scene__media,.care-scene--detail .care-scene__media,.care-scene--work .care-scene__media,.care-scene--outdoor .care-scene__media{order:2;height:auto;aspect-ratio:16/10;border-radius:20px;clip-path:none}.care-scene__copy{order:1}.care-scene__title{margin:14px 0 10px;font-size:clamp(2.15rem,9vw,3.3rem)}.care-scene__number{font-size:2.4rem}.care-scene__hints{grid-template-columns:repeat(4,1fr);margin-top:24px}.care-scene__hints span{min-height:66px;font-size:.82rem}.care-scene--hero,.care-scene--ending{min-height:min(78dvh,720px);display:flex;align-items:flex-end;padding:0}.care-scene--hero .care-scene__media,.care-scene--ending .care-scene__media{order:initial;aspect-ratio:auto}.care-scene--hero .care-scene__copy,.care-scene--ending .care-scene__copy{width:100%;margin:0;padding:28px 18px 42px;color:#493833;background:linear-gradient(0deg,#fff9f5f5,#fff9f5b3 72%,transparent)}.care-scene--hero .care-scene__media::after,.care-scene--ending .care-scene__media::after{background:linear-gradient(0deg,#fff9f5eb 0%,transparent 58%)}.care-scene--hero .care-scene__image,.care-scene--ending .care-scene__image{height:100%}.care-scene--cinematic .care-scene__media,.care-scene--outdoor .care-scene__media{aspect-ratio:16/9}.care-scene--detail .care-scene__media{aspect-ratio:4/3}.care-scene--outdoor::before{inset:18px 0}.care-progress{right:12px;top:auto;bottom:12px;transform:none;mix-blend-mode:normal}.care-progress__desktop{display:none}.care-progress__mobile{display:flex;gap:9px;margin:0;padding:8px 12px;color:#493833;background:#fffdfbe8;border:1px solid #6e57501f;border-radius:14px;box-shadow:0 8px 24px #49383319;backdrop-filter:blur(8px)}.care-progress__mobile b{color:#c85618}.care-progress__mobile time{font-variant-numeric:tabular-nums}}
@media(max-width:430px){.care-scene{padding-block:58px}.care-scene__description{font-size:1rem}.care-scene__hints{gap:6px}.care-scene__hints span{padding-inline:4px}.care-scene--hero,.care-scene--ending{padding:0}}
@media(prefers-reduced-motion:reduce){.care-scene__image{will-change:auto!important;transform:none!important}.care-progress__desktop i{transition:none}}
</style>
