<template>
  <q-page class="recipient-page">
    <main class="recipient-shell">
      <router-link class="back-link" to="/users"><ArrowLeft :size="20" /> 回到我的照護首頁</router-link>

      <section class="recipient-intro">
        <div class="recipient-intro__icon"><HeartHandshake :size="34" /></div>
        <div>
          <span>建立受照護者資料</span>
          <h1>讓居服員在出發前，先好好認識家人</h1>
          <p>填寫生活狀況、移動需求與注意事項，能幫助居服員判斷需要準備的輔具與人力。</p>
        </div>
      </section>

      <q-form ref="formRef" class="recipient-form" @submit.prevent="submitRecipient">
        <section class="form-section" aria-labelledby="basic-title">
          <header><span>1</span><div><h2 id="basic-title">先認識基本資料</h2><p>標示「必填」的欄位請務必填寫。</p></div></header>
          <div class="form-grid">
            <q-input v-model="form.name" outlined label="受照護者姓名（必填）" :rules="[required('請填寫受照護者姓名')]" lazy-rules><template #prepend><UserRound :size="21" /></template></q-input>
            <q-input v-model="form.phone" outlined label="聯絡電話" type="tel"><template #prepend><Phone :size="21" /></template></q-input>
            <q-input v-model="form.birthDate" outlined label="出生日期" type="date" :max="today"><template #prepend><CalendarDays :size="21" /></template></q-input>
            <q-select v-model="form.gender" outlined label="性別／稱謂" :options="genderOptions" emit-value map-options><template #prepend><UsersRound :size="21" /></template><template #append><ChevronDown :size="20" /></template></q-select>
            <q-input v-model="form.relationship" outlined label="您與受照護者的關係（必填）" :rules="[required('請填寫您與受照護者的關係')]" lazy-rules><template #prepend><Heart :size="21" /></template></q-input>
            <q-input v-model="form.addressText" outlined label="主要照護地址（必填）" :rules="[required('請填寫主要照護地址')]" lazy-rules><template #prepend><MapPin :size="21" /></template></q-input>
          </div>
        </section>

        <section class="form-section" aria-labelledby="care-title">
          <header><span>2</span><div><h2 id="care-title">照護與行動需求</h2><p>越清楚的資訊，越能媒合適合的居服員。</p></div></header>
          <div class="form-grid">
            <q-select v-model="form.careLevel" outlined label="目前照護需求程度" :options="careLevelOptions" emit-value map-options><template #prepend><Activity :size="21" /></template><template #append><ChevronDown :size="20" /></template></q-select>
            <q-select v-model="form.mobilityStatus" outlined label="行動狀況" :options="mobilityOptions" emit-value map-options><template #prepend><Accessibility :size="21" /></template><template #append><ChevronDown :size="20" /></template></q-select>
            <q-input v-model.number="form.heightCm" outlined type="number" min="60" max="220" label="身高（公分）"><template #prepend><Ruler :size="21" /></template></q-input>
            <q-input v-model.number="form.weightKg" outlined type="number" min="20" max="250" label="體重（公斤）"><template #prepend><Scale :size="21" /></template></q-input>
            <q-input v-model="form.transferSupport" outlined label="移位時需要的協助"><template #prepend><PersonStanding :size="21" /></template></q-input>
            <q-input v-model="form.bathingSupport" outlined label="沐浴時需要的協助"><template #prepend><Bath :size="21" /></template></q-input>
            <q-select v-model="form.assistiveDevices" class="full" outlined multiple use-chips label="目前使用的輔具" :options="deviceOptions"><template #prepend><Accessibility :size="21" /></template><template #append><ChevronDown :size="20" /></template></q-select>
            <q-input v-model="form.homeEnvironmentNotes" class="full" outlined autogrow label="住家環境與交通提醒"><template #prepend><House :size="21" /></template></q-input>
          </div>
        </section>

        <section class="form-section" aria-labelledby="notes-title">
          <header><span>3</span><div><h2 id="notes-title">健康提醒與生活近照</h2><p>照片只供媒合與接案評估使用，最多四張。</p></div></header>
          <div class="form-grid">
            <q-input v-model="form.allergyNotes" outlined autogrow label="過敏或需要避開的事項" />
            <q-input v-model="form.medicalNotes" outlined autogrow label="健康與用藥提醒" />
            <q-input v-model="form.attentionNotes" class="full" outlined autogrow label="希望居服員特別留意的事情" />
            <q-file v-model="carePhotos" class="full" outlined multiple append accept=".jpg,.jpeg,.png,.webp" label="上傳受照護者生活近照（最多 4 張）" counter :max-files="4" :max-file-size="8 * 1024 * 1024" @rejected="fileRejected"><template #prepend><Images :size="22" /></template></q-file>
            <div v-if="photoPreviews.length" class="photo-preview-grid full" aria-label="生活近照預覽">
              <q-img v-for="(src, index) in photoPreviews" :key="src" :src="src" ratio="1.33" :alt="`受照護者生活近照預覽 ${index + 1}`" />
            </div>
          </div>
        </section>

        <section class="form-section" aria-labelledby="contact-title">
          <header><span>4</span><div><h2 id="contact-title">緊急聯絡人</h2><p>遇到需要立即確認的情況，我們會優先聯繫這位家人。</p></div></header>
          <div class="form-grid three-columns">
            <q-input v-model="form.emergencyContactName" outlined label="聯絡人姓名" />
            <q-input v-model="form.emergencyContactPhone" outlined type="tel" label="聯絡人電話" />
            <q-input v-model="form.emergencyContactRelationship" outlined label="與受照護者的關係" />
          </div>
        </section>

        <div v-if="submitError" class="form-error" role="alert"><CircleAlert :size="21" /> {{ submitError }}</div>
        <div class="form-actions">
          <router-link to="/users"><ArrowLeft :size="20" /> 先回去想一想</router-link>
          <q-btn unelevated no-caps type="submit" :loading="submitting" class="submit-button"><Heart :size="20" /><span>安心儲存家人資料</span></q-btn>
        </div>
      </q-form>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { QForm } from 'quasar';
