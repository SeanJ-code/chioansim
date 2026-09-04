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
  { id:'02',time:'09:30',title:'今天，需要哪一種幫忙？',description:'照顧不只是一件事，而是生活裡每天不同的需要。',image:scene02,alt:'居服員與長者在客廳喝茶聊天，虎斑貓霸佔沙發前最舒服的位置',layout:'split',objectPosition:'center' },
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
        if (layout === 'hero') timeline.fromTo(image,{scale:1.025},{scale:1,duration:1.1,ease:'none'}).from(copy,{y:24,autoAlpha:0,duration:.65},0);
        else if (layout === 'split') timeline.from(copy,{x:-42,autoAlpha:0,duration:.7}).from(image,{xPercent:5,clipPath:'inset(0 0 0 18%)',duration:.9},0);
        else if (layout === 'cinematic') timeline.fromTo(image,{scale:1.035,yPercent:3},{scale:1,yPercent:-3,ease:'none'}).from(copy,{y:40,autoAlpha:0,duration:.5},0);
        else if (layout === 'reverse') timeline.from(copy,{x:-30,autoAlpha:0,duration:.8}).from(image,{clipPath:'inset(0 0 0 8%)',duration:.8},0);
        else if (layout === 'detail') timeline.fromTo(image,{scale:1.04},{scale:1,duration:1.2,ease:'none'}).from(copy,{y:24,autoAlpha:0,duration:1},.15);
        else if (layout === 'work') timeline.from(image,{y:28,autoAlpha:0,duration:.8}).from('.care-scene--work .care-scene__copy > *',{x:-24,autoAlpha:0,stagger:.08,duration:.55},.05);
        else if (layout === 'outdoor') timeline.fromTo(image,{xPercent:2,scale:1.02},{xPercent:-2,scale:1,ease:'none'}).from(copy,{x:38,autoAlpha:0,duration:.5},0);
        else timeline.fromTo(image,{scale:1.025},{scale:1,ease:'none'}).fromTo(copy,{autoAlpha:0,y:22},{autoAlpha:1,y:0,duration:.65},0);
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
</style>
