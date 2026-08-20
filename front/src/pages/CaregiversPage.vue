<template>
  <q-page class="caregiver-page">
    <section class="caregiver-hero" aria-labelledby="caregiver-title">
      <div class="caregiver-hero__content">
        <div class="caregiver-hero__eyebrow">
          <ShieldCheck :size="18" aria-hidden="true" />
          已通過照安心資格審核
        </div>
        <h1 id="caregiver-title">找到適合家人的照護夥伴</h1>
        <p>從服務地區、經驗與照護理念慢慢挑選，為家人找到安心又合拍的陪伴。</p>
        <div class="caregiver-hero__summary" aria-live="polite">
          <HeartHandshake :size="23" aria-hidden="true" />
          <span v-if="!loading">目前有 <strong>{{ caregivers.length }}</strong> 位專業夥伴</span>
          <span v-else>正在整理安心名單…</span>
        </div>
      </div>
      <div class="caregiver-hero__mark" aria-hidden="true">
        <img src="/chioansimicon.svg" alt="" />
      </div>
    </section>

    <main class="caregiver-content">
      <section class="filter-panel" aria-label="篩選居服員">
        <q-input
          v-model="keyword"
          outlined
          clearable
          hide-bottom-space
          class="warm-field filter-panel__search"
          aria-label="搜尋居服員姓名、地區或介紹"
          placeholder="搜尋姓名、服務地區或照護專長"
        >
          <template #prepend><Search :size="21" aria-hidden="true" /></template>
        </q-input>
        <q-select
          v-model="transportation"
          :options="transportOptions"
          outlined
          emit-value
          map-options
          hide-bottom-space
          class="warm-field filter-panel__select"
          aria-label="依交通方式篩選"
          label="交通方式"
        >
          <template #prepend><CarFront :size="20" aria-hidden="true" /></template>
          <template #append><ChevronDown :size="19" aria-hidden="true" /></template>
        </q-select>
        <div class="filter-panel__result" aria-live="polite">
          <SlidersHorizontal :size="18" aria-hidden="true" />
          找到 {{ filteredCaregivers.length }} 位夥伴
        </div>
      </section>

      <section v-if="loading" class="caregiver-grid" aria-label="正在載入居服員">
        <q-card v-for="item in 6" :key="item" flat bordered class="caregiver-card skeleton-card">
          <q-skeleton type="rect" height="240px" />
          <q-card-section><q-skeleton type="text" width="48%" /><q-skeleton type="text" /></q-card-section>
        </q-card>
      </section>

      <section v-else-if="errorMessage" class="state-card" role="alert">
        <RefreshCw :size="34" aria-hidden="true" />
        <h2>名單暫時沒有載入成功</h2>
        <p>{{ errorMessage }}</p>
        <q-btn unelevated no-caps class="primary-button" label="再試一次" @click="loadCaregivers" />
      </section>

      <section v-else-if="filteredCaregivers.length === 0" class="state-card">
        <UserRoundSearch :size="38" aria-hidden="true" />
        <h2>暫時沒有符合的夥伴</h2>
        <p>換個關鍵字或交通方式看看，也許很快就能遇見合適的人選。</p>
        <q-btn flat no-caps class="text-button" label="清除篩選" @click="clearFilters" />
      </section>

      <section v-else class="caregiver-grid" aria-label="已認證居服員名單">
        <article v-for="caregiver in filteredCaregivers" :key="caregiver._id" class="caregiver-card">
          <div class="caregiver-card__photo">
            <img
              class="caregiver-card__image"
              :src="assetUrl(caregiver.profilePhotoUrl)"
              :alt="`${caregiverName(caregiver)}的居服員個人近照`"
              @error="useFallbackPhoto"
            />
            <span class="verified-badge"><BadgeCheck :size="16" /> 資格已認證</span>
          </div>
          <div class="caregiver-card__body">
            <div class="caregiver-card__heading">
              <div>
                <p class="caregiver-card__role">照安心居服夥伴</p>
                <h2>{{ caregiverName(caregiver) }}</h2>
              </div>
              <span class="rating-pill">
                <Star :size="15" :fill="caregiver.ratingCount ? 'currentColor' : 'none'" />
                {{ ratingLabel(caregiver) }}
              </span>
            </div>
            <div class="caregiver-card__facts">
              <span><BriefcaseBusiness :size="17" /> {{ experienceLabel(caregiver) }}</span>
              <span><CarFront :size="17" /> {{ transportLabel(caregiver.transportation) }}</span>
            </div>
            <p class="caregiver-card__intro">{{ caregiver.introduction || '用耐心與細心，陪伴每一次安心照護。' }}</p>
            <div class="area-list" aria-label="可服務地區">
              <span v-for="area in caregiver.serviceAreas.slice(0, 3)" :key="area"><MapPin :size="14" />{{ area }}</span>
            </div>
            <button class="detail-button" type="button" @click="openDetails(caregiver)">
              看看服務介紹 <ArrowRight :size="18" aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>
    </main>

    <q-dialog v-model="detailsOpen" transition-show="scale" transition-hide="scale">
      <q-card v-if="selectedCaregiver" class="detail-dialog">
        <button class="dialog-close" type="button" aria-label="關閉居服員介紹" @click="detailsOpen = false">
          <X :size="22" aria-hidden="true" />
        </button>
        <div class="detail-dialog__top">
          <img
            class="detail-dialog__photo"
            :src="assetUrl(selectedCaregiver.profilePhotoUrl)"
            :alt="`${caregiverName(selectedCaregiver)}的居服員個人近照`"
            @error="useFallbackPhoto"
          >
          <div>
            <span class="verified-badge verified-badge--static"><BadgeCheck :size="16" /> 照安心資格已認證</span>
            <h2>{{ caregiverName(selectedCaregiver) }}</h2>
            <p>{{ selectedCaregiver.introduction || '用耐心與細心，陪伴每一次安心照護。' }}</p>
          </div>
        </div>
        <div class="detail-dialog__facts">
          <div><BriefcaseBusiness :size="21" /><span>服務經驗</span><strong>{{ experienceLabel(selectedCaregiver) }}</strong></div>
          <div><CarFront :size="21" /><span>交通方式</span><strong>{{ transportLabel(selectedCaregiver.transportation) }}</strong></div>
          <div><Star :size="21" /><span>服務評價</span><strong>{{ ratingLabel(selectedCaregiver) }}</strong></div>
        </div>
        <section class="detail-dialog__section">
          <h3><MapPin :size="19" /> 可服務地區</h3>
          <div class="area-list">
            <span v-for="area in selectedCaregiver.serviceAreas" :key="area">{{ area }}</span>
          </div>
        </section>
        <section class="detail-dialog__section">
          <h3><ShieldCheck :size="19" /> 專業資格</h3>
          <p>政府證照與相關文件已由照安心管理員完成審核。</p>
        </section>
        <q-card-actions class="detail-dialog__actions">
          <q-btn outline no-caps class="secondary-button" label="再看看其他夥伴" @click="detailsOpen = false" />
          <q-btn unelevated no-caps class="primary-button" label="提出照護需求" @click="openBooking(selectedCaregiver)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="bookingOpen" transition-show="scale" transition-hide="scale">
      <q-card class="booking-dialog">
        <header class="booking-dialog__heading">
          <div><small>安心預約・{{ selectedCaregiver ? caregiverName(selectedCaregiver) : '' }}</small><h2>安排適合的照護時間</h2><p>您的帳號資料會自動帶入；替家人預約時，只需從清單選擇。</p></div>
          <button type="button" aria-label="關閉預約視窗" @click="bookingOpen = false"><X :size="23" /></button>
        </header>
        <q-card-section class="booking-body">
          <section class="readonly-card" aria-label="預約申請人資料">
            <UserRound :size="24" /><div><small>預約申請人（不可修改）</small><strong>{{ accountUser?.name || authStore.user?.name }}</strong><span>{{ accountUser?.phone || accountUser?.email || `帳號 ${authStore.user?.account}` }}</span></div>
          </section>
          <q-select v-model="bookingForm.recipientId" :options="recipientOptions" outlined emit-value map-options clearable label="這次要照顧誰？（自己使用可不選）" class="booking-field" @update:model-value="applyRecipientDefaults"><template #prepend><HeartHandshake :size="21" /></template><template #append><ChevronDown :size="19" /></template></q-select>
          <section v-if="selectedRecipient" class="recipient-preview booking-grid-wide">
            <img v-if="selectedRecipient.carePhotoUrls?.[0]" :src="assetUrl(selectedRecipient.carePhotoUrls[0])" :alt="`${selectedRecipient.name}生活近照`"><UserRound v-else :size="36" />
            <div><small>已選擇受照護者（資料不可在此修改）</small><strong>{{ selectedRecipient.name }}</strong><span>{{ selectedRecipient.careLevel || '照護程度未填寫' }}・{{ selectedRecipient.mobilityStatus || '行動狀況未填寫' }}</span><p>{{ selectedRecipient.attentionNotes || '目前沒有特別留意事項' }}</p></div>
          </section>
          <div class="booking-section-title booking-grid-wide"><CalendarDays :size="22" /><div><strong>選擇居服員開放的時段</strong><small>未來 14 天；已預約與休假時段不能選擇</small></div></div>
          <div v-if="slotLoading" class="slot-state booking-grid-wide">正在整理可預約時間…</div>
          <q-list v-else-if="groupedAvailability.length" bordered class="slot-accordion booking-grid-wide">
            <q-expansion-item v-for="(group, index) in groupedAvailability" :key="group.date" :default-opened="index === 0" expand-separator>
              <template #header>
                <q-item-section avatar><CalendarDays :size="21" /></q-item-section>
                <q-item-section><q-item-label>{{ slotDate(group.date) }}</q-item-label><q-item-label caption>點開選擇照護時間</q-item-label></q-item-section>
                <q-item-section side><q-badge rounded :label="`${group.availableCount} 個可預約`" class="slot-count" /></q-item-section>
              </template>
              <div class="slot-list">
                <button v-for="slot in group.slots" :key="slot._id" type="button" :disabled="slot.status !== 'AVAILABLE'" :class="['slot-card', slot.status.toLowerCase(), { selected: bookingForm.availabilityId === slot._id }]" @click="bookingForm.availabilityId = slot._id">
                  <span><strong>{{ slot.startTime }}－{{ slot.endTime }}</strong><small>{{ slotStatus(slot.status) }}</small></span><b>{{ slotStatus(slot.status) }}</b>
                </button>
              </div>
            </q-expansion-item>
          </q-list>
          <p v-else-if="!slotLoading" class="slot-state booking-grid-wide">這位居服員尚未開放未來 14 天的服務時段。</p>
          <q-select v-model="bookingForm.serviceTypeIds" :options="serviceOptions" outlined emit-value map-options multiple use-chips label="需要哪些照護協助？" class="booking-field"><template #prepend><HeartHandshake :size="21" /></template><template #append><ChevronDown :size="19" /></template></q-select>
          <q-input v-model="bookingForm.address" outlined label="服務地點（必填）" class="booking-field"><template #prepend><MapPin :size="21" /></template></q-input>
          <q-input v-model="bookingForm.notes" outlined label="希望居服員留意的事情" class="booking-field booking-grid-wide" />
          <p v-if="bookingError" class="booking-error booking-grid-wide" role="alert">{{ bookingError }}</p>
        </q-card-section>
        <q-card-actions class="booking-actions"><q-btn unelevated no-caps class="booking-cancel-button" label="再想一下" @click="bookingOpen = false" /><q-btn unelevated no-caps class="booking-submit-button" label="安心安排" :loading="bookingSubmitting" @click="submitBooking" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  ChevronDown,
  HeartHandshake,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  UserRoundSearch,
  X,
} from '@lucide/vue';
import { api } from '@/boot/axios';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'vue-router';

