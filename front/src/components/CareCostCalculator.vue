<template>
  <div class="care-calculator" :class="{ 'care-calculator--compact': compact }">
    <div class="calculator-heading">
      <span>
        <Calculator :size="24" />
      </span>

      <div>
        <small>安心簡易試算</small>
        <h3>先估這次照護費用</h3>
      </div>
    </div>

    <div class="calculator-grid">
      <q-select
        v-model="identity"
        :options="identityOptions"
        emit-value
        map-options
        outlined
        label="補助身分（參考）"
        behavior="menu"
      >
        <template #prepend>
          <BadgeCheck :size="21" />
        </template>

        <template #append>
          <ChevronDown :size="20" />
        </template>
      </q-select>

      <q-select
        v-model="cmsLevel"
        :options="cmsOptions"
        emit-value
        map-options
        outlined
        label="照護等級（參考）"
        behavior="menu"
      >
        <template #prepend>
          <HeartPulse :size="21" />
        </template>

        <template #append>
          <ChevronDown :size="20" />
        </template>
      </q-select>

      <q-select
        v-model="serviceCode"
        :options="serviceOptions"
        emit-value
        map-options
        outlined
        label="需要的服務"
        behavior="menu"
      >
        <template #prepend>
          <HandHeart :size="21" />
        </template>

        <template #append>
          <ChevronDown :size="20" />
        </template>
      </q-select>

      <q-input
        v-model.number="monthlyCount"
        type="number"
        min="1"
        max="120"
        step="1"
        outlined
        label="每月預計使用次數"
        inputmode="numeric"
        @blur="normaliseCount"
      >
        <template #prepend>
          <CalendarDays :size="21" />
        </template>

        <template #append>
          <span class="unit-label">次</span>
        </template>
      </q-input>
    </div>

    <div class="calculator-result" aria-live="polite">
      <div class="result-primary">
        <small>每月預估需自付</small>
        <strong>{{ money(estimatedCopayment) }}</strong>
        <span>{{ identityLabel }}・部分負擔 {{ percentageLabel }}</span>
      </div>

      <dl>
        <div>
          <dt>服務總額</dt>
          <dd>{{ money(serviceTotal) }}</dd>
        </div>

        <div>
          <dt>本級月額度</dt>
          <dd>{{ money(monthlyCeiling) }}</dd>
        </div>

        <div>
          <dt>超出額度自費</dt>
          <dd>{{ money(overCeiling) }}</dd>
        </div>
      </dl>
    </div>

    <p class="calculator-note">
      <Info :size="18" />
      試算僅供參考；實際補助資格與金額依主管機關核定，本平台實際費用以預約內容為準。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BadgeCheck,
  CalendarDays,
  Calculator,
  ChevronDown,
  HandHeart,
  HeartPulse,
  Info,
} from '@lucide/vue';

defineProps<{ compact?: boolean }>();

const identity = ref<'GENERAL' | 'MID_LOW' | 'LOW'>('GENERAL');
const cmsLevel = ref(2);
const serviceCode = ref('BA07');
const monthlyCount = ref(8);

const identityOptions = [
  {
    label: '一般戶（自付 16%）',
    value: 'GENERAL',
    rate: 0.16,
  },
  {
    label: '中低收入戶（自付 5%）',
    value: 'MID_LOW',
    rate: 0.05,
  },
  {
    label: '低收入戶（自付 0%）',
    value: 'LOW',
    rate: 0,
  },
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
  {
    label: 'BA16-1 代購、代領或代送服務（自用）｜130 元／次',
    value: 'BA16-1',
    price: 130,
  },
  { label: 'BA18 安全看視｜200 元／次', value: 'BA18', price: 200 },
  { label: 'BA20 陪伴服務｜175 元／次', value: 'BA20', price: 175 },
  { label: 'BA22 巡視服務｜130 元／次', value: 'BA22', price: 130 },
  { label: 'BA23 協助洗頭｜200 元／次', value: 'BA23', price: 200 },
  { label: 'BA24 協助排泄｜220 元／次', value: 'BA24', price: 220 },
  { label: 'GA09 居家喘息服務（2 小時）｜770 元／次', value: 'GA09', price: 770 },
];