import {
  Accessibility, Activity, ArrowLeft, Bath, CalendarDays, ChevronDown, CircleAlert, Heart,
  HeartHandshake, House, Images, MapPin, PersonStanding, Phone, Ruler, Scale,
  UserRound, UsersRound,
} from '@lucide/vue';
import { api } from '@/boot/axios';

const router = useRouter();
const formRef = ref<QForm>();
const submitting = ref(false);
const submitError = ref('');
const carePhotos = ref<File[]>([]);
const photoPreviews = ref<string[]>([]);
const today = new Date().toISOString().slice(0, 10);

const form = reactive({
  name: '', phone: '', birthDate: '', gender: '', relationship: '', addressText: '',
  careLevel: '', mobilityStatus: '', heightCm: undefined as number | undefined,
  weightKg: undefined as number | undefined, transferSupport: '', bathingSupport: '',
  assistiveDevices: [] as string[], homeEnvironmentNotes: '', allergyNotes: '',
  medicalNotes: '', attentionNotes: '', emergencyContactName: '',
  emergencyContactPhone: '', emergencyContactRelationship: '',
});

const genderOptions = [{ label: '女性', value: '女性' }, { label: '男性', value: '男性' }, { label: '其他／希望自行說明', value: '其他' }];
const careLevelOptions = ['輕度協助', '中度協助', '高度協助', '尚未評估'].map(value => ({ label: value, value }));
const mobilityOptions = ['可自行行走', '需攙扶', '使用助行器', '使用輪椅', '多數時間臥床'].map(value => ({ label: value, value }));
const deviceOptions = ['助行器', '輪椅', '拐杖', '移位帶', '洗澡椅', '照護床'];
const required = (message: string) => (value: unknown) => Boolean(value) || message;

watch(carePhotos, (files) => {
  photoPreviews.value.forEach(URL.revokeObjectURL);
  photoPreviews.value = files.map(file => URL.createObjectURL(file));
});

onBeforeUnmount(() => photoPreviews.value.forEach(URL.revokeObjectURL));

function fileRejected() {
  submitError.value = '照片最多 4 張，每張不可超過 8 MB，請選擇 JPG、PNG 或 WebP。';
}