type Transportation = 'CAR' | 'MOTORCYCLE' | 'TRANSIT' | string;

interface Caregiver {
  _id: string;
  userId?: { name?: string } | string;
  profilePhotoUrl?: string;
  introduction?: string;
  yearsExperience?: number;
  serviceAreas: string[];
  transportation?: Transportation;
  ratingAverage?: number;
  ratingCount?: number;
}

const caregivers = ref<Caregiver[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const keyword = ref('');
const transportation = ref('ALL');
const detailsOpen = ref(false);
const selectedCaregiver = ref<Caregiver | null>(null);
const authStore = useAuthStore();
const router = useRouter();
const bookingOpen = ref(false);
const bookingSubmitting = ref(false);
const slotLoading = ref(false);
const bookingError = ref('');
const availability = ref<Availability[]>([]);
const recipients = ref<Recipient[]>([]);
const serviceTypes = ref<ServiceType[]>([]);
const accountUser = ref<{ name?: string; phone?: string; email?: string } | null>(null);
const bookingForm = ref({ recipientId: null as string | null, availabilityId: '', serviceTypeIds: [] as string[], address: '', notes: '' });

interface Availability { _id: string; date: string; startTime: string; endTime: string; status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' }
interface Recipient { _id: string; name: string; careLevel?: string; mobilityStatus?: string; attentionNotes?: string; carePhotoUrls?: string[]; address?: { text?: string } }
interface ServiceType { _id: string; name: string }
const recipientOptions = computed(() => recipients.value.map((item) => ({ label: item.name, value: item._id })));
const serviceOptions = computed(() => serviceTypes.value.map((item: ServiceType & { code?: string; basePrice?: number }) => ({ label: `${item.code ? `${item.code} ` : ''}${item.name}${item.basePrice ? `｜${item.basePrice} 元／次` : ''}`, value: item._id })));
const selectedRecipient = computed(() => recipients.value.find((item) => item._id === bookingForm.value.recipientId));
const groupedAvailability = computed(() => {
  const groups = new Map<string, Availability[]>();
  availability.value.forEach((slot) => {
    const key = slot.date.slice(0, 10);
    groups.set(key, [...(groups.get(key) || []), slot]);
  });
  return [...groups.entries()].map(([date, slots]) => ({ date, slots, availableCount: slots.filter((slot) => slot.status === 'AVAILABLE').length }));
});

const transportOptions = computed(() => [
  { label: '全部交通方式', value: 'ALL' },
  ...Array.from(new Set(caregivers.value.map((item) => item.transportation).filter(Boolean))).map((value) => ({
    label: transportLabel(value),
    value,
  })),
]);

const filteredCaregivers = computed(() => {
  const term = keyword.value.trim().toLocaleLowerCase('zh-TW');
  return caregivers.value.filter((caregiver) => {
    const searchable = [
      caregiverName(caregiver),
      caregiver.introduction || '',
      ...(caregiver.serviceAreas || []),
    ].join(' ').toLocaleLowerCase('zh-TW');
    const matchesTerm = !term || searchable.includes(term);
    const matchesTransport = transportation.value === 'ALL' || caregiver.transportation === transportation.value;
    return matchesTerm && matchesTransport;
  });
});

function caregiverName(caregiver: Caregiver) {
  return typeof caregiver.userId === 'object' ? caregiver.userId.name || '照安心夥伴' : '照安心夥伴';
}

function transportLabel(value?: Transportation) {
  if (!value) return '交通方式面談';
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CAR' || value.includes('開車') || value.includes('汽車')) return '自行開車';
  if (normalized === 'MOTORCYCLE' || value.includes('機車')) return '騎乘機車';
  if (normalized === 'TRANSIT' || value.includes('大眾') || value.includes('公車') || value.includes('捷運')) return '大眾運輸';
  return value;
}

function experienceLabel(caregiver: Caregiver) {
  const years = caregiver.yearsExperience || 0;
  return years > 0 ? `${years} 年服務經驗` : '新進照護夥伴';
}

function ratingLabel(caregiver: Caregiver) {
  return caregiver.ratingCount ? `${(caregiver.ratingAverage || 0).toFixed(1)}（${caregiver.ratingCount}）` : '新加入';
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

function assetUrl(path?: string) {
  if (!path) return '/chioansimicon.svg';

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath.startsWith('/uploads/')) {
    return `${backendBaseUrl}${normalizedPath}`;
  }

  return normalizedPath;
}

function useFallbackPhoto(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  if (!image.src.endsWith('/chioansimicon.svg')) image.src = '/chioansimicon.svg';
  image.classList.add('is-fallback');
}

function openDetails(caregiver: Caregiver) {
  selectedCaregiver.value = caregiver;
  detailsOpen.value = true;
}

async function openBooking(caregiver: Caregiver) {
  if (!authStore.user) {
    detailsOpen.value = false;
    await router.push({ path: '/login', query: { redirect: '/caregivers' } });
    return;
  }
  selectedCaregiver.value = caregiver;
  detailsOpen.value = false;
  bookingError.value = '';
  bookingForm.value = { recipientId: null, availabilityId: '', serviceTypeIds: [], address: '', notes: '' };
  bookingOpen.value = true;
  slotLoading.value = true;
  try {
    const [slots, patientResult, typeResult, meResult] = await Promise.all([
      api.get<Availability[]>(`/nurses/${caregiver._id}/availability`),
      api.get<Recipient[]>('/patients'),
      api.get<ServiceType[]>('/services/types'),
      api.get<{ user: { name?: string; phone?: string; email?: string } }>('/auth/me'),
    ]);
    availability.value = slots.data;
    recipients.value = patientResult.data;
    serviceTypes.value = typeResult.data;
    accountUser.value = meResult.data.user;
  } catch {
    bookingError.value = '預約資料暫時無法載入，請稍後再試。';
  } finally {
    slotLoading.value = false;
  }
}

function applyRecipientDefaults(recipientId: string | null) {
  const recipient = recipients.value.find((item) => item._id === recipientId);
  bookingForm.value.address = recipient?.address?.text || '';
  bookingForm.value.notes = recipient?.attentionNotes || '';
}

function slotDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(value));
}
function slotStatus(status: Availability['status']) {
  return ({ AVAILABLE: '可預約', BOOKED: '已預約', UNAVAILABLE: '休假' } as const)[status];
}

