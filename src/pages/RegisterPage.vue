<template>
  <div class="register-page">
    <header class="register-header">
      <router-link class="brand" to="/login" aria-label="返回照安心登入頁">
        <img src="/chioansimicon.svg" alt="" class="brand__logo">
        <span>照安心</span>
      </router-link>
      <span class="header-note"><ShieldCheck :size="20" /> 資料加密保護，請安心填寫</span>
    </header>

    <main class="register-shell">
      <section class="intro-card">
        <div class="role-icon" aria-hidden="true">
          <component :is="roleContent.icon" :size="38" :stroke-width="1.8" />
        </div>
        <p class="eyebrow">{{ roleContent.eyebrow }}</p>
        <h1>{{ roleContent.title }}</h1>
        <p>{{ roleContent.description }}</p>
        <div class="role-reminder">
          <HeartHandshake :size="23" />
          <span>{{ roleContent.reminder }}</span>
        </div>
      </section>

      <section class="form-card" aria-labelledby="register-title">
        <div class="section-heading">
          <span class="step-mark">1</span>
          <div>
            <h2 id="register-title">先認識基本資料</h2>
            <p>標示「必填」的欄位請務必填寫，其餘資料之後也能補充。</p>
          </div>
        </div>

        <q-form class="register-form" @submit.prevent="submitRegistration">
          <div class="field-grid">
            <q-input v-model.trim="form.name" outlined label="您的姓名（必填）" autocomplete="name"
              :rules="[required('請告訴我們怎麼稱呼您')]">
              <template #prepend><UserRound :size="21" /></template>
            </q-input>
            <q-input v-model.trim="form.phone" outlined label="聯絡電話" autocomplete="tel">
              <template #prepend><Phone :size="21" /></template>
            </q-input>
            <q-input v-model.trim="form.email" outlined label="電子信箱" type="email" autocomplete="email">
              <template #prepend><Mail :size="21" /></template>
            </q-input>
            <q-input v-model.trim="form.account" outlined label="登入帳號（必填）" autocomplete="username"
              :rules="[required('請設定一組登入帳號')]">
              <template #prepend><BadgeCheck :size="21" /></template>
            </q-input>
            <q-input v-model="form.password" outlined label="登入密碼（至少 8 個字元）" autocomplete="new-password"
              :type="showPassword ? 'text' : 'password'"
              :rules="[(value) => value.length >= 8 || '為了帳號安全，密碼請至少設定 8 個字元']">
              <template #prepend><LockKeyhole :size="21" /></template>
              <template #append>
                <button class="icon-button" type="button" :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
                  @click="showPassword = !showPassword">
                  <EyeOff v-if="showPassword" :size="21" />
                  <Eye v-else :size="21" />
                </button>
              </template>
            </q-input>
            <q-input v-model="form.passwordConfirm" outlined label="再輸入一次密碼（必填）"
              :type="showPassword ? 'text' : 'password'"
              :rules="[(value) => value === form.password || '兩次輸入的密碼不一致，請再確認一次']">
              <template #prepend><KeyRound :size="21" /></template>
            </q-input>
          </div>

          <template v-if="role === 'USER'">
            <div class="section-heading section-heading--inside">
              <span class="step-mark">2</span>
              <div><h2>您準備為誰安排照護？</h2><p>替家人安排時，可先提供實際照護情況，讓居服員安心評估。</p></div>
            </div>
            <div class="choice-grid">
              <label :class="['choice-card', { 'is-selected': userPurpose === 'FAMILY' }]">
                <q-radio v-model="userPurpose" val="FAMILY" />
                <UsersRound :size="27" />
                <span><strong>替家人安排</strong><small>建立受照護者資料與家屬關係</small></span>
              </label>
              <label :class="['choice-card', { 'is-selected': userPurpose === 'SELF' }]">
                <q-radio v-model="userPurpose" val="SELF" />
                <UserRound :size="27" />
                <span><strong>自己使用服務</strong><small>不建立受照護者也能提出預約需求</small></span>
              </label>
            </div>
          </template>

          <template v-if="role === 'PATIENT' || (role === 'USER' && userPurpose === 'FAMILY')">
            <div class="section-heading section-heading--inside">
              <span class="step-mark">{{ role === 'USER' ? 3 : 2 }}</span>
              <div>
                <h2>受照護者的實際生活情況</h2>
                <p>移位、沐浴與居家環境資訊，能幫助居服員在接案前判斷是否需要兩人協助。</p>
              </div>
            </div>
            <div class="field-grid">
              <q-input v-if="role === 'USER'" v-model.trim="patient.name" outlined label="受照護者姓名（必填）"
                :rules="[required('請填寫需要照護的家人姓名')]">
                <template #prepend><UserRound :size="21" /></template>
              </q-input>
              <q-input v-model="patient.birthDate" outlined label="出生日期" type="date" stack-label
                min="1900-01-01" :max="today" :rules="birthDateRules">
                <template #prepend><CakeSlice :size="21" /></template>
                <template #append>
                  <button type="button" class="date-picker-button" aria-label="開啟出生日期選擇器"
                    @click="openDatePicker">
                    <CalendarDays :size="20" />
                  </button>
                </template>
              </q-input>
              <q-select v-model="patient.gender" outlined label="性別／稱謂" :options="genderOptions">
                <template #prepend><UsersRound :size="21" /></template>
                <template #append><ChevronDown class="select-chevron" :size="20" aria-hidden="true" /></template>
              </q-select>
              <q-select v-model="patient.careLevel" outlined label="目前照護需求程度" :options="careLevelOptions">
                <template #prepend><HeartPulse :size="21" /></template>
                <template #append><ChevronDown class="select-chevron" :size="20" aria-hidden="true" /></template>
              </q-select>
              <q-select v-model="patient.mobilityStatus" outlined label="行動狀況" :options="mobilityOptions">
                <template #prepend><Accessibility :size="21" /></template>
                <template #append><ChevronDown class="select-chevron" :size="20" aria-hidden="true" /></template>
              </q-select>
              <q-input v-model.number="patient.heightCm" outlined type="number" min="50" max="250" label="身高（公分）">
                <template #prepend><Ruler :size="21" /></template>
              </q-input>
              <q-input v-model.number="patient.weightKg" outlined type="number" min="10" max="300" label="體重（公斤）">
                <template #prepend><Weight :size="21" /></template>
              </q-input>
              <q-select v-model="patient.transferSupport" outlined label="起身／移位需要的協助" :options="transferOptions">
                <template #prepend><PersonStanding :size="21" /></template>
                <template #append><ChevronDown class="select-chevron" :size="20" aria-hidden="true" /></template>
              </q-select>
              <q-input v-model.trim="patient.bathingSupport" outlined label="洗澡時需要如何協助" />
              <q-input v-model.trim="patient.assistiveDevices" outlined label="目前使用的輔具（以逗號分隔）" />
              <q-input v-model.trim="patient.address" outlined label="主要照護地址" class="field-grid__wide">
                <template #prepend><MapPin :size="21" /></template>
              </q-input>
              <q-input v-model.trim="patient.allergyNotes" outlined autogrow label="過敏或需要避開的事項" />
              <q-input v-model.trim="patient.medicalNotes" outlined autogrow label="健康與用藥提醒" />
              <q-input v-model.trim="patient.attentionNotes" outlined autogrow label="希望服務人員特別留意的事情" class="field-grid__wide" />
              <q-input v-model.trim="patient.homeEnvironmentNotes" outlined autogrow
                label="居家環境與搬運提醒（例如樓梯、浴室空間、是否需要兩人協助）" class="field-grid__wide" />
            </div>

            <div class="recipient-photo-field">
              <div class="profile-photo-copy">
                <span class="profile-photo-copy__icon" aria-hidden="true"><Camera :size="23" /></span>
                <div>
                  <h3>提供受照護者近況照片</h3>
                  <p>建議提供全身或日常活動照片，讓居服員先評估移位、沐浴與照護人力；最多 3 張。</p>
                </div>
              </div>
              <div v-if="recipientPhotoPreviews.length" class="recipient-photo-preview" aria-label="受照護者照片預覽">
                <img v-for="(photo, index) in recipientPhotoPreviews" :key="photo" :src="photo"
                  :alt="`受照護者近況照片預覽 ${index + 1}`">
              </div>
              <q-file v-model="patient.photos" outlined multiple counter use-chips
                label="上傳受照護者近況照片（建議提供）" accept=".jpg,.jpeg,.png,.webp"
                :max-files="3" max-file-size="8388608">
                <template #prepend><UploadCloud :size="23" /></template>
                <template #hint>請先取得本人或家屬同意；支援 JPG、PNG、WebP，每張上限 8 MB</template>
              </q-file>
            </div>

            <h3 class="subheading"><Siren :size="21" /> 緊急聯絡人</h3>
            <div class="field-grid field-grid--three">
              <q-input v-model.trim="patient.emergencyName" outlined label="聯絡人姓名" />
              <q-input v-model.trim="patient.emergencyPhone" outlined label="聯絡人電話" />
              <q-input v-model.trim="patient.emergencyRelationship" outlined label="與您的關係" />
            </div>
          </template>

          <template v-if="role === 'NURSE'">
            <div class="section-heading section-heading--inside">
              <span class="step-mark">2</span>
              <div><h2>專業經歷與政府證照</h2><p>帳號建立後即可使用網站；證照核准後才會開放工作任務與接案權限。</p></div>
            </div>
            <div class="field-grid">
              <q-input v-model.trim="nurse.certificateName" outlined label="證照名稱（必填）"
                :rules="[required('請填寫政府核准證照名稱')]">
                <template #prepend><Award :size="21" /></template>
              </q-input>
              <q-input v-model.trim="nurse.certificateNumber" outlined label="技術士證號（必填）"
                hint="此證號將作為技術士資格查核依據"
                :rules="[required('請填寫技術士證號')]">
                <template #prepend><FileBadge2 :size="21" /></template>
              </q-input>
              <q-input v-model.trim="nurse.issuingAuthority" outlined label="發證機關">
                <template #prepend><Landmark :size="21" /></template>
              </q-input>
              <q-input v-model="nurse.certificateExpiresAt" outlined type="date" stack-label label="證照有效期限">
                <template #prepend><CalendarCheck2 :size="21" /></template>
                <template #append>
                  <button type="button" class="date-picker-button" aria-label="開啟證照有效期限選擇器"
                    @click="openDatePicker">
                    <CalendarDays :size="20" />
                  </button>
                </template>
              </q-input>
              <q-input v-model.number="nurse.yearsExperience" outlined type="number" min="0" label="服務年資（年）">
                <template #prepend><BriefcaseBusiness :size="21" /></template>
              </q-input>
              <q-input v-model.trim="nurse.transportation" outlined label="主要交通方式">
                <template #prepend><CarFront :size="21" /></template>
              </q-input>
              <q-input v-model.trim="nurse.serviceAreas" outlined label="可服務地區（以逗號分隔）" class="field-grid__wide">
                <template #prepend><MapPinned :size="21" /></template>
              </q-input>
              <q-input v-model.trim="nurse.introduction" outlined autogrow label="給家庭的一段自我介紹" class="field-grid__wide" />

              <div class="profile-photo-field field-grid__wide">
                <div class="profile-photo-copy">
                  <span class="profile-photo-copy__icon" aria-hidden="true"><Camera :size="23" /></span>
                  <div>
                    <h3>讓家庭先安心認識您</h3>
                    <p>請提供一張本人近照，或近半年內能清楚辨識您的生活照。</p>
                  </div>
                </div>

                <div class="profile-photo-preview">
                  <div class="profile-photo-preview__frame">
                    <img
                      v-if="profilePhotoPreview"
                      :src="profilePhotoPreview"
                      alt="您選擇的居服員個人近照預覽"
                      class="profile-photo-preview__image"
                    >
                    <div v-else class="profile-photo-preview__empty">
                      <ImageIcon :size="34" :stroke-width="1.7" />
                      <span>選擇照片後<br>會在這裡預覽</span>
                    </div>
                  </div>
                  <div class="profile-photo-preview__guide">
                    <strong>照片小提醒</strong>
                    <ul>
                      <li>正面、光線充足，臉部清楚可見</li>
                      <li>請勿使用過度濾鏡或多人合照</li>
                    </ul>
                    <span v-if="profilePhotoPreview" class="profile-photo-preview__ready">
                      <CircleCheckBig :size="18" /> 照片已準備好，請確認是您本人
                    </span>
                  </div>
                </div>

                <q-file
                  v-model="nurse.profilePhoto"
                  outlined
                  counter
                  label="上傳本人近照（必填）"
                  accept=".jpg,.jpeg,.png,.webp"
                  max-file-size="8388608"
                  :rules="[(value) => Boolean(value) || '請上傳一張能清楚辨識本人的近照']"
                >
                  <template #prepend><UploadCloud :size="23" /></template>
                  <template v-if="nurse.profilePhoto" #append>
                    <button type="button" class="file-clear-button" aria-label="移除本人近照" @click.stop="nurse.profilePhoto = null">
                      <X :size="20" />
                    </button>
                  </template>
                  <template #hint>支援 JPG、PNG、WebP，檔案上限 8 MB</template>
                </q-file>
              </div>

              <q-file v-model="nurse.certificate" outlined counter class="field-grid__wide certificate-file"
                label="上傳中華民國技術士證圖檔或 PDF（必填）" accept=".jpg,.jpeg,.png,.webp,.pdf"
                max-file-size="8388608" :rules="[(value) => Boolean(value) || '請上傳政府核准證照']">
                <template #prepend><UploadCloud :size="23" /></template>
                <template v-if="nurse.certificate" #append>
                  <button type="button" class="file-clear-button" aria-label="移除政府證照檔案" @click.stop="nurse.certificate = null">
                    <X :size="20" />
                  </button>
                </template>
                <template #hint>支援 JPG、PNG、WebP、PDF，檔案上限 8 MB</template>
              </q-file>
            </div>
          </template>

          <label class="consent-row">
            <q-checkbox v-model="agreed" />
            <span>我已閱讀並同意照安心的服務條款與個人資料使用說明。</span>
          </label>

          <div v-if="errorMessage" class="form-message form-message--error" role="alert">
            <CircleAlert :size="21" /> {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="form-message form-message--success" role="status">
            <CircleCheckBig :size="22" /> {{ successMessage }}
          </div>

          <div class="form-actions">
            <q-btn outline no-caps class="back-action" type="button" @click="router.back()">
              <ArrowLeft :size="20" /><span>先回到安心入口</span>
            </q-btn>
            <q-btn unelevated no-caps class="submit-action" type="submit" :loading="loading" :disable="Boolean(successMessage)">
              <Heart :size="20" fill="currentColor" />
              <span>{{ role === 'NURSE' ? '送出我的安心申請' : '完成，開啟安心服務' }}</span>
            </q-btn>
          </div>
        </q-form>
      </section>
    </main>

    <q-dialog v-model="successDialogOpen" persistent transition-show="scale" transition-hide="fade">
      <q-card class="success-dialog" role="dialog" aria-labelledby="nurse-success-title" aria-describedby="nurse-success-description">
        <div class="success-dialog__icon" aria-hidden="true">
          <CircleCheckBig :size="48" :stroke-width="1.8" />
        </div>
        <p class="success-dialog__eyebrow">申請完成</p>
        <h2 id="nurse-success-title">您的安心申請已送達</h2>
        <p id="nurse-success-description" class="success-dialog__description">
          您現在可以直接使用照安心網站；管理員完成證照審核後，才會開放工作任務與接案權限。
        </p>
        <div class="success-dialog__reminder">
          <ShieldCheck :size="21" />
          <span>證照仍在審核中不影響一般網站功能，只會暫時隱藏接案相關功能。</span>
        </div>
        <q-btn unelevated no-caps class="success-dialog__action" type="button" @click="returnToLogin">
          <Heart :size="20" fill="currentColor" />
          <span>進入照安心首頁</span>
        </q-btn>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AxiosError } from 'axios';
