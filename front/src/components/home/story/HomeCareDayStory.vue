<template><section ref="root" class="care-day-story" aria-label="一天的照護故事"><CareStoryScene v-for="scene in scenes" :key="scene.id" :scene="scene"><template v-if="scene.id==='07'" #progress><div class="scene-progress" data-progress-route><p class="scene-progress-caption">服務進度示意・每一步，都讓家人安心</p><div class="scene-progress-route"><div><UserRoundCheck :size="44"/><span>居服員</span></div><div class="scene-progress-line"><i></i><span class="route-dot"></span></div><div><HouseHeart :size="46"/><span>家</span></div></div><ol class="scene-progress-steps"><li v-for="item in progressSteps" :key="item.label"><component :is="item.icon" :size="24"/><span>{{ item.label }}</span></li></ol></div></template><template v-if="scene.id==='08'" #ending><div class="scene-ending-cta"><p class="scene-ending-eyebrow">一直都在</p><h3>照顧的路上，<br>有人陪你一起。</h3><p>照顧不孤單，我們一直都在。</p><div class="scene-ending-actions"><router-link to="/caregivers">找居服員 <ArrowRight :size="20"/></router-link><button type="button" @click="emit('line')">不熟悉網站？請 LINE 專人協助</button></div></div></template></CareStoryScene></section></template>
<script setup lang="ts">
import{onBeforeUnmount,onMounted,ref}from'vue';import{ArrowRight,HouseHeart,UserRoundCheck}from'@lucide/vue';import{gsap,ScrollTrigger}from'@/composables/useGsap';import CareStoryScene from'./CareStoryScene.vue';import scene01 from'@/assets/home-world/story/scene-01.webp';import scene02 from'@/assets/home-world/story/scene-02.webp';import scene03 from'@/assets/home-world/story/scene-03.webp';import scene04 from'@/assets/home-world/story/scene-04.webp';import scene05 from'@/assets/home-world/story/scene-05.webp';import scene06 from'@/assets/home-world/story/scene-06.webp';import scene07 from'@/assets/home-world/story/scene-07.webp';import scene08 from'@/assets/home-world/story/scene-08.webp';
type SceneLayout='hero'|'split'|'cinematic'|'reverse'|'detail'|'work'|'outdoor'|'ending';interface CareScene{id:string;label:string;title:string;description:string;image:string;alt:string;layout:SceneLayout;objectPosition?:string;mobileImage?:string;desktopObjectPosition?:string;mobileObjectPosition?:string;mobileScale?:number}defineProps<{progressSteps:Array<{label:string;icon:any}>}>();const emit=defineEmits<{line:[]}>();
const scenes:CareScene[]=[{id:'01',label:'抵達的家',title:'今天的陪伴，從家門口開始。',description:'熟悉彼此，也準備開始今天的照顧。',image:scene01,alt:'居服員在玄關替長者整理衣領，虎斑貓好奇地在旁觀察',layout:'hero',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'center',mobileScale:1},{id:'02',label:'開始陪伴',title:'今天，需要哪一種幫忙？',description:'照顧不只是一件事，而是生活裡每天不同的需要。',image:scene02,alt:'居服員與長者在客廳喝茶聊天，虎斑貓霸佔沙發前最舒服的位置',layout:'split',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'55% center',mobileScale:1},{id:'03',label:'準備午餐',title:'一起準備午餐。',description:'一餐熱騰騰的飯，也是每天的安心。',image:scene03,alt:'居服員與長者一起在廚房準備午餐，虎斑貓靠近聞香',layout:'cinematic',objectPosition:'43% center',desktopObjectPosition:'43% center',mobileObjectPosition:'48% center',mobileScale:1},{id:'04',label:'享用午餐',title:'一起享用午餐。',description:'一頓飯，也是一段陪伴。',image:scene04,alt:'居服員替正在用餐的長者盛菜，虎斑貓在餐桌旁探頭',layout:'reverse',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'52% center',mobileScale:1},{id:'05',label:'飯後時光',title:'飯後，喝杯茶聊聊天。',description:'有些照顧，只是有人願意坐下來聽。',image:scene05,alt:'居服員與長者在客廳喝茶聊天，虎斑貓在沙發旁休息',layout:'detail',objectPosition:'38% center',desktopObjectPosition:'38% center',mobileObjectPosition:'58% center',mobileScale:1},{id:'06',label:'整理生活',title:'一起整理生活。',description:'需要幫忙的地方有人接手，也保留自己能做的事。',image:scene06,alt:'居服員與長者一起摺衣服，虎斑貓守著洗衣籃',layout:'work',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'55% center',mobileScale:1},{id:'07',label:'外出走走',title:'陪奶奶走出家門。',description:'外面的世界，也有人陪你一起。',image:scene07,alt:'居服員陪拿著手杖的長者走出家門，虎斑貓停在門檻內',layout:'outdoor',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1},{id:'08',label:'安心道別',title:'今天的服務結束了。',description:'照顧告一段落，安心沒有離開。',image:scene08,alt:'傍晚長者在門口向準備離開的居服員揮手，虎斑貓在牆頭目送',layout:'ending',objectPosition:'center',desktopObjectPosition:'center',mobileObjectPosition:'50% center',mobileScale:1}];
const root=ref<HTMLElement>();let context:gsap.Context|undefined;let media:gsap.MatchMedia|undefined;
onMounted(() => {
  if (!root.value) return;
  context = gsap.context(() => {
    const articles = gsap.utils.toArray<HTMLElement>('.care-scene');
    media = gsap.matchMedia();
    media.add('(min-width: 600px) and (prefers-reduced-motion: no-preference)', () => {
      articles.forEach((article, index) => {
        const image = article.querySelector<HTMLElement>('.care-scene__image');
        const copy = article.querySelector<HTMLElement>('.care-scene__copy');
        if (!image || !copy) return;
        const entrance = { trigger: article, start: 'top 78%', once: true };
        gsap.fromTo(index === 5 ? copy.children : copy,
          { autoAlpha: 0, ...(index === 0 ? { y: 24 } : {}) },
          { autoAlpha: 1, ...(index === 0 ? { y: 0 } : {}), duration: .6, stagger: index === 5 ? .08 : 0, ease: 'power2.out', scrollTrigger: entrance });
        if (index === 0 || index === 4) {
          gsap.fromTo(image, { scale: 1.02 }, { scale: 1, duration: .8, ease: 'power2.out', scrollTrigger: entrance });
        } else if (index === 2 || index === 7) {
          gsap.fromTo(image, { scale: index === 2 ? 1.02 : 1 }, {
            scale: index === 2 ? 1 : 1.02, ease: 'none',
            scrollTrigger: { trigger: article, start: 'top 78%', end: 'bottom 20%', scrub: .8 }
          });
        }
      });
      gsap.timeline({ scrollTrigger: { trigger: '#care-scene-07', start: 'top 70%', end: 'bottom 35%', scrub: .8 } })
        .fromTo('.scene-progress-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
        .fromTo('.route-dot', { left: '0%' }, { left: '100%', ease: 'none' }, 0);
    });
    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.scene-progress-line i', { scaleX: 1 });
      gsap.set('.route-dot', { left: '100%' });
    });
  }, root.value);
  ScrollTrigger.refresh();
});
onBeforeUnmount(() => { media?.revert(); context?.revert(); });