const selectedIdentity = computed(
  () => identityOptions.find((item) => item.value === identity.value)!,
);

const selectedCms = computed(
  () => cmsOptions.find((item) => item.value === cmsLevel.value)!,
);

const selectedService = computed(
  () => serviceOptions.find((item) => item.value === serviceCode.value)!,
);

const monthlyCeiling = computed(() => selectedCms.value.ceiling);

const serviceTotal = computed(
  () => selectedService.value.price * monthlyCount.value,
);

const withinCeiling = computed(() =>
  Math.min(serviceTotal.value, monthlyCeiling.value),
);

const overCeiling = computed(() =>
  Math.max(serviceTotal.value - monthlyCeiling.value, 0),
);

const estimatedCopayment = computed(() =>
  Math.round(
    withinCeiling.value * selectedIdentity.value.rate + overCeiling.value,
  ),
);

const identityLabel = computed(
  () => selectedIdentity.value.label.split('（')[0],
);

const percentageLabel = computed(
  () => `${Math.round(selectedIdentity.value.rate * 100)}%`,
);

function normaliseCount() {
  const value = Number(monthlyCount.value);

  monthlyCount.value = Number.isFinite(value)
    ? Math.min(120, Math.max(1, Math.round(value)))
    : 1;
}

function money(value: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<style scoped>
.care-calculator {
  --ink: #493833;
  --wood: #6e5750;
  --orange: #c85618;
  --peach: #eb9079;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  color: var(--ink);
}

.care-calculator--compact .calculator-heading,
.care-calculator--compact .calculator-note {
  display: none;
}

.calculator-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 20px;
  min-width: 0;
}

.calculator-heading > span {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;

  color: #a74318;
  background: #ffe7de;
  border-radius: 16px;
}

.calculator-heading > div {
  min-width: 0;
}