import {
  Accessibility, ArrowLeft, Award, BadgeCheck, BriefcaseBusiness, CakeSlice, Camera,
  CalendarCheck2, CalendarDays, CarFront, ChevronDown, CircleAlert, CircleCheckBig, Eye, EyeOff, FileBadge2,
  Heart, HeartHandshake, HeartPulse, Image as ImageIcon, KeyRound, Landmark, LockKeyhole, Mail, MapPin,
  MapPinned, PersonStanding, Phone, Ruler, ShieldCheck, Siren, UploadCloud, UserRound, UsersRound, Weight, X,
} from '@lucide/vue';
import { useAuthStore } from '@/stores/auth-store';

type RegisterRole = 'USER' | 'PATIENT' | 'NURSE';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const role = computed<RegisterRole>(() => {
  const requestedRole = String(route.params.role || '').toUpperCase();
  return ['USER', 'PATIENT', 'NURSE'].includes(requestedRole)
    ? requestedRole as RegisterRole
    : 'USER';
});

const roleContent = computed(() => ({
  USER: {
    icon: HeartHandshake, eyebrow: 'FOR FAMILY & SELF', title: '為家人，也為自己多一份安心',
    description: '建立使用者帳號後，您可以替家人新增照護資料，也能直接為自己預約服務。',
    reminder: '受照護者資料不是必填，您可以先建立帳號，再慢慢補齊。',
  },
  PATIENT: {
    icon: HeartPulse, eyebrow: 'CARE RECIPIENT', title: '讓我們更貼心地認識您',
    description: '照護與生活資訊會建立為受照護者資料，協助您查看預約、服務進度與提出評價。',
    reminder: '請只填寫服務需要知道的資訊；之後仍可由您或授權家屬協助更新。',
  },
  NURSE: {
    icon: Award, eyebrow: 'JOIN OUR CARE TEAM', title: '把您的專業，帶到需要的家庭',
    description: '帳號建立後即可使用網站；照安心管理員會另外審核您的工作資格。',
    reminder: '證照審核只影響工作任務與接案權限，不影響您瀏覽及使用一般服務。',
  },
}[role.value]));