</script>
<style scoped>.care-day-story{position:relative;background:#fff9f5}.scene-progress{margin-top:32px;color:#fff}.scene-progress-route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}.scene-progress-route>div:not(.scene-progress-line){display:grid;place-items:center;gap:4px;font-weight:700}.scene-progress-line{position:relative;height:4px;background:rgba(255,255,255,.4)}.scene-progress-line i{position:absolute;inset:0;background:#fff;transform-origin:left}.route-dot{position:absolute;left:0;top:50%;width:16px;height:16px;background:#fff;border-radius:50%;transform:translate(-50%,-50%)}.scene-progress-steps{display:flex;justify-content:space-between;gap:12px;margin:22px 0 0;padding:0;list-style:none}.scene-progress-steps li{display:flex;align-items:center;gap:6px;color:#fff;font-size:.85rem}.scene-ending-cta{margin-top:34px}.scene-ending-eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.18em}.scene-ending-cta h3{margin:10px 0;font-size:clamp(1.8rem,3.2vw,3.4rem);line-height:1.15}.scene-ending-actions{display:flex;align-items:center;gap:14px;margin-top:26px}.scene-ending-actions a,.scene-ending-actions button{min-height:50px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 22px;border-radius:999px;color:#fff;text-decoration:none;font:inherit;font-weight:700;cursor:pointer}.scene-ending-actions a{background:#c85618;border:1px solid #c85618}.scene-ending-actions button{background:transparent;border:1px solid #fff}@media(max-width:900px){.scene-progress{margin-top:24px}.scene-progress-route svg{width:34px}.scene-progress-steps li{display:grid;place-items:center;text-align:center;font-size:.68rem}.scene-progress-steps svg{width:18px}.scene-ending-cta{margin-top:24px}.scene-ending-actions{align-items:stretch;flex-direction:column}.scene-ending-actions a,.scene-ending-actions button{width:100%}}.scene-progress-caption{font-size:.9rem;line-height:1.6}.scene-ending-cta h3{font-family:'Kaiti TC','Songti TC',serif;line-height:1.4}.scene-ending-actions{flex-wrap:wrap}.scene-ending-actions a{background:#b84916}.scene-ending-actions button{line-height:1.6;padding-block:12px}.scene-progress-steps{flex-wrap:wrap}.scene-progress-steps li{font-size:.85rem}
@media(max-width:599px){
  .scene-progress{order:4;margin:0;padding:16px 12px;background:#344d40;border-radius:0 0 12px 12px;color:#fff}
  .scene-progress-caption{margin:0 0 12px;font-size:13px}
  .scene-progress-route{gap:16px}
  .scene-progress-route svg{width:24px;height:24px}
  .scene-progress-route>div:not(.scene-progress-line){font-size:12px}
  .scene-progress-line i{transform:scaleX(1)!important}
  .scene-progress-steps{flex-wrap:nowrap;gap:6px;margin-top:14px}
  .scene-progress-steps li{flex:1;min-width:0;font-size:12px;line-height:1.5}
  .scene-ending-cta{order:4;margin-top:16px;text-align:center}
  .scene-ending-eyebrow,.scene-ending-cta>p:not(.scene-ending-eyebrow){display:none}
  .scene-ending-cta h3{font-size:24px;margin:0;line-height:1.5}
  .scene-ending-actions{margin-top:14px;gap:10px}
  .scene-ending-actions a,.scene-ending-actions button{min-height:48px;padding:10px 12px;font-size:16px}
  .scene-ending-actions button{border-color:#8e786b;color:var(--ink);background:var(--paper)}
}
</style>