.calculator-heading small {
  color: var(--orange);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.calculator-heading h3 {
  margin: 3px 0 0;
  font-size: 1.25rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.calculator-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;

  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.calculator-grid > * {
  min-width: 0;
}

.calculator-grid :deep(.q-field) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.calculator-grid :deep(.q-field__inner) {
  min-width: 0;
}

.calculator-grid :deep(.q-field__control) {
  width: 100%;
  min-width: 0;
  min-height: 60px;

  color: #d8c9c2;
  border-radius: 16px;
}

.calculator-grid :deep(.q-field__control-container) {
  min-width: 0;
}

.calculator-grid :deep(.q-field__native),
.calculator-grid :deep(.q-field__input),
.calculator-grid :deep(.q-field__label) {
  min-width: 0;
  color: var(--wood);
  font-size: 1rem;
}

.calculator-grid :deep(.q-field__native),
.calculator-grid :deep(.q-field__input) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.calculator-grid :deep(.q-field__prepend),
.calculator-grid :deep(.q-field__append) {
  color: #765f57;
}

.calculator-grid :deep(.q-select__dropdown-icon) {
  display: none;
}

.unit-label {
  font-size: 0.9rem;
}

.calculator-result {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 18px;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  margin-top: 17px;
  padding: 19px;

  color: #fff;
  background: linear-gradient(130deg, #6e5750, #80665d);
  border-radius: 19px;
}

.result-primary {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.result-primary small {
  color: #ffe0d7;
}

.result-primary strong {
  margin: 4px 0;
  font-size: clamp(2rem, 4vw, 2.7rem);
  line-height: 1;
}

.result-primary span {
  color: #f2e4df;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.calculator-result dl {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  margin: 0;
}

.calculator-result dl div {
  min-width: 0;
  display: flex;
  justify-content: space-between;
  gap: 10px;

  padding-bottom: 5px;
  border-bottom: 1px solid rgb(255 255 255 / 13%);
}

.calculator-result dt {
  min-width: 0;
  color: #eadbd5;
}

.calculator-result dd {
  flex: none;
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
}

.calculator-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  margin: 14px 0 0;

  color: #7e6860;
  font-size: 0.88rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.calculator-note svg {
  flex: none;
  margin-top: 2px;
}

@media (max-width: 620px) {
  .care-calculator {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .calculator-heading {
    align-items: flex-start;
  }

  .calculator-heading h3 {
    font-size: 1.1rem;
  }

  .calculator-grid,
  .calculator-result {
    grid-template-columns: minmax(0, 1fr);
  }

  .calculator-result {
    gap: 13px;
    padding: 18px 16px;
  }

  .calculator-result dl div {
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .calculator-heading {
    gap: 10px;
  }

  .calculator-heading > span {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }

  .calculator-heading h3 {
    font-size: 1.02rem;
  }

  .calculator-grid {
    gap: 11px;
  }

  .calculator-grid :deep(.q-field__native),
  .calculator-grid :deep(.q-field__input),
  .calculator-grid :deep(.q-field__label) {
    font-size: 0.95rem;
  }

  .calculator-result {
    padding: 16px 14px;
    border-radius: 17px;
  }

  .result-primary strong {
    font-size: 2.15rem;
  }
}

/* Warm frosted-glass surface used by the shared calculator. */
.care-calculator {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.calculator-heading > span {
  color: var(--orange);
  background: rgba(255, 231, 220, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 15px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.calculator-heading small {
  display: block;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.calculator-heading h3 {
  margin-top: 4px;
  font-size: clamp(1.35rem, 1.5vw, 1.7rem);
  font-weight: 800;
}

.calculator-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.care-calculator :deep(.q-field--outlined .q-field__control) {
  min-height: 58px;
  background: rgba(255, 253, 251, .58);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.care-calculator :deep(.q-field--outlined .q-field__control::before) {
  border: 1px solid rgba(110, 87, 80, 0.2);
}

.care-calculator :deep(.q-field--outlined:hover .q-field__control::before) {
  border-color: rgba(200, 86, 24, 0.3);
}

.care-calculator :deep(.q-field--focused .q-field__control) {
  background: rgba(255, 253, 251, 0.74);
  box-shadow: 0 0 0 3px rgba(200, 86, 24, 0.09);
}

.care-calculator :deep(.q-field--focused .q-field__control::after) {
  border-color: var(--orange);
  border-width: 1px;
}

.care-calculator :deep(.q-field__label) {
  color: rgba(110, 87, 80, 0.82);
  font-size: 0.82rem;
}

.care-calculator :deep(.q-field__native),
.care-calculator :deep(.q-field__input) {
  color: var(--ink);
  font-weight: 650;
}

.unit-label {
  color: var(--wood);
  font-size: 0.82rem;
}

.calculator-result {
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.95fr);
  gap: 28px;
  margin-top: 18px;
  padding: 22px 24px;
  color: #fffdfb;
  background: linear-gradient(135deg, rgba(99, 72, 62, 0.9), rgba(121, 88, 76, 0.84));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 22px rgba(73, 56, 51, 0.1);
}

.result-primary small { color: rgba(255, 253, 251, 0.78); font-size: 0.8rem; }
.result-primary strong { margin: 4px 0 0; color: #fffdfb; font-size: clamp(2.3rem, 3vw, 3.4rem); font-weight: 700; }
.result-primary span { margin-top: 10px; color: rgba(255, 253, 251, 0.72); font-size: 0.82rem; }
.calculator-result dl { gap: 0; }
.calculator-result dl div { gap: 16px; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.12); }
.calculator-result dl div:last-child { border-bottom: 0; }
.calculator-result dt { color: rgba(255, 253, 251, 0.72); }
.calculator-result dd { color: #fffdfb; font-weight: 750; }
.calculator-note { margin-top: 16px; padding-top: 14px; color: rgba(73, 56, 51, 0.78); border-top: 1px solid rgba(110, 87, 80, 0.11); font-size: 0.74rem; line-height: 1.6; }

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .care-calculator :deep(.q-field--outlined .q-field__control) { background: rgba(255, 253, 251, 0.94); }
}

@media (max-width: 599px) {
  .calculator-grid, .calculator-result { grid-template-columns: 1fr; }
  .calculator-grid { gap: 11px; }
  .calculator-result { gap: 14px; padding: 20px; }
  .result-primary strong { font-size: 2.45rem; }
}

@media (prefers-reduced-motion: reduce) {
  .care-calculator :deep(.q-field__control) { transition: none; }
}
</style>