const form = reactive({ name: '', phone: '', email: '', account: '', password: '', passwordConfirm: '' });
const patient = reactive({
  name: '', birthDate: '', gender: '', careLevel: '', mobilityStatus: '', heightCm: null as number | null,
  weightKg: null as number | null, transferSupport: '', bathingSupport: '', assistiveDevices: '',
  address: '', allergyNotes: '', medicalNotes: '', attentionNotes: '', homeEnvironmentNotes: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: '', photos: [] as File[],
});
const nurse = reactive({
  certificateName: '', certificateNumber: '', issuingAuthority: '', certificateExpiresAt: '',
  yearsExperience: 0, transportation: '', serviceAreas: '', introduction: '',
  profilePhoto: null as File | null, certificate: null as File | null,
});
const profilePhotoPreview = ref('');
const recipientPhotoPreviews = ref<string[]>([]);
const userPurpose = ref<'FAMILY' | 'SELF'>('FAMILY');
const genderOptions = ['女性', '男性', '其他／不便透露'];
const careLevelOptions = ['生活陪伴為主', '需要部分協助', '需要較多協助', '尚未評估'];
const mobilityOptions = ['可自行行動', '需要輔具', '需要他人攙扶', '臥床／行動困難'];
const transferOptions = ['可自行起身與移位', '需要一人攙扶', '需要一人全程出力協助', '建議兩人共同協助', '目前不確定'];
const showPassword = ref(false);
const agreed = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const successDialogOpen = ref(false);

