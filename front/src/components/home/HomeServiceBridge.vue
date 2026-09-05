<template>
  <section class="service-bridge" aria-labelledby="service-bridge-title">
    <div class="service-bridge__copy"><h2 id="service-bridge-title">一天的陪伴，<br>從找到適合的人開始。</h2><router-link to="/caregivers">找居服員 <ArrowRight :size="20" /></router-link></div>
    <ul aria-label="照安心服務特色">
      <li><BadgeCheck :size="28" /><div>照護資格<small>專業審核，安心託付</small></div></li>
      <li><CalendarCheck :size="28" /><div>線上預約<small>找到合適的照護夥伴</small></div></li>
      <li><Route :size="28" /><div>服務進度<small>每一步，都心裡有底</small></div></li>
      <li><Calculator :size="28" /><div>費用試算<small>先了解，再安心安排</small></div></li>
    </ul>
  </section>
</template>
<script setup lang="ts">import { ArrowRight, BadgeCheck, Calculator, CalendarCheck, Route } from '@lucide/vue';</script>
<style scoped>
.service-bridge{display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:clamp(48px,8vw,120px);max-width:1440px;margin:auto;padding:clamp(80px,10vw,140px) 24px;background:#fff9f5}.service-bridge h2{margin:0;color:#493833;font-size:clamp(2.2rem,4vw,4rem);line-height:1.15}.service-bridge a{min-height:52px;display:inline-flex;align-items:center;gap:8px;margin-top:34px;color:#c85618;text-decoration:none;font-weight:800}.service-bridge ul{display:grid;grid-template-columns:repeat(2,1fr);margin:0;padding:0;border-top:1px solid #6e57502e;list-style:none}.service-bridge li{display:flex;align-items:center;gap:9px;padding:28px 10px;border-bottom:1px solid #6e57502e;color:#493833;font-size:clamp(1.05rem,1.5vw,1.3rem);font-weight:700}.service-bridge li svg{color:#c85618}.service-bridge a:focus-visible{outline:3px solid #eb9079;outline-offset:4px}@media(max-width:700px){.service-bridge{grid-template-columns:1fr;padding:72px 18px}.service-bridge a{min-width:44px}.service-bridge li{padding-block:20px}}
.service-bridge h2{font-family:'Kaiti TC','Songti TC',serif;line-height:1.45;font-size:clamp(2rem,3vw,3rem)}.service-bridge li{gap:16px}.service-bridge li svg{flex-shrink:0}.service-bridge small{display:block;margin-top:8px;font-size:.85rem;font-weight:400;color:#6e5750;line-height:1.6}</style>
