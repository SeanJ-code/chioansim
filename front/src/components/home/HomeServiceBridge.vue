<template>
  <section class="service-bridge" aria-labelledby="service-bridge-title">
    <p>故事走到這裡，服務從這裡開始。</p>
    <h2 id="service-bridge-title">一天的陪伴，<br>從找到適合的人開始。</h2>
    <router-link to="/caregivers">找居服員 <ArrowRight :size="20" /></router-link>
  </section>
</template>
<script setup lang="ts">import { ArrowRight } from '@lucide/vue';</script>
<style scoped>
.service-bridge{display:grid;justify-items:center;padding:clamp(80px,10vw,140px) 24px;text-align:center;background:#fff9f5}.service-bridge p{margin:0 0 14px;color:#6e5750;letter-spacing:.12em}.service-bridge h2{margin:0;color:#493833;font-size:clamp(2.2rem,5vw,4.5rem);line-height:1.15}.service-bridge a{min-height:52px;display:inline-flex;align-items:center;gap:8px;margin-top:34px;padding:0 25px;color:#fff;background:#c85618;border-radius:999px;text-decoration:none;font-weight:800;box-shadow:0 12px 28px #c8561830}.service-bridge a:focus-visible{outline:3px solid #eb9079;outline-offset:4px}@media(max-width:599px){.service-bridge{padding-block:72px}.service-bridge a{width:100%;justify-content:center}}
</style>