watch(() => nurse.profilePhoto, (file) => {
  profilePhotoPreview.value = '';
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    // 若使用者快速換了另一張照片，不顯示前一張已過期的讀取結果。
    if (nurse.profilePhoto === file && typeof reader.result === 'string') {
      profilePhotoPreview.value = reader.result;
    }
  });
  reader.readAsDataURL(file);
});

watch(() => patient.photos, async (files) => {
  const selectedFiles = [...files];
  recipientPhotoPreviews.value = await Promise.all(selectedFiles.map((file) => new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''));
    reader.readAsDataURL(file);
  })));
});

const now = new Date();
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');

const birthDateRules = [
  (value: string) => {
    if (!value) return true;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return '請使用正確的年／月／日格式';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return '這個日期不存在，請再確認一次';
    }
    if (year < 1900) return '出生年份請勿早於 1900 年';
    if (value > today) return '出生日期不能晚於今天';
    return true;
  },
];

const required = (message: string) => (value: unknown) => Boolean(value) || message;

function openDatePicker(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  const input = button.closest('.q-field')?.querySelector('input[type="date"]') as HTMLInputElement | null;
  input?.focus();
  input?.showPicker?.();
}

function readableError(error: unknown): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message
      || (error.code === 'ERR_NETWORK' ? '目前連不上照安心服務，請確認後端已啟動。' : '資料送出時遇到問題，請稍後再試。');
  }
  return '發生未預期的狀況，請稍後再試。';
}

