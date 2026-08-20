<template>
  <div class="care-calculator" :class="{ 'care-calculator--compact': compact }">
    <div class="calculator-heading">
      <span><Calculator :size="24" /></span>
      <div>
        <small>安心簡易試算</small>
        <h3>先選四項，就能看到預估費用</h3>
      </div>
    </div>

    <div class="calculator-grid">
      <q-select v-model="identity" :options="identityOptions" emit-value map-options outlined label="政府核定身分" behavior="menu">
        <template #prepend><BadgeCheck :size="21" /></template>
        <template #append><ChevronDown :size="20" /></template>
      </q-select>
      <q-select v-model="cmsLevel" :options="cmsOptions" emit-value map-options outlined label="CMS 長照等級" behavior="menu">
        <template #prepend><HeartPulse :size="21" /></template>
        <template #append><ChevronDown :size="20" /></template>
      </q-select>
      <q-select v-model="serviceCode" :options="serviceOptions" emit-value map-options outlined label="需要的服務" behavior="menu">
        <template #prepend><HandHeart :size="21" /></template>
        <template #append><ChevronDown :size="20" /></template>
      </q-select>
      <q-input v-model.number="monthlyCount" type="number" min="1" max="120" step="1" outlined label="每月預計使用次數" inputmode="numeric" @blur="normaliseCount">
        <template #prepend><CalendarDays :size="21" /></template>
        <template #append><span class="unit-label">次</span></template>
      </q-input>
    </div>

    <div class="calculator-result" aria-live="polite">
      <div class="result-primary">
        <small>每月預估需自付</small>
        <strong>{{ money(estimatedCopayment) }}</strong>
        <span>{{ identityLabel }}・部分負擔 {{ percentageLabel }}</span>
      </div>
      <dl>
        <div><dt>服務總額</dt><dd>{{ money(serviceTotal) }}</dd></div>
        <div><dt>本級月額度</dt><dd>{{ money(monthlyCeiling) }}</dd></div>
        <div><dt>超出額度自費</dt><dd>{{ money(overCeiling) }}</dd></div>
      </dl>
    </div>

    <p class="calculator-note"><Info :size="18" /> 此為簡易估算；實際項目、次數與補助，以照管專員核定的照顧計畫及服務單位帳單為準。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { BadgeCheck, CalendarDays, Calculator, ChevronDown, HandHeart, HeartPulse, Info } from '@lucide/vue';

defineProps<{ compact?: boolean }>();

const identity = ref<'GENERAL' | 'MID_LOW' | 'LOW'>('GENERAL');
const cmsLevel = ref(2);
const serviceCode = ref('BA07');
const monthlyCount = ref(8);

const identityOptions = [
  { label: '一般戶（自付 16%）', value: 'GENERAL', rate: .16 },
  { label: '中低收入戶（自付 5%）', value: 'MID_LOW', rate: .05 },
  { label: '低收入戶（自付 0%）', value: 'LOW', rate: 0 },
];
const cmsOptions = [
  { label: '第 2 級（輕度）', value: 2, ceiling: 10020 },
  { label: '第 3 級（輕度）', value: 3, ceiling: 15460 },
  { label: '第 4 級（中度）', value: 4, ceiling: 18580 },
  { label: '第 5 級（中度）', value: 5, ceiling: 24100 },
  { label: '第 6 級（中度）', value: 6, ceiling: 28070 },
  { label: '第 7 級（重度）', value: 7, ceiling: 32090 },
  { label: '第 8 級（重度）', value: 8, ceiling: 36180 },
];
const serviceOptions = [
  { label: 'BA01 基本身體清潔｜260 元／次', value: 'BA01', price: 260 },
  { label: 'BA02 基本日常照顧｜195 元／次', value: 'BA02', price: 195 },
  { label: 'BA03 測量生命徵象｜35 元／次', value: 'BA03', price: 35 },
  { label: 'BA04 協助進食或管灌餵食｜130 元／次', value: 'BA04', price: 130 },
  { label: 'BA05 餐食照顧｜310 元／次', value: 'BA05', price: 310 },
  { label: 'BA07 協助沐浴及洗頭｜325 元／次', value: 'BA07', price: 325 },
  { label: 'BA10 翻身拍背｜155 元／次', value: 'BA10', price: 155 },
  { label: 'BA11 肢體關節活動｜195 元／次', value: 'BA11', price: 195 },
  { label: 'BA12 協助上（下）樓梯｜130 元／次', value: 'BA12', price: 130 },
  { label: 'BA13 陪同外出｜195 元／次', value: 'BA13', price: 195 },
  { label: 'BA14 陪同就醫｜685 元／次', value: 'BA14', price: 685 },
  { label: 'BA15-1 家務協助（自用）｜195 元／次', value: 'BA15-1', price: 195 },
  { label: 'BA16-1 代購、代領或代送服務（自用）｜130 元／次', value: 'BA16-1', price: 130 },
  { label: 'BA18 安全看視｜200 元／次', value: 'BA18', price: 200 },
  { label: 'BA20 陪伴服務｜175 元／次', value: 'BA20', price: 175 },
  { label: 'BA22 巡視服務｜130 元／次', value: 'BA22', price: 130 },
  { label: 'BA23 協助洗頭｜200 元／次', value: 'BA23', price: 200 },
  { label: 'BA24 協助排泄｜220 元／次', value: 'BA24', price: 220 },
  { label: 'GA09 居家喘息服務（2 小時）｜770 元／次', value: 'GA09', price: 770 },
];