async function submitBooking() {
  bookingError.value = '';
  if (!bookingForm.value.availabilityId || !bookingForm.value.serviceTypeIds.length || !bookingForm.value.address.trim()) {
    bookingError.value = '請選擇服務時段、照護項目並填寫服務地點。';
    return;
  }
  bookingSubmitting.value = true;
  try {
    await api.post('/bookings', {
      availabilityId: bookingForm.value.availabilityId,
      recipientId: bookingForm.value.recipientId || undefined,
      serviceTypeIds: bookingForm.value.serviceTypeIds,
      serviceAddress: { text: bookingForm.value.address.trim() },
      specialRequirements: bookingForm.value.notes.trim(),
    });
    bookingOpen.value = false;
    await router.push({ path: '/users', query: { bookingSaved: '1' } });
  } catch (error: unknown) {
    const candidate = error as { response?: { data?: { message?: string } } };
    bookingError.value = candidate.response?.data?.message || '預約沒有送出成功，請重新確認一次。';
  } finally {
    bookingSubmitting.value = false;
  }
}

function clearFilters() {
  keyword.value = '';
  transportation.value = 'ALL';
}

async function loadCaregivers() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get<Caregiver[]>('/nurses');
    caregivers.value = data.map((caregiver) => ({ ...caregiver, serviceAreas: caregiver.serviceAreas || [] }));
  } catch {
    errorMessage.value = '請確認後端服務與資料庫已啟動，再重新整理一次。';
  } finally {
    loading.value = false;
  }
}