async function returnToLogin() {
  await router.replace('/');
}

async function submitRegistration() {
  errorMessage.value = '';
  successMessage.value = '';
  if (!agreed.value) {
    errorMessage.value = '請先閱讀並同意服務條款與個人資料使用說明。';
    return;
  }
  loading.value = true;
  try {
    if (role.value === 'NURSE') {
      const data = new FormData();
      Object.entries({
        account: form.account, password: form.password, name: form.name, phone: form.phone,
        email: form.email, certificateName: nurse.certificateName,
        certificateNumber: nurse.certificateNumber, issuingAuthority: nurse.issuingAuthority,
        certificateExpiresAt: nurse.certificateExpiresAt, yearsExperience: String(nurse.yearsExperience),
        transportation: nurse.transportation, serviceAreas: nurse.serviceAreas, introduction: nurse.introduction,
      }).forEach(([key, value]) => { if (value) data.append(key, value); });
      if (nurse.profilePhoto) data.append('profilePhoto', nurse.profilePhoto);
      if (nurse.certificate) data.append('certificate', nurse.certificate);
      await authStore.registerNurse(data);
      successDialogOpen.value = true;
      return;
    }

    const registrationData = new FormData();
    Object.entries({
      account: form.account, password: form.password, name: form.name, phone: form.phone,
      email: form.email, role: role.value, carePurpose: role.value === 'USER' ? userPurpose.value : '',
    }).forEach(([key, value]) => { if (value) registrationData.append(key, value); });
    const hasRecipientProfile = role.value === 'PATIENT' || (role.value === 'USER' && userPurpose.value === 'FAMILY');
    if (hasRecipientProfile) {
      registrationData.append('patientProfile', JSON.stringify({
        name: role.value === 'PATIENT' ? form.name : patient.name,
        birthDate: patient.birthDate || undefined, gender: patient.gender, careLevel: patient.careLevel,
        mobilityStatus: patient.mobilityStatus, heightCm: patient.heightCm ?? undefined,
        weightKg: patient.weightKg ?? undefined, transferSupport: patient.transferSupport,
        bathingSupport: patient.bathingSupport,
        assistiveDevices: patient.assistiveDevices.split(',').map((item) => item.trim()).filter(Boolean),
        allergyNotes: patient.allergyNotes, medicalNotes: patient.medicalNotes,
        attentionNotes: patient.attentionNotes, homeEnvironmentNotes: patient.homeEnvironmentNotes,
        address: { text: patient.address },
        emergencyContact: { name: patient.emergencyName, phone: patient.emergencyPhone, relationship: patient.emergencyRelationship },
      }));
      patient.photos.forEach((photo) => registrationData.append('recipientPhotos', photo));
    }
    await authStore.register(registrationData);
    await router.push('/');
  } catch (error) {
    errorMessage.value = readableError(error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  --milk: #fff9f5; --white: #fffdfb; --chestnut: #6e5750; --dark: #493833;
  --peach: #eb9079; --persimmon: #d96b27;
  min-height: 100dvh; padding: 28px clamp(18px, 4vw, 56px) 56px; color: var(--dark);
  background: radial-gradient(circle at 8% 12%, rgb(235 144 121 / 16%), transparent 28rem), var(--milk);
  font-family: var(--font-family-brand); font-size: 17px;
}
.register-header { width: min(1180px, 100%); margin: 0 auto 28px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.brand { display: inline-flex; align-items: center; gap: 12px; color: var(--dark); font-size: 1.45rem; font-weight: 700; letter-spacing: .1em; text-decoration: none; }
.brand__logo { width: 48px; height: 48px; }
.header-note { display: inline-flex; align-items: center; gap: 8px; color: var(--chestnut); font-size: .9rem; }
.register-shell { width: min(1180px, 100%); margin: 0 auto; display: grid; grid-template-columns: minmax(330px, 370px) minmax(0, 1fr); gap: 24px; align-items: start; }
.intro-card, .form-card { border: 1px solid rgb(110 87 80 / 13%); box-shadow: 0 22px 55px rgb(78 52 43 / 10%); }
.intro-card { position: sticky; top: 24px; padding: 40px 32px; color: white; background: linear-gradient(155deg, #80675e, #5a443d); border-radius: 28px 8px 28px 8px; }
.role-icon { width: 76px; height: 76px; display: grid; place-items: center; color: var(--persimmon); background: var(--milk); border-radius: 50%; box-shadow: 0 10px 24px rgb(28 13 8 / 18%); }
.eyebrow { margin: 30px 0 8px; color: #ffd9cc; font-size: .76rem; font-weight: 700; letter-spacing: .17em; }
.intro-card h1 { margin: 0; font-size: clamp(1.85rem, 2.35vw, 2.15rem); line-height: 1.45; text-wrap: balance; }
.intro-card > p:not(.eyebrow) { color: #fff4ef; font-size: .98rem; line-height: 1.75; text-wrap: pretty; }
.role-reminder { margin-top: 24px; padding: 15px; display: flex; align-items: flex-start; gap: 10px; color: #ffe9e0; background: rgb(255 249 245 / 10%); border-radius: 15px; font-size: .94rem; line-height: 1.6; }
.form-card { padding: clamp(28px, 5vw, 54px); background: var(--white); border-radius: 8px 28px 8px 28px; }
.section-heading { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; }
.section-heading--inside { margin-top: 34px; padding-top: 30px; border-top: 1px solid rgb(110 87 80 / 14%); }
.step-mark { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; color: white; background: var(--peach); border-radius: 50%; font-weight: 700; }
.section-heading h2 { margin: 0 0 6px; font-size: 1.5rem; }
.section-heading p { margin: 0; color: var(--chestnut); line-height: 1.65; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.field-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.field-grid__wide { grid-column: 1 / -1; }
.profile-photo-field { margin: 8px 0 16px; padding: 22px; display: grid; gap: 18px; background: rgb(235 144 121 / 7%); border: 1px solid rgb(235 144 121 / 30%); border-radius: 18px; }
.recipient-photo-field { margin-top: 18px; padding: 22px; display: grid; gap: 18px; background: rgb(235 144 121 / 7%); border: 1px solid rgb(235 144 121 / 30%); border-radius: 18px; }
.recipient-photo-preview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.recipient-photo-preview img { width: 100%; aspect-ratio: 4 / 3; display: block; object-fit: cover; border: 1px solid rgb(110 87 80 / 18%); border-radius: 14px; }
.profile-photo-copy { display: flex; align-items: flex-start; gap: 12px; }
.profile-photo-copy__icon { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; color: var(--persimmon); background: var(--white); border-radius: 50%; box-shadow: 0 6px 18px rgb(110 87 80 / 10%); }
.profile-photo-copy h3 { margin: 0 0 4px; color: var(--dark); font-size: 1.12rem; }
.profile-photo-copy p { margin: 0; color: var(--chestnut); line-height: 1.6; }
.profile-photo-preview { display: grid; grid-template-columns: minmax(190px, 240px) 1fr; gap: 20px; align-items: center; }
.profile-photo-preview__frame { aspect-ratio: 4 / 3; overflow: hidden; border: 2px dashed rgb(110 87 80 / 30%); border-radius: 16px; background: var(--milk); }
.profile-photo-preview__image { width: 100%; height: 100%; display: block; object-fit: cover; }
.profile-photo-preview__empty { width: 100%; height: 100%; display: grid; place-content: center; justify-items: center; gap: 8px; color: var(--chestnut); text-align: center; line-height: 1.5; }
.profile-photo-preview__guide { color: var(--chestnut); line-height: 1.6; }
.profile-photo-preview__guide strong { color: var(--dark); }
.profile-photo-preview__guide ul { margin: 8px 0 10px; padding-left: 1.2em; }
.profile-photo-preview__ready { display: inline-flex; align-items: center; gap: 7px; color: #37654b; font-weight: 700; }
.subheading { margin: 22px 0 14px; display: flex; align-items: center; gap: 9px; color: var(--chestnut); font-size: 1.08rem; }
.choice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.choice-card { min-height: 104px; padding: 15px; display: flex; align-items: center; gap: 10px; color: var(--chestnut); border: 1.5px solid rgb(110 87 80 / 22%); border-radius: 16px; cursor: pointer; }
.choice-card.is-selected { color: var(--dark); border-color: var(--peach); background: rgb(235 144 121 / 9%); }
.choice-card span { display: grid; gap: 5px; }.choice-card strong { font-size: 1rem; }.choice-card small { line-height: 1.45; }
.consent-row { margin: 24px 0; display: flex; align-items: center; color: var(--chestnut); cursor: pointer; }
.form-message { margin: 0 0 20px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 9px; border-radius: 12px; line-height: 1.6; }
.form-message--error { color: #9b3327; background: #fff0ec; }.form-message--success { color: #37654b; background: #edf8f1; }
.success-dialog { --dialog-milk: #fff9f5; --dialog-chestnut: #6e5750; --dialog-dark: #493833; --dialog-peach: #eb9079; --dialog-persimmon: #d96b27; width: min(460px, calc(100vw - 32px)); padding: 38px 34px 32px; color: var(--dialog-dark); background: linear-gradient(155deg, #fffdfb, var(--dialog-milk)); border: 1px solid rgb(110 87 80 / 14%); border-radius: 28px 9px 28px 9px; box-shadow: 0 28px 70px rgb(73 56 51 / 24%); font-family: var(--font-family-brand); text-align: center; }
.success-dialog__icon { width: 92px; height: 92px; margin: 0 auto 20px; display: grid; place-items: center; color: #37654b; background: #edf8f1; border: 1px solid rgb(55 101 75 / 16%); border-radius: 50%; box-shadow: 0 12px 28px rgb(55 101 75 / 14%); }
.success-dialog__eyebrow { margin: 0 0 8px; color: var(--dialog-persimmon); font-size: .82rem; font-weight: 700; letter-spacing: .18em; }
.success-dialog h2 { margin: 0; color: var(--dialog-dark); font-size: clamp(1.65rem, 5vw, 2rem); line-height: 1.45; }
.success-dialog__description { margin: 14px auto 0; color: var(--dialog-chestnut); font-size: 1.05rem; line-height: 1.75; }
.success-dialog__reminder { margin: 22px 0; padding: 14px 16px; display: flex; align-items: flex-start; gap: 9px; color: var(--dialog-chestnut); background: rgb(235 144 121 / 9%); border-radius: 14px; line-height: 1.6; text-align: left; }
.success-dialog__reminder svg { flex: 0 0 auto; margin-top: 2px; color: var(--dialog-peach); }
.success-dialog__action { width: 100%; min-height: 54px; color: white; background: var(--dialog-persimmon); border-radius: 14px; box-shadow: 0 10px 24px rgb(217 107 39 / 24%); font-size: 1rem; font-weight: 700; }
.success-dialog__action :deep(.q-btn__content) { gap: 9px; }
.form-actions { display: flex; justify-content: space-between; gap: 14px; }
.back-action, .submit-action { min-height: 54px; padding: 0 22px; border-radius: 14px; font-size: 1rem; font-weight: 700; }
.back-action { color: var(--chestnut); }.submit-action { min-width: 260px; color: white; background: var(--persimmon); box-shadow: 0 10px 24px rgb(217 107 39 / 24%); }
.back-action :deep(.q-btn__content), .submit-action :deep(.q-btn__content) { gap: 9px; }
.icon-button { width: 44px; height: 44px; display: grid; place-items: center; color: var(--chestnut); background: transparent; border: 0; border-radius: 50%; cursor: pointer; }
.file-clear-button { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; color: var(--chestnut); background: transparent; border: 0; border-radius: 50%; cursor: pointer; }
.file-clear-button:hover, .file-clear-button:focus-visible { color: #9b3327; background: rgb(155 51 39 / 8%); outline: 2px solid rgb(217 107 39 / 30%); }
.date-picker-button { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; align-self: center; color: var(--chestnut); background: transparent; border: 0; border-radius: 50%; cursor: pointer; }
.date-picker-button:hover, .date-picker-button:focus-visible { color: var(--persimmon); background: rgb(235 144 121 / 10%); outline: none; }
.select-chevron { color: var(--chestnut); pointer-events: none; }
:deep(.q-field--outlined .q-field__control) { min-height: 58px; border-radius: 13px; }
:deep(.q-field--outlined .q-field__control::before) { border-color: rgb(110 87 80 / 25%); }
:deep(.q-field--focused .q-field__control::after) { border-color: var(--persimmon); border-width: 2px; }
:deep(.q-field__label), :deep(.q-field__marginal) { color: var(--chestnut); font-family: var(--font-family-brand); }
:deep(.q-field__native), :deep(.q-field__input), :deep(.q-item__label), :deep(.q-checkbox__label) { font-family: var(--font-family-brand); font-size: 1rem; }
:deep(.q-radio__inner--truthy), :deep(.q-checkbox__inner--truthy) { color: var(--persimmon); }
:deep(.q-field--error .q-field__messages), :deep(.q-field--error .q-field__label) { color: #c62828; font-family: var(--font-family-brand); }
/* Quasar 的預設 error／arrow_drop_down 依賴 Material Icon 字型；改用中文訊息與 Lucide SVG。 */
:deep(.q-field--error .q-field__append > .q-icon),
:deep(.q-select__dropdown-icon) { display: none; }
:deep(input[type="date"]::-webkit-calendar-picker-indicator) { display: none; }

@media (max-width: 850px) {
  .register-page { font-size: 16px; }.register-shell { grid-template-columns: 1fr; }.intro-card { position: static; padding: 30px; }.role-icon { width: 64px; height: 64px; }.intro-card h1 { font-size: 2rem; }
}
@media (max-width: 620px) {
  .register-page { padding: 20px 14px 34px; }.header-note { display: none; }.form-card { padding: 26px 18px; }.field-grid, .field-grid--three, .choice-grid { grid-template-columns: 1fr; }.profile-photo-field, .recipient-photo-field { padding: 18px 14px; }.profile-photo-preview { grid-template-columns: 1fr; }.profile-photo-preview__frame { width: min(100%, 300px); justify-self: center; }.recipient-photo-preview { grid-template-columns: repeat(2, minmax(0, 1fr)); }.form-actions { flex-direction: column-reverse; }.back-action, .submit-action { width: 100%; min-width: 0; }.intro-card { border-radius: 22px 7px; }
}
</style>