const selectedIdentity = computed(() => identityOptions.find((item) => item.value === identity.value)!);
const selectedCms = computed(() => cmsOptions.find((item) => item.value === cmsLevel.value)!);
const selectedService = computed(() => serviceOptions.find((item) => item.value === serviceCode.value)!);
const monthlyCeiling = computed(() => selectedCms.value.ceiling);
const serviceTotal = computed(() => selectedService.value.price * monthlyCount.value);
const withinCeiling = computed(() => Math.min(serviceTotal.value, monthlyCeiling.value));
const overCeiling = computed(() => Math.max(serviceTotal.value - monthlyCeiling.value, 0));
const estimatedCopayment = computed(() => Math.round(withinCeiling.value * selectedIdentity.value.rate + overCeiling.value));
const identityLabel = computed(() => selectedIdentity.value.label.split('（')[0]);
const percentageLabel = computed(() => `${Math.round(selectedIdentity.value.rate * 100)}%`);

function normaliseCount() {
  const value = Number(monthlyCount.value);
  monthlyCount.value = Number.isFinite(value) ? Math.min(120, Math.max(1, Math.round(value))) : 1;
}

function money(value: number) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);
}
</script>

<style scoped>
.care-calculator{--ink:#493833;--wood:#6e5750;--orange:#c85618;--peach:#eb9079;color:var(--ink)}
.calculator-heading{display:flex;align-items:center;gap:13px;margin-bottom:20px}.calculator-heading>span{width:48px;height:48px;display:grid;place-items:center;color:#a74318;background:#ffe7de;border-radius:16px}.calculator-heading small{color:var(--orange);font-weight:700;letter-spacing:.08em}.calculator-heading h3{margin:3px 0 0;font-size:1.25rem;line-height:1.35}
.calculator-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.calculator-grid :deep(.q-field__control){min-height:60px;color:#d8c9c2;border-radius:16px}.calculator-grid :deep(.q-field__native),.calculator-grid :deep(.q-field__input),.calculator-grid :deep(.q-field__label){color:var(--wood);font-size:1rem}.calculator-grid :deep(.q-field__prepend),.calculator-grid :deep(.q-field__append){color:#765f57}.calculator-grid :deep(.q-select__dropdown-icon){display:none}.unit-label{font-size:.9rem}
.calculator-result{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;margin-top:17px;padding:19px;color:#fff;background:linear-gradient(130deg,#6e5750,#80665d);border-radius:19px}.result-primary{display:flex;flex-direction:column}.result-primary small{color:#ffe0d7}.result-primary strong{margin:4px 0;font-size:clamp(2rem,4vw,2.7rem);line-height:1}.result-primary span{color:#f2e4df;font-size:.9rem}.calculator-result dl{display:flex;flex-direction:column;justify-content:center;gap:6px;margin:0}.calculator-result dl div{display:flex;justify-content:space-between;gap:10px;padding-bottom:5px;border-bottom:1px solid rgb(255 255 255 / 13%)}.calculator-result dt{color:#eadbd5}.calculator-result dd{margin:0;font-weight:700}.calculator-note{display:flex;align-items:flex-start;gap:8px;margin:14px 0 0;color:#7e6860;font-size:.88rem;line-height:1.55}.calculator-note svg{flex:none;margin-top:2px}
@media(max-width:620px){.calculator-grid,.calculator-result{grid-template-columns:1fr}.calculator-result{gap:13px}.calculator-heading h3{font-size:1.1rem}}
</style>
