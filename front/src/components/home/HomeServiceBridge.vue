<template>
  <section class="service-bridge" aria-labelledby="service-bridge-title">
    <div class="service-bridge__copy"><h2 id="service-bridge-title">一天的陪伴，<br>從找到適合的人開始。</h2><router-link to="/caregivers">找居服員 <ArrowRight :size="20" /></router-link></div>
    <ul aria-label="照安心服務特色"><li><BadgeCheck :size="20" />照護資格</li><li><CalendarCheck :size="20" />線上預約</li><li><Route :size="20" />服務進度</li><li><Calculator :size="20" />費用試算</li></ul>
  </section>
</template>
<script setup lang="ts">import { ArrowRight, BadgeCheck, Calculator, CalendarCheck, Route } from '@lucide/vue';</script>
<style scoped>
.service-bridge{display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:clamp(48px,8vw,120px);max-width:1440px;margin:auto;padding:clamp(80px,10vw,140px) 24px;background:#fff9f5}.service-bridge h2{margin:0;color:#493833;font-size:clamp(2.2rem,4vw,4rem);line-height:1.15}.service-bridge a{min-height:52px;display:inline-flex;align-items:center;gap:8px;margin-top:34px;color:#c85618;text-decoration:none;font-weight:800}.service-bridge ul{display:grid;grid-template-columns:repeat(2,1fr);margin:0;padding:0;border-top:1px solid #6e57502e;list-style:none}.service-bridge li{display:flex;align-items:center;gap:9px;padding:28px 10px;border-bottom:1px solid #6e57502e;color:#493833;font-size:clamp(1.05rem,1.5vw,1.3rem);font-weight:700}.service-bridge li svg{color:#c85618}.service-bridge a:focus-visible{outline:3px solid #eb9079;outline-offset:4px}@media(max-width:700px){.service-bridge{grid-template-columns:1fr;padding:72px 18px}.service-bridge a{min-width:44px}.service-bridge li{padding-block:20px}}
</style>