onMounted(loadCaregivers);
</script>

<style scoped>
.caregiver-page {
  --milk: #fff9f5;
  --paper: #fffdfb;
  --chestnut: #6e5750;
  --ink: #493833;
  --peach: #eb9079;
  --persimmon: #c55418;
  min-height: 100%;
  padding: 44px 24px 80px;
  color: var(--chestnut);
  background: var(--milk);
}

.caregiver-hero,
.caregiver-content { width: min(1180px, 100%); margin-inline: auto; }

.caregiver-hero {
  position: relative;
  min-height: 310px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 48px clamp(28px, 6vw, 72px);
  color: white;
  background-color: var(--chestnut);
  background-image: repeating-radial-gradient(circle at 88% 50%, transparent 0 50px, rgb(255 255 255 / 5%) 52px 54px);
  border-radius: 32px;
  box-shadow: 0 24px 60px rgb(79 56 47 / 14%);
}

.caregiver-hero__content { position: relative; z-index: 1; max-width: 710px; }
.caregiver-hero__eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; color: #ffe1d7; font-weight: 700; letter-spacing: 0.08em; }
.caregiver-hero h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.7rem); line-height: 1.2; letter-spacing: 0.04em; }
.caregiver-hero p { max-width: 650px; margin: 20px 0 26px; color: #fff6f1; font-size: clamp(1rem, 2vw, 1.18rem); line-height: 1.9; }
.caregiver-hero__summary { width: fit-content; display: flex; align-items: center; gap: 10px; padding: 11px 17px; color: var(--ink); background: #fff7f1; border-radius: 999px; }
.caregiver-hero__summary strong { color: var(--persimmon); font-size: 1.2em; }
.caregiver-hero__mark { position: relative; z-index: 1; flex: 0 0 auto; width: 150px; height: 150px; display: grid; place-items: center; margin-left: 28px; background: var(--paper); border: 6px solid var(--peach); border-radius: 50%; box-shadow: 0 18px 36px rgb(40 25 20 / 18%); }
.caregiver-hero__mark img { width: 100%; height: 100%; object-fit: contain; }

.caregiver-content { margin-top: 30px; }
.filter-panel { display: grid; grid-template-columns: minmax(0, 1fr) 240px 150px; align-items: center; gap: 14px; padding: 18px; background: var(--paper); border: 1px solid rgb(110 87 80 / 13%); border-radius: 20px; box-shadow: 0 12px 36px rgb(90 62 53 / 7%); }
.filter-panel__result { display: flex; align-items: center; gap: 7px; padding-inline: 8px; color: var(--chestnut); font-weight: 700; white-space: nowrap; }
.warm-field :deep(.q-field__control) { min-height: 54px; color: var(--chestnut); border-radius: 14px; }
.warm-field :deep(.q-field__native), .warm-field :deep(.q-field__label), .warm-field :deep(.q-field__marginal) { color: var(--chestnut); }
.warm-field :deep(.q-field__control::before) { border-color: rgb(110 87 80 / 24%); }
.filter-panel__select :deep(.q-select__dropdown-icon) { display: none; }

.caregiver-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 26px; }
.caregiver-card { overflow: hidden; background: var(--paper); border: 1px solid rgb(110 87 80 / 13%); border-radius: 24px; box-shadow: 0 16px 42px rgb(78 52 43 / 8%); transition: transform 180ms ease, box-shadow 180ms ease; }
.caregiver-card:hover { transform: translateY(-4px); box-shadow: 0 22px 48px rgb(78 52 43 / 13%); }
.caregiver-card__photo { position: relative; aspect-ratio: 1 / .72; overflow: hidden; background: #f7e9e2; }
.caregiver-card__image { width: 100%; height: 100%; display: block; object-fit: cover; }
.caregiver-card__image.is-fallback { padding: 72px; object-fit: contain; }
.photo-fallback { width: 100%; height: 100%; display: grid; place-items: center; color: var(--peach); background: #fff2ec; }
.verified-badge { position: absolute; left: 16px; bottom: 14px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; color: #345d50; background: #f3fff9; border: 1px solid rgb(74 107 93 / 23%); border-radius: 999px; font-size: .8rem; font-weight: 700; box-shadow: 0 6px 16px rgb(48 75 65 / 12%); }
.verified-badge--static { position: static; width: fit-content; }
.caregiver-card__body { padding: 22px; }
.caregiver-card__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.caregiver-card__role { margin: 0 0 4px; color: var(--persimmon); font-size: .76rem; font-weight: 700; letter-spacing: .12em; }
.caregiver-card h2 { margin: 0; color: var(--ink); font-size: 1.55rem; }
.rating-pill { display: inline-flex; align-items: center; gap: 4px; padding: 6px 9px; color: #a15b25; background: #fff4e8; border-radius: 999px; font-size: .78rem; white-space: nowrap; }
.caregiver-card__facts { display: flex; flex-wrap: wrap; gap: 12px; margin: 18px 0 14px; }
.caregiver-card__facts span { display: inline-flex; align-items: center; gap: 6px; color: var(--chestnut); font-size: .9rem; }
.caregiver-card__intro { min-height: 3.2em; display: -webkit-box; overflow: hidden; margin: 0 0 16px; color: #765f58; line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.area-list { display: flex; flex-wrap: wrap; gap: 8px; }
.area-list span { display: inline-flex; align-items: center; gap: 3px; padding: 6px 9px; color: var(--chestnut); background: #fff2ec; border-radius: 8px; font-size: .78rem; }
.detail-button { width: 100%; min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; color: var(--persimmon); background: transparent; border: 1px solid rgb(197 84 24 / 38%); border-radius: 13px; font: inherit; font-weight: 700; cursor: pointer; transition: color 160ms ease, background 160ms ease; }
.detail-button:hover { color: white; background: var(--persimmon); }

.state-card { min-height: 330px; display: grid; place-items: center; align-content: center; gap: 10px; margin-top: 26px; padding: 34px; text-align: center; background: var(--paper); border: 1px solid rgb(110 87 80 / 13%); border-radius: 24px; }
.state-card h2 { margin: 6px 0 0; color: var(--ink); }
.state-card p { margin: 0 0 12px; }
.primary-button, .secondary-button { min-height: 46px; padding-inline: 22px; border-radius: 13px; font-weight: 700; }
.primary-button { color: white; background: var(--persimmon); }
.secondary-button { color: var(--chestnut); }
.text-button { min-height: 44px; color: var(--persimmon); font-weight: 700; }

.detail-dialog {
  --paper: #fffdfb;
  --chestnut: #6e5750;
  --ink: #493833;
  --persimmon: #c55418;
  position: relative;
  width: min(700px, calc(100vw - 32px));
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 34px;
  color: var(--chestnut);
  background: var(--paper);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgb(45 30 25 / 24%);
}
.dialog-close { position: absolute; z-index: 2; top: 16px; right: 16px; width: 44px; height: 44px; display: grid; place-items: center; color: var(--chestnut); background: rgb(255 253 251 / 90%); border: 1px solid rgb(110 87 80 / 18%); border-radius: 50%; cursor: pointer; }
.detail-dialog__top { display: grid; grid-template-columns: 190px 1fr; align-items: center; gap: 28px; padding-right: 26px; }
.detail-dialog__photo { width: 190px; height: 190px; display: block; object-fit: cover; overflow: hidden; border-radius: 22px; }
.detail-dialog__photo.is-fallback { padding: 34px; background: #fff2ec; object-fit: contain; }
.detail-dialog__top h2 { margin: 14px 0 8px; color: var(--ink); font-size: 2rem; }
.detail-dialog__top p { margin: 0; line-height: 1.75; }
.detail-dialog__facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 26px 0; }
.detail-dialog__facts div { display: grid; gap: 5px; padding: 16px; background: #fff4ee; border-radius: 14px; }
.detail-dialog__facts svg { color: var(--persimmon); }
.detail-dialog__facts span { font-size: .78rem; }
.detail-dialog__facts strong { color: var(--ink); font-size: .9rem; }
.detail-dialog__section { padding: 18px 0; border-top: 1px solid rgb(110 87 80 / 13%); }
.detail-dialog__section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--ink); font-size: 1rem; }
.detail-dialog__section p { margin: 0; }
.detail-dialog__actions {
  position: sticky;
  z-index: 2;
  bottom: -34px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 0 -34px -34px;
  padding: 14px 34px 20px;
  background: var(--paper);
  border-top: 1px solid rgb(110 87 80 / 13%);
}

button:focus-visible, :deep(.q-field--focused), :deep(.q-btn:focus-visible) { outline: 3px solid rgb(235 144 121 / 45%); outline-offset: 3px; }

@media (max-width: 960px) {
  .caregiver-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .caregiver-hero__mark { width: 120px; height: 120px; }
  .filter-panel { grid-template-columns: 1fr 220px; }
  .filter-panel__result { grid-column: 1 / -1; }
}

@media (max-width: 660px) {
  .caregiver-page { padding: 20px 14px 52px; }
  .caregiver-hero { min-height: auto; padding: 34px 24px; border-radius: 24px; }
  .caregiver-hero__mark { display: none; }
  .caregiver-hero h1 { font-size: 2.15rem; }
  .filter-panel { grid-template-columns: 1fr; padding: 14px; }
  .filter-panel__result { grid-column: auto; }
  .caregiver-grid { grid-template-columns: 1fr; gap: 18px; }
  .caregiver-card__photo { aspect-ratio: 1 / .68; }
  .detail-dialog { padding: 24px 20px; }
  .detail-dialog__top { grid-template-columns: 110px 1fr; gap: 16px; padding-right: 18px; }
  .detail-dialog__photo { width: 110px; height: 110px; }
  .detail-dialog__top h2 { font-size: 1.5rem; }
  .detail-dialog__top p { grid-column: 1 / -1; }
  .verified-badge--static { margin-top: 32px; padding: 6px 8px; font-size: .7rem; white-space: nowrap; }
  .detail-dialog__facts { grid-template-columns: 1fr; }
  .detail-dialog__actions { bottom: -24px; flex-direction: column-reverse; margin: 0 -20px -24px; padding: 12px 20px 18px; }
  .detail-dialog__actions .q-btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .caregiver-card { transition: none; }
}

.booking-dialog{width:min(900px,calc(100vw - 28px));max-width:900px!important;max-height:calc(100vh - 24px);overflow-y:auto;overscroll-behavior:contain;color:#6e5750;background:#fffdfb;border-radius:26px;box-shadow:0 24px 70px rgb(45 30 25 / 24%)}
.booking-dialog__heading{display:flex;justify-content:space-between;gap:20px;padding:20px 28px 14px;border-bottom:1px solid #f0e3dd}.booking-dialog__heading small{color:#d96b27;font-weight:800;letter-spacing:.08em}.booking-dialog__heading h2{margin:4px 0;color:#4c3730;font-size:1.65rem}.booking-dialog__heading p{margin:0;line-height:1.5}.booking-dialog__heading button{width:44px;height:44px;display:grid;place-items:center;flex:none;color:#4c3730;background:#fff1eb;border:0;border-radius:14px;cursor:pointer}.booking-body{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;padding:14px 28px}.booking-grid-wide{grid-column:1/-1}.readonly-card,.recipient-preview{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;padding:12px 15px;background:#fff4ee;border-radius:16px}.readonly-card>svg,.recipient-preview>svg{color:#d96b27}.readonly-card div,.recipient-preview div{display:grid}.readonly-card small,.recipient-preview small{color:#8b736b}.readonly-card strong,.recipient-preview strong{color:#4c3730;font-size:1.02rem}.readonly-card span,.recipient-preview span{color:#745e57}.recipient-preview img{width:58px;height:58px;object-fit:cover;border-radius:13px}.recipient-preview p{margin:3px 0 0;line-height:1.4}.booking-field :deep(.q-field__control){min-height:54px;background:#fffaf7;border-radius:15px}.booking-field :deep(.q-field__prepend){color:#d96b27}.booking-field :deep(.q-select__dropdown-icon){display:none}.booking-section-title{display:flex;align-items:center;gap:10px;margin-top:2px;color:#4c3730}.booking-section-title>svg{color:#d96b27}.booking-section-title div{display:grid}.booking-section-title small{color:#8b736b}.slot-accordion{overflow:hidden;border-color:#eadbd4;border-radius:17px}.slot-accordion :deep(.q-item){min-height:66px;color:#5d4740;background:#fffaf7}.slot-accordion :deep(.q-item__section--avatar){min-width:40px;color:#c55418}.slot-count{color:#35624f;background:#e7f3ec}.slot-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:10px 14px 15px;background:#fffdfb}.slot-card{min-height:62px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:9px;padding:11px;text-align:left;color:#6e5750;background:#fffaf7;border:1px solid #eadbd4;border-radius:15px;cursor:pointer}.slot-card span{display:grid}.slot-card small{margin-top:2px}.slot-card b{padding:5px 8px;color:#35624f;background:#e7f3ec;border-radius:999px;font-size:.75rem}.slot-card.selected{border:2px solid #eb9079;background:#fff0ea}.slot-card:disabled{cursor:not-allowed;opacity:.75}.slot-card.booked b{color:#8a591d;background:#fff0d7}.slot-card.unavailable b{color:#755f58;background:#eee6e2}.slot-state{grid-column:1/-1;padding:16px;text-align:center;color:#876f67;background:#fff8f4;border-radius:15px}.booking-error{margin:0;padding:10px 14px;color:#a33c31;background:#fff0ed;border-radius:13px}.booking-actions{justify-content:flex-end;gap:10px;padding:13px 28px 18px;background:#fffdfb;border-top:1px solid #f0e3dd}.booking-actions .q-btn{min-width:126px;min-height:46px;padding-inline:22px;border-radius:13px;font-weight:700}.booking-cancel-button{color:#6e5750;background:#f3e9e4}.booking-submit-button{color:#fff;background:#d96b27;box-shadow:0 10px 22px rgb(217 107 39 / 18%)}
@media(max-width:660px){.booking-dialog{max-height:94vh;overflow:auto}.booking-dialog__heading,.booking-body,.booking-actions{padding-inline:18px}.booking-dialog__heading h2{font-size:1.5rem}.booking-body{grid-template-columns:1fr}.booking-grid-wide{grid-column:auto}.slot-list{grid-template-columns:1fr}.booking-actions .q-btn{flex:1;padding-inline:8px}}
</style>