async function submitRecipient() {
  submitError.value = '';
  submitting.value = true;
  try {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value === '' || value === undefined) return;
      payload.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    });
    carePhotos.value.forEach(file => payload.append('carePhotos', file));
    await api.post('/patients', payload);
    await router.push({ path: '/users', query: { recipientSaved: '1' } });
  } catch (error: any) {
    submitError.value = error?.response?.data?.message || '資料暫時無法儲存，請檢查網路後再試一次。';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.recipient-page{--milk:#fff9f5;--paper:#fffdfb;--ink:#493833;--wood:#6e5750;--peach:#eb9079;--persimmon:#b84f16;min-height:100%;color:var(--ink);background:var(--milk)}
.recipient-page :deep(.q-select__dropdown-icon){display:none}
.recipient-shell{width:min(1060px,100%);margin:0 auto;padding:28px 24px 72px}.back-link{min-height:44px;display:inline-flex;align-items:center;gap:8px;color:var(--wood);font-weight:700;text-decoration:none}.recipient-intro{display:flex;align-items:center;gap:20px;margin:18px 0 24px;padding:30px 34px;color:white;background:linear-gradient(120deg,#6e5750,#846b61);border-radius:28px;box-shadow:0 18px 42px rgb(78 52 43 / 13%)}.recipient-intro__icon{flex:0 0 68px;width:68px;height:68px;display:grid;place-items:center;color:#9c421b;background:#fff3ed;border-radius:22px}.recipient-intro span{color:#ffd7ca;font-weight:700;letter-spacing:.12em}.recipient-intro h1{margin:5px 0 6px;font-size:clamp(1.8rem,4vw,2.65rem);line-height:1.25}.recipient-intro p{max-width:720px;margin:0;color:#f5e9e4;font-size:1.02rem;line-height:1.65}.recipient-form{display:flex;flex-direction:column;gap:20px}.form-section{padding:30px 34px;background:var(--paper);border:1px solid rgb(110 87 80 / 12%);border-radius:24px;box-shadow:0 12px 32px rgb(78 52 43 / 7%)}.form-section>header{display:flex;gap:14px;margin-bottom:24px}.form-section>header>span{flex:0 0 36px;width:36px;height:36px;display:grid;place-items:center;color:white;background:var(--peach);border-radius:50%;font-weight:700}.form-section h2{margin:2px 0 5px;font-size:1.45rem}.form-section p{margin:0;color:#816a62;line-height:1.55}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.three-columns{grid-template-columns:repeat(3,minmax(0,1fr))}.full{grid-column:1/-1}.photo-preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.photo-preview-grid :deep(.q-img){overflow:hidden;border-radius:18px;border:1px solid rgb(110 87 80 / 14%)}.recipient-form :deep(.q-field__control){min-height:58px;color:var(--peach);border-radius:15px}.recipient-form :deep(.q-field__native),.recipient-form :deep(.q-field__label){color:var(--ink);font-size:1rem}.form-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:8px}.form-actions>a,.submit-button{min-height:52px;display:inline-flex;align-items:center;gap:8px;padding:0 22px;border-radius:15px;font-weight:700;text-decoration:none}.form-actions>a{color:var(--wood);border:1px solid #a88d83}.submit-button{color:white;background:var(--persimmon);box-shadow:0 12px 26px rgb(184 79 22 / 20%)}.form-error{display:flex;align-items:center;gap:9px;padding:15px 18px;color:#9e3129;background:#fff0ed;border-radius:14px}a:focus-visible,.submit-button:focus-visible{outline:3px solid #ee9b84;outline-offset:3px}
@media(max-width:720px){.recipient-shell{padding:18px 12px 48px}.recipient-intro{align-items:flex-start;padding:24px 20px;border-radius:23px}.recipient-intro__icon{flex-basis:54px;width:54px;height:54px}.form-section{padding:24px 18px}.form-grid,.three-columns{grid-template-columns:1fr}.photo-preview-grid{grid-template-columns:repeat(2,1fr)}.form-actions{align-items:stretch;flex-direction:column-reverse}.form-actions>a,.submit-button{width:100%;justify-content:center}.recipient-intro h1{font-size:1.75rem}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
