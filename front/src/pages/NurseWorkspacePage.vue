<template>
  <q-page class="nurse-page">
    <main class="nurse-shell">
      <section class="hero">
        <img :src="photoUrl" alt="我的居服員個人近照" @error="useFallbackPhoto" />
        <div class="hero-copy">
          <p>MY CARE WORKSPACE</p>
          <h1>{{ greeting }}，{{ dashboard?.user.name || '居服夥伴' }}</h1>
          <span>今天的任務、照護紀錄與需要回覆的事情，都替您整理好了。</span>
        </div>
        <div class="verify-pill"><BadgeCheck :size="20" />{{ verificationLabel }}</div>
      </section>

      <section v-if="loading" class="summary-grid">
        <q-skeleton v-for="item in 4" :key="item" type="rect" height="140px" />
      </section>
      <section v-else-if="errorMessage" class="empty-panel" role="alert">
        <WifiOff :size="36" /><h2>工作資料暫時沒有載入</h2><p>{{ errorMessage }}</p>
        <q-btn unelevated no-caps class="primary-btn" label="再整理一次" @click="loadDashboard" />
      </section>

      <template v-else>
        <section class="summary-grid" aria-label="工作摘要">
          <button v-for="item in summaries" :key="item.section" type="button" @click="activeSection = item.section">
            <component :is="item.icon" :size="28" /><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.caption }}</small>
          </button>
        </section>

        <section class="work-grid">
          <nav class="work-menu" aria-label="居服員功能">
            <button v-for="item in menuItems" :key="item.value" type="button" :class="{ active: activeSection === item.value }" @click="activeSection = item.value">
              <component :is="item.icon" :size="22" /><span><strong>{{ item.label }}</strong><small>{{ item.caption }}</small></span><ChevronRight :size="20" />
            </button>
          </nav>

          <section class="content-card" aria-live="polite">
            <header>
              <div><p>{{ currentMenu.eyebrow }}</p><h2>{{ currentMenu.label }}</h2><span>{{ currentMenu.description }}</span></div>
              <q-btn v-if="sectionAction" unelevated no-caps class="primary-btn" :label="sectionAction.label" @click="sectionAction.action" />
            </header>

            <div v-if="activeSection === 'overview'" class="profile-grid">
              <article>
                <h3><UserRoundCog :size="24" />個人與聯絡資料</h3>
                <dl><dt>姓名</dt><dd>{{ dashboard?.user.name }}</dd><dt>電話</dt><dd>{{ dashboard?.user.phone || '尚未填寫' }}</dd><dt>電子信箱</dt><dd>{{ dashboard?.user.email || '尚未填寫' }}</dd><dt>服務年資</dt><dd>{{ dashboard?.profile.yearsExperience || 0 }} 年</dd></dl>
                <button class="outline-btn" type="button" @click="openProfile"><Pencil :size="17" />修改我的資料</button>
              </article>
              <article>
                <h3><FileBadge2 :size="24" />專業證照與技能</h3>
                <ul><li v-for="item in dashboard?.credentials" :key="item._id"><span>{{ item.name }}</span><small>{{ statusLabel(item.verificationStatus) }}</small></li></ul>
                <div v-if="!dashboard?.credentials.length" class="empty-copy">目前沒有證照資料。</div>
              </article>
            </div>

            <div v-else-if="activeSection === 'schedule'" class="schedule-panel">
              <div class="schedule-toolbar">
                <q-input v-model="scheduleSearch" outlined dense label="搜尋使用者或受照護者"><template #prepend><Search :size="18" /></template></q-input>
                <q-select v-model="scheduleStatus" outlined dense emit-value map-options :options="availabilityStatusOptions" label="狀態"><template #append><ChevronDown :size="18" /></template></q-select>
              </div>
              <q-card flat bordered class="location-sharing-card">
                <q-card-section class="location-sharing-card__head">
                  <div><MapPin :size="24" /><span><small>任務期間定位</small><strong>位置分享</strong></span></div>
                  <q-badge rounded :class="['sharing-badge', { 'is-off': !locationStore.isSharing }]">{{ locationStore.isSharing ? '分享中' : '未分享' }}</q-badge>
                </q-card-section>
                <q-card-section class="location-sharing-card__body">
                  <q-banner dense rounded class="location-privacy-banner">僅於「開始前往」到「開始服務」期間分享位置；沒有任務、尚未出發及服務完成後都不追蹤。</q-banner>
                  <small>最近更新：{{ locationUpdatedLabel }}</small>
                  <p v-if="locationStore.error" role="alert">{{ locationStore.error }}</p>
                </q-card-section>
                <q-card-actions v-if="locationStore.isSharing" align="right">
                  <q-btn outline no-caps class="stop-sharing-button" label="停止分享" :disable="saving" @click="stopLocationSharing" />
                </q-card-actions>
              </q-card>
              <div class="schedule-layout">
                <q-date v-model="scheduleDay" minimal color="deep-orange" class="schedule-calendar" :options="weekdayOnly" :events="leaveCalendarDates" event-color="grey-7" />
                <div class="availability-list">
                  <q-banner v-if="selectedDayAvailability" rounded class="leave-day-banner">
                    <template #avatar><CalendarOff :size="23" /></template>
                    <div class="leave-day-banner__copy">
                      <strong>{{ ['LEAVE', 'APPROVED'].includes(selectedDayAvailability.status) ? '這一天已核准休假' : '這一天暫停提供服務' }}</strong>
                      <span>本日不開放新的照護任務。</span>
                    </div>
                    <template #action><q-badge color="grey-7" text-color="white">不可接案</q-badge></template>
                  </q-banner>
                  <p class="schedule-note"><CalendarDays :size="18" />{{ availabilityListTitle }}</p>
                  <article v-for="item in filteredAvailabilities" :key="item._id" :class="['availability-row', item.status.toLowerCase()]">
                    <div><strong>09:00－17:00</strong><small>{{ exceptionLabel(item.status) }}</small></div>
                    <span :class="['availability-badge', item.status.toLowerCase()]">{{ exceptionLabel(item.status) }}</span>
                    <button v-if="item.status === 'UNAVAILABLE'" class="icon-btn" type="button" aria-label="修改時段" @click="openSchedule(item)"><Pencil :size="18" /></button>
                    <button v-if="item.status === 'UNAVAILABLE'" class="icon-btn danger" type="button" aria-label="隱藏時段" @click="removeAvailability(item._id)"><Trash2 :size="18" /></button>
                  </article>
                  <EmptyState v-if="!filteredAvailabilities.length" title="這一天照常提供服務" text="平日 09:00–17:00 預設可預約；只有需要休息時才必須安排。" />
                </div>
              </div>
              <div ref="bookingListRef" class="booking-divider"><span>已媒合的服務任務</span></div>
              <div class="booking-view-toolbar">
                <q-btn-toggle v-model="bookingView" no-caps unelevated toggle-color="deep-orange" :options="[{ label: '任務列表', value: 'list' }, { label: '我的班表', value: 'calendar' }]" aria-label="切換任務列表或我的班表" />
                <span v-if="bookingView === 'calendar'">時間皆為台北時間</span>
              </div>
              <div v-if="bookingView === 'calendar'" ref="calendarSectionRef" class="calendar-panel">
                <div class="calendar-nav" aria-label="班表日期導覽">
                  <button type="button" aria-label="上一段日期" @click="calendarRef?.prev()"><ChevronLeft :size="20" /></button>
                  <button type="button" @click="calendarRef?.moveToToday()">今天</button>
                  <strong>{{ calendarRangeLabel }}</strong>
                  <button type="button" aria-label="下一段日期" @click="calendarRef?.next()"><ChevronRight :size="20" /></button>
                </div>
                <QCalendarDay ref="calendarRef" v-model="calendarDate" locale="zh-TW" :view="calendarView" :weekdays="[1,2,3,4,5]" :interval-start="16" :interval-count="20" :interval-minutes="30" :interval-height="34" hour24-format animated bordered>
                  <template #day-body="{ scope }">
                    <button v-for="event in eventsForDay(scope.timestamp.date)" :key="event.id" type="button" :class="['calendar-event', 'tag', `tag-${calendarEventTone(event)}`]" :style="calendarEventStyle(event, scope)" :aria-label="`${event.title}，${event.startTime}`" :disabled="event.kind === 'leave'" @click="event.bookingId && openBookingDetails(event.bookingId)">
                      <strong>{{ event.startTime }}</strong><span>{{ event.title }}</span><q-badge v-if="event.kind === 'leave'" :color="event.status === 'APPROVED' ? 'grey-7' : 'amber-8'" :label="leaveStatus(event.status!)" />
                    </button>
                  </template>
                </QCalendarDay>
                <EmptyState v-if="!calendarEvents.length" title="目前沒有安排中的照護任務" text="仍可切換日期查看班表；新任務媒合後會出現在正確時段。" />
              </div>
              <template v-else>
              <article v-for="booking in filteredBookings" :key="booking._id" :class="['record-row', `booking-${booking.status.toLowerCase()}`]">
                <div class="date-box"><strong>{{ day(booking.scheduledStartAt) }}</strong><span>{{ month(booking.scheduledStartAt) }}</span></div>
                <div class="record-main"><h3>{{ booking.recipientId?.name || '本人服務需求' }}</h3><p>{{ dateTime(booking.scheduledStartAt) }}・{{ booking.serviceTypeIds?.map((item) => item.name).join('、') || '照護服務' }}</p></div>
                <button v-if="booking.status === 'PENDING'" class="accept-task-button" type="button" :disabled="isBookingOnUnavailableDay(booking)" @click="openBookingConfirm(booking)">{{ isBookingOnUnavailableDay(booking) ? '休假中・不可承接' : '等待居服員確認' }}</button>
                <button v-else-if="booking.status === 'ACCEPTED'" class="journey-button" type="button" :disabled="saving" @click="beginJourney(booking)">開始前往</button>
                <button v-else-if="booking.status === 'DEPARTED' && locationStore.isSharing && locationStore.bookingId === booking._id" class="journey-button" type="button" :disabled="saving" @click="markArrived(booking)">我已抵達</button>
                <button v-else-if="booking.status === 'DEPARTED'" class="journey-button" type="button" :disabled="saving" @click="resumeJourney(booking)">繼續分享位置</button>
                <button v-else-if="booking.status === 'ARRIVED' && (!locationStore.isSharing || locationStore.bookingId !== booking._id)" class="journey-button" type="button" :disabled="saving" @click="resumeJourney(booking)">繼續分享位置</button>
                <button v-else-if="booking.status === 'ARRIVED'" class="journey-button" type="button" :disabled="saving" @click="beginService(booking)">開始服務</button>
                <button v-else-if="booking.status === 'IN_SERVICE'" class="complete-task-button" type="button" @click="openCompletionConfirm(booking)">提出完成任務</button>
                <span v-else :class="['tag', `tag-${bookingTone(booking)}`]">{{ attendanceLabel(booking) }}</span>
                <button v-if="booking.status === 'COMPLETED'" class="outline-btn" type="button" @click="openReview(booking)">給予評量</button>
              </article>
              <EmptyState v-if="!filteredBookings.length" title="目前沒有符合的服務行程" text="有新的媒合任務時，會在這裡清楚顯示。" />
              </template>
            </div>

            <div v-else-if="activeSection === 'journal'" class="record-list">
              <p class="journal-guidance">持續留下完整工作日誌，能累積平台信任紀錄，讓家庭更安心了解您的服務品質。</p>
              <article v-for="item in dashboard?.journals" :key="item._id" class="record-row"><div class="record-main"><small>{{ dateTime(item.occurredAt) }}</small><h3>{{ item.title }}</h3><p>{{ item.content }}</p></div><button class="icon-btn" type="button" aria-label="隱藏這篇日誌" @click="hideJournal(item._id)"><Trash2 :size="19" /></button></article>
              <EmptyState v-if="!dashboard?.journals.length" title="還沒有工作日誌" text="服務後留下重點，未來交班與回顧會更安心。" />
            </div>

            <div v-else-if="activeSection === 'reviews'" class="record-list">
              <article v-for="item in dashboard?.receivedReviews" :key="item._id" class="review-row"><div class="stars"><Star v-for="star in 5" :key="star" :size="18" :fill="star <= item.rating ? 'currentColor' : 'none'" /></div><p>{{ item.comment || '謝謝您的用心服務。' }}</p></article>
              <EmptyState v-if="!dashboard?.receivedReviews.length" title="還沒有收到評價" text="完成服務後，使用者與受照護者的回饋會出現在這裡。" />
            </div>

            <div v-else-if="activeSection === 'safety'" class="record-list">
              <article v-for="item in dashboard?.complaints" :key="item._id" class="record-row"><div class="record-main"><small>{{ incidentName(item.category) }}</small><h3>{{ item.description }}</h3><p>{{ dateTime(item.createdAt) }}</p></div><span class="tag">{{ complaintStatus(item.status) }}</span></article>
              <EmptyState v-if="!dashboard?.complaints.length" title="目前沒有安全通報" text="若遇到霸凌、騷擾或事故，請立即使用上方按鈕通報。" />
            </div>

            <div v-else class="record-list">
              <article v-for="item in dashboard?.leaves" :key="item._id" class="record-row"><div class="record-main"><small>{{ leaveName(item.leaveType) }}</small><h3>{{ dateTime(item.startAt) }} 至 {{ dateTime(item.endAt) }}</h3><p>{{ item.reason }}</p></div><span class="tag">{{ leaveStatus(item.status) }}</span><button v-if="item.status === 'PENDING'" class="outline-btn" type="button" @click="cancelLeave(item._id)">撤回</button></article>
              <EmptyState v-if="!dashboard?.leaves.length" title="目前沒有請假紀錄" text="需要休息時提早告訴平台，我們會協助調整安排。" />
            </div>
          </section>
        </section>
      </template>
    </main>

    <q-dialog v-model="dialogOpen"><q-card class="form-dialog"><div class="dialog-head"><div><small>{{ currentMenu.eyebrow }}</small><h2>{{ dialogTitle }}</h2><p>{{ dialogCopy }}</p></div><button type="button" aria-label="關閉視窗" @click="dialogOpen = false"><X :size="22" /></button></div>
      <q-card-section v-if="dialogType === 'profile'" class="form-grid detail-form-grid"><q-input v-model="profileForm.name" outlined label="姓名"><template #prepend><UserRound :size="21" /></template></q-input><q-input v-model="profileForm.phone" outlined type="tel" label="聯絡電話"><template #prepend><Phone :size="21" /></template></q-input><q-input v-model="profileForm.email" outlined type="email" label="電子信箱"><template #prepend><Mail :size="21" /></template></q-input><q-input v-model.number="profileForm.yearsExperience" outlined type="number" min="0" label="服務年資"><template #prepend><BriefcaseBusiness :size="21" /></template></q-input><q-input v-model="profileForm.serviceAreasText" outlined label="可服務地區（逗號分隔）" class="wide"><template #prepend><MapPin :size="21" /></template></q-input><q-input v-model="profileForm.introduction" outlined autogrow label="自我介紹" class="wide"><template #prepend><MessageCircleHeart :size="21" /></template></q-input></q-card-section>
      <q-card-section v-else-if="dialogType === 'schedule'" class="form-grid detail-form-grid"><q-date v-model="scheduleForm.date" mask="YYYY-MM-DD" minimal color="deep-orange" :options="weekdayOnly" class="schedule-dialog-calendar" /><q-select v-model="scheduleForm.status" outlined emit-value map-options :options="exceptionStatusOptions" label="休息狀態"><template #prepend><CalendarOff :size="21" /></template><template #append><ChevronDown :size="18" /></template></q-select><div class="wide form-tip">週一至週五 09:00–17:00 預設可接案；週六、週日已停用，無法選取。</div></q-card-section>
      <q-card-section v-else-if="dialogType === 'journal'" class="form-grid"><q-input v-model="journalForm.title" outlined label="日誌標題（必填）" /><q-input v-model="journalForm.occurredAt" outlined type="datetime-local" label="紀錄日期" /><q-select v-model="journalForm.mood" outlined emit-value map-options :options="moodOptions" label="今天的工作感受"><template #append><ChevronDown :size="18" /></template></q-select><q-toggle v-model="journalForm.followUpRequired" label="需要後續追蹤" color="deep-orange" /><q-input v-model="journalForm.content" outlined autogrow label="工作內容與提醒（必填）" class="wide" /><div class="wide upload-block"><strong><ImagePlus :size="20" />服務照片（最多 3 張）</strong><q-file v-model="journalPhotos" outlined multiple accept="image/jpeg,image/png,image/webp" :max-files="3" label="選擇或拖曳照片" @rejected="fileRejected"><template #prepend><ImagePlus :size="20" /></template></q-file><small>支援 JPG、PNG、WebP；每張上限 5 MB。</small><div v-if="journalPreviews.length" class="preview-grid"><img v-for="item in journalPreviews" :key="item" :src="item" alt="工作日誌照片預覽" /></div></div></q-card-section>
      <q-card-section v-else-if="dialogType === 'incident'" class="form-grid"><q-select v-model="incidentForm.category" outlined emit-value map-options :options="incidentOptions" label="事件類型"><template #append><ChevronDown :size="18" /></template></q-select><q-select v-model="incidentForm.priority" outlined emit-value map-options :options="priorityOptions" label="緊急程度"><template #append><ChevronDown :size="18" /></template></q-select><q-input v-model="incidentForm.description" outlined autogrow label="請描述發生的事情（必填）" class="wide" /></q-card-section>
      <q-card-section v-else-if="dialogType === 'leave'" class="form-grid"><q-select v-model="leaveForm.leaveType" outlined emit-value map-options :options="leaveOptions" label="假別"><template #append><ChevronDown :size="18" /></template></q-select><div class="form-tip">選擇病假時，需附上假單或診斷證明。</div><q-input v-model="leaveForm.startAt" outlined type="datetime-local" label="開始時間" /><q-input v-model="leaveForm.endAt" outlined type="datetime-local" label="結束時間" /><q-input v-model="leaveForm.reason" outlined autogrow label="請假原因（必填）" class="wide" /><div v-if="leaveForm.leaveType === 'SICK'" class="wide upload-block"><strong><FileText :size="20" />假單或診斷證明（必填）</strong><q-file v-model="leaveProof" outlined accept="image/jpeg,image/png,image/webp,application/pdf" label="上傳證明文件"><template #prepend><FileText :size="20" /></template></q-file><small>支援 JPG、PNG、WebP、PDF；檔案上限 8 MB。</small></div></q-card-section>
      <q-card-section v-else-if="dialogType === 'booking'" class="booking-confirm-grid"><div><span>預約使用者</span><strong>{{ selectedBooking?.requesterUserId?.name || '未提供' }}</strong><small>帳號：{{ selectedBooking?.requesterUserId?.account || '未提供' }}　電話：{{ selectedBooking?.requesterUserId?.phone || '未提供' }}</small></div><div><span>受照護者</span><strong>{{ selectedBooking?.recipientId?.name || '本人' }}</strong><small>{{ selectedBooking?.recipientId?.careLevel || '照護程度未填寫' }}・{{ selectedBooking?.recipientId?.mobilityStatus || '行動狀況未填寫' }}</small></div><div><span>身體資訊</span><strong>{{ selectedBooking?.recipientId?.heightCm || '—' }} 公分／{{ selectedBooking?.recipientId?.weightKg || '—' }} 公斤</strong><small>請依實際能力判斷是否適合承接</small></div><div><span>服務內容與時間</span><strong>{{ selectedBooking?.serviceTypeIds?.map(item => item.name).join('、') || '照護服務' }}</strong><small>{{ selectedBooking ? dateTime(selectedBooking.scheduledStartAt) : '' }}</small></div><div class="wide"><span>照護提醒</span><strong>{{ selectedBooking?.recipientId?.specialRequirements || selectedBooking?.recipientId?.healthNotes || '目前沒有特別提醒' }}</strong></div></q-card-section>
      <q-card-section v-else-if="dialogType === 'completion'" class="booking-confirm-grid"><div><span>預約編號</span><strong>{{ selectedBooking?.bookingNumber || selectedBooking?._id }}</strong></div><div><span>受照護者</span><strong>{{ selectedBooking?.recipientId?.name || '申請人本人' }}</strong></div><div><span>服務時間</span><strong>{{ selectedBooking ? dateTime(selectedBooking.scheduledStartAt) : '' }}</strong></div><div><span>服務內容</span><strong>{{ selectedBooking?.serviceTypeIds?.map(item => item.name).join('、') || '照護服務' }}</strong></div><div class="wide"><span>完成確認方式</span><strong>提出後會等待使用者確認，本次服務尚未正式結案。</strong></div></q-card-section>
      <q-card-section v-else><q-rating v-model="reviewForm.rating" size="2.2em" color="deep-orange" /><q-input v-model="reviewForm.comment" outlined autogrow label="想對使用者或受照護者說的話" class="q-mt-lg" /></q-card-section>
      <q-card-actions class="dialog-actions"><q-btn outline no-caps :label="dialogType === 'booking' && selectedBooking?.status !== 'PENDING' ? '關閉' : '先不要'" @click="dialogOpen = false" /><q-btn v-if="dialogType !== 'booking' || selectedBooking?.status === 'PENDING'" unelevated no-caps :loading="saving" class="primary-btn" :label="dialogType === 'schedule' ? '安排' : dialogType === 'booking' ? '確認承接任務' : dialogType === 'completion' ? '提出完成任務' : '確認送出'" @click="confirmSubmit" /></q-card-actions>
    </q-card></q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { useAuthStore } from '@/stores/auth-store';
import { useLiveSyncStore } from '@/stores/live-sync-store';
import { useLocationStore } from '@/stores/location-store';
import { taipeiCalendarTime, taipeiDateKey, taipeiDateParts, taipeiDateTime } from '@/utils/datetime';
import { toCalendarEvent } from '@/utils/booking-calendar';
import { QCalendarDay } from '@quasar/quasar-ui-qcalendar';
import '@quasar/quasar-ui-qcalendar/index.css';
import { BadgeCheck, BookOpenText, BriefcaseBusiness, CalendarClock, CalendarDays, CalendarOff, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3, FileBadge2, FileText, ImagePlus, Mail, MapPin, MessageCircleHeart, MessageSquareHeart, Pencil, Phone, Plus, Search, ShieldAlert, Star, Trash2, UserRound, UserRoundCog, WifiOff, X } from '@lucide/vue';

type Section = 'overview' | 'schedule' | 'journal' | 'reviews' | 'safety' | 'leave';
type DialogType = 'profile' | 'schedule' | 'journal' | 'incident' | 'leave' | 'review' | 'booking' | 'completion';
type Named = { _id?: string; name?: string; role?: string; account?: string; phone?: string; careLevel?: string; mobilityStatus?: string; heightCm?: number; weightKg?: number; specialRequirements?: string; healthNotes?: string };
type Booking = { _id: string; bookingNumber?: string; scheduledStartAt: string; scheduledEndAt?: string; status: string; attendanceStatus?: string; recipientId?: Named; requesterUserId?: Named; serviceTypeIds?: Named[] };
type Availability = { _id: string; date: string; startTime: string; endTime: string; status: 'LEAVE' | 'UNAVAILABLE' };
type Dashboard = { user: { name: string; phone?: string; email?: string }; profile: { profilePhotoUrl?: string; introduction?: string; yearsExperience?: number; serviceAreas?: string[]; verificationStatus: string }; credentials: Array<{ _id: string; name: string; verificationStatus: string }>; bookings: Booking[]; journals: Array<{ _id: string; title: string; content: string; occurredAt: string; photoUrls?: string[] }>; leaves: Array<{ _id: string; startAt: string; endAt: string; leaveType: string; reason: string; status: string; proofFileUrl?: string }>; complaints: Array<{ _id: string; category: string; description: string; status: string; createdAt: string }>; receivedReviews: Array<{ _id: string; rating: number; comment?: string }>; summary: { upcomingBookings: number; pendingLeaves: number; pendingReports: number } };

const EmptyState = defineComponent({ props: { title: { type: String, required: true }, text: { type: String, required: true } }, setup: (props) => () => h('div', { class: 'empty-state' }, [h(ClipboardList, { size: 34 }), h('h3', props.title), h('p', props.text)]) });
const liveSync = useLiveSyncStore();
const locationStore = useLocationStore();
const $q = useQuasar(); const auth = useAuthStore(); const route = useRoute(); const router = useRouter(); const dashboard = ref<Dashboard | null>(null); const loading = ref(true); const saving = ref(false); const errorMessage = ref(''); const activeSection = ref<Section>(route.query.section === 'schedule' ? 'schedule' : 'overview'); const dialogOpen = ref(false); const dialogType = ref<DialogType>('profile'); const selectedBooking = ref<Booking | null>(null); const availabilities = ref<Availability[]>([]); const scheduleDay = ref(new Date().toISOString().slice(0, 10).replace(/-/g, '/')); const scheduleSearch = ref(''); const scheduleStatus = ref('ALL'); const editingAvailabilityId = ref<string | null>(null); const journalPhotos = ref<File[] | null>(null); const leaveProof = ref<File | null>(null); const bookingListRef = ref<HTMLElement | null>(null); const calendarSectionRef = ref<HTMLElement | null>(null);
watch(() => route.query.section, (section) => { if (section === 'schedule') activeSection.value = 'schedule'; });
const bookingView = ref<'list' | 'calendar'>($q.screen.lt.sm ? 'list' : 'calendar'); const calendarDate = ref(taipeiDateKey(new Date())); const calendarRef = ref<any>(null); const calendarView = computed(() => $q.screen.lt.sm ? 'day' : 'week');
const profileForm = reactive({ name: '', phone: '', email: '', yearsExperience: 0, serviceAreasText: '', introduction: '' }); const scheduleForm = reactive({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', endTime: '17:00', status: 'LEAVE' }); const journalForm = reactive({ title: '', content: '', occurredAt: new Date().toISOString().slice(0, 16), mood: 'STEADY', followUpRequired: false }); const incidentForm = reactive({ category: 'WORKPLACE_BULLYING', priority: 'NORMAL', description: '' }); const leaveForm = reactive({ leaveType: 'PERSONAL', startAt: '', endAt: '', reason: '' }); const reviewForm = reactive({ rating: 5, comment: '' });
const moodOptions = [{ label: '平穩', value: 'STEADY' }, { label: '有成就感', value: 'FULFILLED' }, { label: '有些疲累', value: 'TIRED' }, { label: '需要關心', value: 'WORRIED' }]; const incidentOptions = [{ label: '職場霸凌', value: 'WORKPLACE_BULLYING' }, { label: '性騷擾', value: 'SEXUAL_HARASSMENT' }, { label: '出勤交通事故', value: 'COMMUTE_ACCIDENT' }, { label: '服務現場事故', value: 'SERVICE_ACCIDENT' }, { label: '其他安全事件', value: 'OTHER_SAFETY' }]; const priorityOptions = [{ label: '一般', value: 'NORMAL' }, { label: '重要', value: 'HIGH' }, { label: '緊急', value: 'URGENT' }]; const leaveOptions = [{ label: '事假', value: 'PERSONAL' }, { label: '病假', value: 'SICK' }, { label: '家庭照顧', value: 'FAMILY' }, { label: '其他', value: 'OTHER' }]; const availabilityStatusOptions = [{ label: '全部休息狀態', value: 'ALL' }, { label: '休假', value: 'LEAVE' }, { label: '暫無提供服務', value: 'UNAVAILABLE' }]; const exceptionStatusOptions = availabilityStatusOptions.filter((item) => item.value === 'UNAVAILABLE');
const menuItems = [{ value: 'overview' as Section, label: '我的專業資料', caption: '聯絡方式與證照', eyebrow: 'MY PROFILE', description: '維護家庭會看到的專業資料；證照仍由管理員審核。', icon: UserRoundCog }, { value: 'schedule' as Section, label: '預約與工作時間', caption: '任務、服務與歷程', eyebrow: 'MY SCHEDULE', description: '查看即將開始與過去完成的服務任務。', icon: CalendarClock }, { value: 'journal' as Section, label: '工作日誌', caption: '交班與追蹤重點', eyebrow: 'CARE JOURNAL', description: '把值得留意的服務細節好好記下來。', icon: BookOpenText }, { value: 'reviews' as Section, label: '雙向服務評量', caption: '星等與服務回饋', eyebrow: 'CARE FEEDBACK', description: '查看回饋，也能在完成任務後評量服務對象。', icon: MessageSquareHeart }, { value: 'safety' as Section, label: '安全與事故通報', caption: '霸凌、騷擾與事故', eyebrow: 'SAFE REPORT', description: '遇到不舒服或危險的事情，不必獨自承擔。', icon: ShieldAlert }, { value: 'leave' as Section, label: '安心請假', caption: '申請與審核結果', eyebrow: 'REST & RECOVER', description: '提早安排休息，平台會協助確認服務調度。', icon: CalendarOff }];
const currentMenu = computed(() => menuItems.find((item) => item.value === activeSection.value)!); const greeting = computed(() => new Date().getHours() < 12 ? '早安' : new Date().getHours() < 18 ? '午安' : '晚安');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const photoUrl = computed(() => { const value = dashboard.value?.profile.profilePhotoUrl; if (!value) return '/chioansimicon.svg'; if (/^https?:\/\//.test(value)) return value; const path = value.startsWith('/') ? value : `/${value}`; return path.startsWith('/uploads/') ? `${apiBaseUrl.replace(/\/api\/?$/, '')}${path}` : path; });
function useFallbackPhoto(event: Event) { const image = event.currentTarget as HTMLImageElement; if (!image.src.endsWith('/chioansimicon.svg')) image.src = '/chioansimicon.svg'; }
const verificationLabel = computed(() => ({ PENDING: '接案資格審核中', APPROVED: '接案資格已通過', REJECTED: '證照需要補件', EXPIRED: '證照已到期' } as Record<string, string>)[dashboard.value?.profile.verificationStatus || 'PENDING']);
const locationUpdatedLabel = computed(() => locationStore.lastUpdatedAt ? new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(locationStore.lastUpdatedAt)) : '尚未分享');
const summaries = computed(() => [{ section: 'schedule' as Section, label: '即將服務', value: `${dashboard.value?.summary.upcomingBookings || 0} 件`, caption: '查看預約與服務時間', icon: CalendarClock }, { section: 'journal' as Section, label: '工作日誌', value: `${dashboard.value?.journals.length || 0} 篇`, caption: '留下交班與追蹤重點', icon: BookOpenText }, { section: 'leave' as Section, label: '待審請假', value: `${dashboard.value?.summary.pendingLeaves || 0} 件`, caption: '安排休息也照顧自己', icon: CalendarOff }, { section: 'safety' as Section, label: '處理中通報', value: `${dashboard.value?.summary.pendingReports || 0} 件`, caption: '需要協助時告訴我們', icon: ShieldAlert }]);
const actions: Partial<Record<Section, { label: string; type: DialogType }>> = { journal: { label: '新增工作日誌', type: 'journal' }, safety: { label: '立即安全通報', type: 'incident' }, leave: { label: '提出請假申請', type: 'leave' } }; const sectionAction = computed(() => { const item = actions[activeSection.value]; return item ? { label: item.label, action: () => openDialog(item.type) } : null; });
const dialogTitle = computed(() => dialogType.value === 'booking' && selectedBooking.value?.status !== 'PENDING' ? '照護任務詳情' : ({ profile: '修改我的資料', schedule: editingAvailabilityId.value ? '修改休假安排' : '安排休假', journal: '寫一篇安心工作日誌', incident: '向管理員提出安全通報', leave: '提出請假申請', review: '留下本次服務評量', booking: '確認這次照護任務', completion: '提出完成任務' }[dialogType.value])); const dialogCopy = computed(() => ({ profile: '姓名與電話會與帳號綁定，避免冒用；接案資格不會因此改變。', schedule: '平日 09:00–17:00 預設開放預約；這裡只需要登記休假或暫停服務。', journal: '記錄服務重點、交班提醒或後續需要留意的事情。送出後無法修改。', incident: '若正遭遇立即危險，請先撥打 110 或 119，再留下平台通報。', leave: '送出後由管理員確認；若已有行程，請同步與平台聯繫。', review: '您的回饋只用於改善媒合品質與服務安全。', booking: '請核對使用者、受照護者、服務內容與時間。班表只提供查看，不會直接修改任務。', completion: '送出後會通知使用者核對；雙方確認後，系統才會正式結案。' }[dialogType.value]));
const weekdayOnly = (date: string) => { const day = new Date(`${date.replace(/\//g, '-')}T00:00:00`).getDay(); return day !== 0 && day !== 6; };
const selectedScheduleDayLabel = computed(() => {
  const [year, month, day] = scheduleDay.value.split('/');
  return `${year} 年 ${month} 月 ${day} 日`;
});
const leaveCalendarDates = computed(() => (dashboard.value?.leaves || []).filter((item) => item.status === 'APPROVED').map((item) => taipeiDateKey(new Date(item.startAt)).replace(/-/g, '/')));
const selectedDayAvailability = computed(() => {
  const date = scheduleDay.value.replace(/\//g, '-');
  return (dashboard.value?.leaves || []).find((item) => item.status === 'APPROVED' && taipeiDateKey(new Date(item.startAt)) === date) || availabilities.value.find((item) => item.date.slice(0, 10) === date);
});
const filteredAvailabilities = computed(() => {
  const date = scheduleDay.value.replace(/\//g, '-');
  const today = new Date().toISOString().slice(0, 10);
  return availabilities.value
    .filter((item) => scheduleStatus.value === 'ALL' ? item.date.slice(0, 10) === date : item.status === scheduleStatus.value && item.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
});
const availabilityListTitle = computed(() => scheduleStatus.value === 'ALL' ? `${selectedScheduleDayLabel.value} 的休假安排` : `今天以後的${exceptionLabel(scheduleStatus.value)}安排`);
const filteredBookings = computed(() => {
  const keyword = scheduleSearch.value.trim().toLowerCase();
  const now = Date.now();
  return [...(dashboard.value?.bookings || [])]
    .filter((item) => !keyword || `${item.requesterUserId?._id || ''} ${item.requesterUserId?.account || ''} ${item.requesterUserId?.phone || ''} ${item.requesterUserId?.name || ''} ${item.recipientId?._id || ''} ${item.recipientId?.name || ''}`.toLowerCase().includes(keyword))
    .sort((a, b) => {
      const aTime = +new Date(a.scheduledStartAt);
      const bTime = +new Date(b.scheduledStartAt);
      if ((aTime < now) !== (bTime < now)) return aTime < now ? 1 : -1;
      return aTime < now ? bTime - aTime : aTime - bTime;
    });
});
const journalPreviews = computed(() => (journalPhotos.value || []).map((file) => URL.createObjectURL(file)));
const exceptionLabel = (value: string) => value === 'LEAVE' ? '休假' : '暫無提供服務';
const overlaps = (startA: string, endA: string, startB: string, endB: string) => new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
const isBookingOnUnavailableDay = (booking: Booking) => (dashboard.value?.leaves || []).some((item) => ['PENDING', 'APPROVED'].includes(item.status) && overlaps(booking.scheduledStartAt, booking.scheduledEndAt || booking.scheduledStartAt, item.startAt, item.endAt));
const attendanceLabel = (booking: Booking) => booking.status === 'CANCELLED' ? '取消任務' : ({ CHECKED_IN: '已報到', LATE: '遲到・已抵達', OVERDUE: '逾期中', COMPLETED: '完成任務' } as Record<string, string>)[booking.attendanceStatus || ''] || bookingStatus(booking.status);
const bookingTone = (booking: Booking) => booking.status === 'CANCELLED' || booking.attendanceStatus === 'COMPLETED' ? 'muted' : booking.attendanceStatus === 'OVERDUE' ? 'danger' : ['ACCEPTED', 'ARRIVED', 'IN_SERVICE'].includes(booking.status) || ['CHECKED_IN', 'LATE'].includes(booking.attendanceStatus || '') ? 'success' : 'neutral';
type CalendarEvent = ReturnType<typeof toCalendarEvent> & { id: string; kind: 'booking' | 'leave'; status?: string };
const calendarEvents = computed<CalendarEvent[]>(() => [
  ...filteredBookings.value.filter((booking) => !['CANCELLED', 'ABANDONED'].includes(booking.status)).map((booking) => ({ ...toCalendarEvent(booking), id: booking._id, kind: 'booking' as const })),
  ...(dashboard.value?.leaves || []).filter((leave) => ['PENDING', 'APPROVED'].includes(leave.status)).map((leave) => ({ id: `leave-${leave._id}`, bookingId: '', kind: 'leave' as const, status: leave.status, date: taipeiDateKey(new Date(leave.startAt)), startTime: taipeiCalendarTime(new Date(leave.startAt)), durationMinutes: Math.max(30, (new Date(leave.endAt).getTime() - new Date(leave.startAt).getTime()) / 60000), title: `${leaveStatus(leave.status)}・${leaveName(leave.leaveType)}` })),
]);
const calendarRangeLabel = computed(() => taipeiDateTime(`${calendarDate.value}T00:00:00+08:00`, { year: 'numeric', month: 'long', day: 'numeric' }));
const bookingById = (id: string) => dashboard.value?.bookings.find((booking) => booking._id === id);
const eventsForDay = (date: string) => calendarEvents.value.filter((event) => event.date === date);
const calendarEventTone = (event: CalendarEvent) => event.kind === 'leave' ? (event.status === 'APPROVED' ? 'muted' : 'neutral') : bookingTone(bookingById(event.bookingId)!);
function calendarEventStyle(event: CalendarEvent, scope: { timeStartPos: (time: string) => number | false; timeDurationHeight: (minutes: number) => number }) { const top = scope.timeStartPos(event.startTime); return { top: `${top === false ? 0 : top}px`, height: `${Math.max(44, scope.timeDurationHeight(event.durationMinutes))}px` }; }
function openBookingDetails(id: string) { const booking = bookingById(id); if (booking) openBookingConfirm(booking); }
function openDialog(type: DialogType) { dialogType.value = type; if (type === 'profile' && dashboard.value) Object.assign(profileForm, { name: dashboard.value.user.name, phone: dashboard.value.user.phone || '', email: dashboard.value.user.email || '', yearsExperience: dashboard.value.profile.yearsExperience || 0, serviceAreasText: dashboard.value.profile.serviceAreas?.join('、') || '', introduction: dashboard.value.profile.introduction || '' }); if (type === 'journal') journalPhotos.value = null; if (type === 'leave') leaveProof.value = null; dialogOpen.value = true; } function openProfile() { openDialog('profile'); } function openReview(booking: Booking) { selectedBooking.value = booking; openDialog('review'); } function openBookingConfirm(booking: Booking) { selectedBooking.value = booking; openDialog('booking'); } function openCompletionConfirm(booking: Booking) { selectedBooking.value = booking; openDialog('completion'); }
function openSchedule(item?: Availability) { editingAvailabilityId.value = item?._id || null; Object.assign(scheduleForm, item ? { date: item.date.slice(0, 10), startTime: '09:00', endTime: '17:00', status: item.status } : { date: scheduleDay.value.replace(/\//g, '-'), startTime: '09:00', endTime: '17:00', status: 'LEAVE' }); openDialog('schedule'); }
const mapLabel = (options: Array<{ label: string; value: string }>, value: string) => options.find((item) => item.value === value)?.label || value; const statusLabel = (v: string) => ({ PENDING: '待審核', APPROVED: '已通過', REJECTED: '需補件', EXPIRED: '已到期' } as Record<string, string>)[v] || v; const bookingStatus = (v: string) => ({ PENDING: '等待居服員確認', ACCEPTED: '確認任務', DEPARTED: '已出發', ARRIVED: '已抵達', WAITING_DECISION: '等待確認', IN_SERVICE: '服務中', AWAITING_USER_CONFIRMATION: '等待使用者確認完成', COMPLETED: '已完成', CANCELLED: '取消任務', ABANDONED: '已棄單' } as Record<string, string>)[v] || v; const complaintStatus = (v: string) => ({ SUBMITTED: '已送出', UNDER_REVIEW: '處理中', NEED_MORE_INFORMATION: '需要補充', RESOLVED: '已完成', REJECTED: '未成立', CANCELLED: '已撤回' } as Record<string, string>)[v] || v; const leaveStatus = (v: string) => ({ PENDING: '待審核', APPROVED: '已核准', REJECTED: '未核准', CANCELLED: '已撤回' } as Record<string, string>)[v] || v; const incidentName = (v: string) => mapLabel(incidentOptions, v); const leaveName = (v: string) => mapLabel(leaveOptions, v); const dateTime = (v: string) => taipeiDateTime(v, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); const day = (v: string) => String(taipeiDateParts(v).day).padStart(2, '0'); const month = (v: string) => `${taipeiDateParts(v).month} 月`;
async function loadAvailabilities() { availabilities.value = (await api.get<Availability[]>('/nurses/me/availability')).data; }
function locationFailure(error: any) { $q.notify({ type: 'negative', position: 'top', message: error?.response?.data?.message || error?.message || '目前無法分享位置，請稍後再試。' }); }
async function runLocationAction(action: () => Promise<void>, message: string) { saving.value = true; try { await action(); await loadDashboard(); liveSync.notifyChanged(); $q.notify({ type: 'positive', position: 'top', message }); } catch (error: any) { locationFailure(error); } finally { saving.value = false; } }
const beginJourney = (booking: Booking) => runLocationAction(() => locationStore.startSharing(booking._id), '已開始前往，位置只會在本次任務途中分享。');
const resumeJourney = (booking: Booking) => runLocationAction(() => locationStore.startSharing(booking._id, true), '已繼續分享本次任務位置。');
const markArrived = (booking: Booking) => runLocationAction(() => locationStore.arrive(booking._id), '已通知家庭您抵達服務地點。');
const beginService = (booking: Booking) => runLocationAction(() => locationStore.startService(booking._id), '服務已開始，位置分享已停止。');
async function stopLocationSharing() { saving.value = true; try { await locationStore.stopSharing(); $q.notify({ type: 'info', position: 'top', message: '位置分享已停止。' }); } catch (error: any) { locationFailure(error); } finally { saving.value = false; } }
const locationBooking = computed(() => dashboard.value?.bookings.find((booking) => booking._id === locationStore.bookingId && ['DEPARTED', 'ARRIVED'].includes(booking.status)) ?? dashboard.value?.bookings.find((booking) => ['ACCEPTED', 'DEPARTED', 'ARRIVED'].includes(booking.status)) ?? null);
function openPriorityTask() {
  const priority = ['IN_SERVICE', 'ARRIVED', 'DEPARTED', 'ACCEPTED', 'PENDING'];
  const booking = priority.map((status) => dashboard.value?.bookings.find((item) => item.status === status)).find((item): item is Booking => Boolean(item));
  if (booking) openBookingConfirm(booking);
  else $q.notify({ type: 'info', position: 'top', message: '目前沒有需要處理的任務。' });
}
async function handleRadialLocation() {
  const booking = locationBooking.value;
  if (!booking) { $q.notify({ type: 'info', position: 'top', message: '目前沒有可以分享位置的進行中任務。' }); return; }
  if (booking.status === 'ACCEPTED') await beginJourney(booking);
  else if (booking.status === 'DEPARTED' && locationStore.isSharing) await markArrived(booking);
  else if (booking.status === 'DEPARTED') await resumeJourney(booking);
  else if (booking.status === 'ARRIVED' && locationStore.isSharing) await beginService(booking);
  else if (booking.status === 'ARRIVED') await resumeJourney(booking);
}
async function handleNurseRadialAction(action: unknown) {
  if (!action || loading.value) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (action === 'today') {
    activeSection.value = 'schedule'; bookingView.value = 'list'; scheduleSearch.value = ''; scheduleStatus.value = 'ALL';
    await nextTick();
    bookingListRef.value?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  } else if (action === 'calendar') {
    activeSection.value = 'schedule'; bookingView.value = 'calendar'; calendarDate.value = taipeiDateKey(new Date());
    await nextTick();
    calendarRef.value?.moveToToday();
    calendarSectionRef.value?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  } else if (action === 'activity') openPriorityTask();
  else if (action === 'location') await handleRadialLocation();
  await router.replace({ query: { ...route.query, radial: undefined } });
}
watch(() => route.query.radial, handleNurseRadialAction, { immediate: true });
async function loadDashboard() { loading.value = true; errorMessage.value = ''; try { const restored = await auth.restoreSession(); if (!restored || auth.user?.role !== 'NURSE') { await router.replace('/login'); return; } const workspace = await api.get<Dashboard>('/nurses/me/dashboard'); dashboard.value = workspace.data; if (locationStore.isSharing && !workspace.data.bookings.some((item) => item._id === locationStore.bookingId && ['DEPARTED', 'ARRIVED'].includes(item.status))) locationStore.stopLocal(); await loadAvailabilities().catch(() => { availabilities.value = []; }); } catch (error: any) { errorMessage.value = error?.response?.data?.message || '請確認後端與 MongoDB 已啟動，再重新整理一次。'; } finally { loading.value = false; } }
async function request(task: () => Promise<unknown>) { saving.value = true; try { await task(); dialogOpen.value = false; await loadDashboard(); liveSync.notifyChanged(); } finally { saving.value = false; } }
function fileRejected() { errorMessage.value = '照片最多 3 張，且每張需小於 5 MB。'; }
function confirmSubmit() { if (dialogType.value === 'journal' && !window.confirm('確定送出這篇工作日誌嗎？送出後無法修改。')) return; void submitDialog(); }
async function submitDialog() { if (dialogType.value === 'profile') await request(() => api.patch('/nurses/me/profile', { name: profileForm.name, phone: profileForm.phone, email: profileForm.email, yearsExperience: profileForm.yearsExperience, serviceAreas: profileForm.serviceAreasText.split(/[、,，]/).map((v) => v.trim()).filter(Boolean), introduction: profileForm.introduction })); else if (dialogType.value === 'schedule') await request(() => editingAvailabilityId.value ? api.patch(`/nurses/availability/${editingAvailabilityId.value}`, { ...scheduleForm, date: new Date(`${scheduleForm.date}T00:00:00`) }) : api.post('/nurses/me/availability', { ...scheduleForm, date: new Date(`${scheduleForm.date}T00:00:00`) })); else if (dialogType.value === 'journal') { const body = new FormData(); Object.entries(journalForm).forEach(([key, value]) => body.append(key, String(value))); (journalPhotos.value || []).forEach((file) => body.append('photos', file)); await request(() => api.post('/nurses/me/journals', body)); } else if (dialogType.value === 'incident') { const body = new FormData(); Object.entries(incidentForm).forEach(([key, value]) => body.append(key, value)); await request(() => api.post('/feedback/complaints', body)); } else if (dialogType.value === 'leave') { if (leaveForm.leaveType === 'SICK' && !leaveProof.value) { errorMessage.value = '病假請先上傳假單或診斷證明。'; return; } const body = new FormData(); Object.entries(leaveForm).forEach(([key, value]) => body.append(key, value)); if (leaveProof.value) body.append('proof', leaveProof.value); await request(() => api.post('/nurses/me/leaves', body)); } else if (dialogType.value === 'booking' && selectedBooking.value) { const id = selectedBooking.value._id; await request(() => api.post(`/bookings/${id}/accept`)); } else if (dialogType.value === 'completion' && selectedBooking.value) { const id = selectedBooking.value._id; await request(() => api.post(`/bookings/${id}/request-completion`)); } else { const targetUserId = selectedBooking.value?.requesterUserId?._id; if (targetUserId) { await request(() => api.post('/feedback/reviews', { bookingId: selectedBooking.value?._id, targetUserId, ...reviewForm })); Object.assign(reviewForm, { rating: 5, comment: '' }); $q.notify({ type: 'positive', position: 'top', timeout: 2500, message: '完成回饋，謝謝您留下服務感受。', actions: [{ label: '關閉', color: 'white' }] }); } } }
async function removeAvailability(id: string) { await api.delete(`/nurses/availability/${id}`); await loadAvailabilities(); liveSync.notifyChanged(); } async function hideJournal(id: string) { await api.delete(`/nurses/me/journals/${id}`); await loadDashboard(); liveSync.notifyChanged(); } async function cancelLeave(id: string) { await api.patch(`/nurses/me/leaves/${id}/cancel`); await loadDashboard(); liveSync.notifyChanged(); } onMounted(async () => { await locationStore.getPermissionStatus(); await loadDashboard(); await handleNurseRadialAction(route.query.radial); liveSync.start(loadDashboard); }); onBeforeUnmount(() => { liveSync.stop(); void locationStore.stopSharing(); journalPreviews.value.forEach((url) => URL.revokeObjectURL(url)); });
</script>

<style scoped>
.nurse-page{--milk:#fff9f5;--paper:#fffdfb;--ink:#493833;--brown:#6e5750;--peach:#eb9079;--orange:#c55418;min-height:100%;padding:42px 24px 80px;color:var(--brown);background:var(--milk)}.nurse-shell{width:min(1180px,100%);margin:auto}.hero{display:flex;align-items:center;gap:22px;padding:35px 40px;color:#fff;background:var(--brown);background-image:repeating-radial-gradient(circle at 88% 20%,transparent 0 46px,rgb(255 255 255/.05) 48px 50px);border-radius:30px;box-shadow:0 20px 50px rgb(78 52 43/.12)}.hero>img{width:100px;height:100px;object-fit:cover;background:#fff;border:5px solid #f5b09e;border-radius:32px}.hero-copy{flex:1}.hero-copy p,.content-card header p{margin:0 0 7px;color:#ffd9cf;font-size:.76rem;font-weight:800;letter-spacing:.16em}.hero-copy h1{margin:0;font-size:clamp(1.8rem,4vw,2.7rem)}.hero-copy span{display:block;margin-top:10px;color:#fff4ef}.verify-pill{display:flex;align-items:center;gap:8px;padding:11px 15px;color:var(--ink);background:#fff4ee;border-radius:999px;font-weight:700}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:22px 0}.summary-grid>button,.summary-grid>.q-skeleton{border-radius:21px}.summary-grid>button{min-height:140px;display:grid;grid-template-columns:auto 1fr;gap:3px 13px;padding:21px;text-align:left;color:var(--brown);background:var(--paper);border:1px solid #eddfd8;box-shadow:0 10px 25px rgb(78 52 43/.07);cursor:pointer;transition:transform .2s ease}.summary-grid>button:hover{transform:translateY(-3px)}.summary-grid svg{grid-row:1/4;padding:8px;color:var(--orange);background:#fff0ea;border-radius:12px;box-sizing:content-box}.summary-grid strong{font-size:1.55rem;color:var(--ink)}.summary-grid small{color:#947d75}.work-grid{display:grid;grid-template-columns:286px minmax(0,1fr);gap:20px}.work-menu,.content-card{background:var(--paper);border:1px solid #eddfd8;border-radius:25px;box-shadow:0 14px 34px rgb(78 52 43/.07)}.work-menu{align-self:start;padding:9px}.work-menu button{width:100%;min-height:70px;display:flex;align-items:center;gap:11px;padding:11px 13px;color:var(--brown);text-align:left;background:transparent;border:0;border-radius:16px;cursor:pointer}.work-menu button:hover,.work-menu button.active{color:var(--orange);background:#fff0ea}.work-menu button>span{flex:1;display:flex;flex-direction:column}.work-menu small{margin-top:3px;color:#967e76}.content-card{min-height:550px;padding:28px}.content-card>header{display:flex;justify-content:space-between;gap:18px;padding-bottom:22px;border-bottom:1px solid #eee3de}.content-card header p{color:var(--orange)}.content-card h2{margin:0;color:var(--ink);font-size:1.75rem}.content-card header span{display:block;margin-top:7px}.primary-btn{min-height:45px;padding:0 18px;color:#fff;background:var(--orange);border-radius:13px;font-weight:700}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px;margin-top:22px}.profile-grid article{min-width:0;padding:24px;background:#fffaf7;border:1px solid #eddfd8;border-radius:19px}.profile-grid h3{display:flex;align-items:center;gap:10px;margin:0;color:var(--ink);font-size:1.05rem}.profile-grid h3 svg{flex:0 0 auto;color:var(--orange)}dl{display:grid;grid-template-columns:88px minmax(0,1fr);gap:11px;margin:22px 0}dt{color:#997f76;font-size:.88rem}dd{min-width:0;margin:0;color:var(--ink);font-size:1rem;font-weight:600;overflow-wrap:anywhere}ul{padding:0;margin:20px 0;list-style:none}li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #eee3de}li span{min-width:0;font-size:1rem;font-weight:600;overflow-wrap:anywhere}li small{flex:0 0 auto;color:var(--orange);font-size:.82rem}.schedule-panel{margin-top:21px}.schedule-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) 150px auto;gap:10px;align-items:center}.schedule-layout{display:grid;grid-template-columns:minmax(280px,300px) minmax(0,1fr);gap:24px;margin-top:18px;align-items:start}.schedule-calendar{width:100%;min-width:0;padding:10px;background:#fff7f2;border:1px solid #eddfd8;border-radius:20px}.availability-list{min-width:0;min-height:260px;padding-top:2px}.schedule-note{display:flex;min-height:32px;align-items:center;gap:8px;margin:0 0 12px;color:var(--ink);font-weight:700;line-height:1.5}.availability-row{display:grid;grid-template-columns:minmax(0,1fr) auto 44px 44px;gap:8px;align-items:center;min-width:0;padding:12px 14px;background:#fffaf7;border:1px solid #eddfd8;border-radius:15px}.availability-row+.availability-row{margin-top:9px}.availability-row strong,.availability-row small{display:block}.availability-row strong{color:var(--ink);font-size:1.04rem}.availability-row small{margin-top:3px;color:#927970}.availability-badge{padding:6px 9px;border-radius:999px;font-size:.78rem;white-space:nowrap}.availability-badge.available{color:#3d6b56;background:#e5f2ea}.availability-badge.booked{color:#875312;background:#fff0d9}.availability-badge.unavailable{color:#855958;background:#f7e8e7}.booking-divider{display:flex;align-items:center;gap:12px;margin:26px 0 12px;color:#967c73;font-size:.9rem;font-weight:700}.booking-divider::before,.booking-divider::after{height:1px;flex:1;background:#eddfd8;content:''}.record-list{display:grid;gap:11px;margin-top:21px}.record-row,.review-row{display:flex;align-items:center;gap:14px;padding:16px;background:#fffaf7;border:1px solid #eddfd8;border-radius:16px}.record-main{flex:1}.record-row h3{margin:0;color:var(--ink);font-size:1.02rem}.record-row p,.review-row p{margin:5px 0 0;line-height:1.6}.record-row small{color:var(--orange);font-weight:700}.date-box{width:50px;text-align:center;color:var(--orange)}.date-box strong{display:block;font-size:1.45rem}.tag{padding:6px 10px;background:#efe6e1;border-radius:999px;font-size:.78rem;white-space:nowrap}.outline-btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;color:var(--orange);background:#fff;border:1px solid #e7ae9d;border-radius:11px;cursor:pointer}.icon-btn{width:44px;height:44px;display:grid;place-items:center;color:#a84a3c;background:transparent;border:0;border-radius:11px;cursor:pointer}.icon-btn.danger{color:#af4e45}.stars{display:flex;color:#d96b27}.review-row{display:block}.empty-state,.empty-panel{padding:50px 20px;text-align:center;color:#937b73}.empty-state h3,.empty-panel h2{margin:12px 0 5px;color:var(--ink)}.empty-panel{width:min(700px,100%);margin:38px auto;background:var(--paper);border-radius:23px}.form-dialog{width:min(840px,calc(100vw - 30px));max-width:min(840px,calc(100vw - 30px))!important;max-height:90vh;overflow-y:auto;color:var(--brown);background:var(--paper);border-radius:26px}.dialog-head{display:flex;justify-content:space-between;gap:18px;padding:29px 32px 17px}.dialog-head small{color:var(--orange);font-size:.78rem;font-weight:800;letter-spacing:.1em}.dialog-head h2{margin:5px 0 0;color:var(--ink);font-size:1.85rem}.dialog-head p{max-width:600px;margin:7px 0 0;line-height:1.6}.dialog-head button{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;color:var(--brown);background:#fff0ea;border:0;border-radius:14px;cursor:pointer}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:12px 32px 25px}.form-grid :deep(.q-field__control){min-height:56px;border-radius:15px}.form-grid :deep(.q-field--outlined .q-field__control:before){border-color:#dfd0ca}.form-grid :deep(.q-select__dropdown-icon){display:none}.wide{grid-column:1/-1}.form-tip{display:flex;align-items:center;padding:0 15px;color:#887169;background:#fff5f0;border-radius:15px;font-size:.9rem}.upload-block{display:flex;flex-direction:column;gap:9px;padding:17px;background:#fff6f1;border-radius:17px}.upload-block strong{display:flex;align-items:center;gap:8px;color:var(--ink);font-size:1rem}.upload-block strong svg{color:var(--orange)}.upload-block small{color:#8d746b}.preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.preview-grid img{width:100%;aspect-ratio:1.2;object-fit:cover;border-radius:13px}.dialog-actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 32px 29px}
@media(max-width:900px){.summary-grid{grid-template-columns:1fr 1fr}.work-grid{grid-template-columns:1fr}.work-menu{display:grid;grid-template-columns:1fr 1fr}.profile-grid,.schedule-layout{grid-template-columns:1fr}.schedule-calendar{max-width:340px}}@media(max-width:599px){.nurse-page{padding:18px 13px 55px}.hero{align-items:flex-start;padding:22px 18px;border-radius:21px}.hero>img{width:66px;height:66px;border-radius:20px}.hero-copy span{display:none}.verify-pill{position:absolute;margin-top:95px;font-size:.76rem}.summary-grid{gap:9px;margin-top:48px}.summary-grid>button{min-height:130px;display:flex;flex-direction:column;padding:15px}.work-menu{grid-template-columns:1fr 1fr;padding:6px}.work-menu button{min-height:62px;padding:8px}.work-menu small,.work-menu button>svg:last-child{display:none}.content-card{padding:19px 14px;border-radius:21px}.content-card>header{display:block}.content-card header .primary-btn{width:100%;margin-top:15px}.schedule-toolbar{grid-template-columns:1fr 1fr}.schedule-toolbar .primary-btn{grid-column:1/-1}.availability-row{grid-template-columns:minmax(0,1fr) auto 42px 42px}.record-row{align-items:flex-start;flex-wrap:wrap}.tag{margin-left:auto}.form-grid{grid-template-columns:1fr;padding-inline:18px}.wide{grid-column:auto}.form-tip{min-height:48px}.dialog-head,.dialog-actions{padding-inline:18px}.dialog-head h2{font-size:1.55rem}.preview-grid{grid-template-columns:repeat(2,1fr)}}@media(prefers-reduced-motion:reduce){.summary-grid>button{transition:none}}
/* 表單彈窗沿用「受照護者檔案」的暖色閱讀卡片；資料與送出流程不變。 */
.form-dialog{
  width:min(880px,calc(100vw - 30px));
  max-width:min(880px,calc(100vw - 30px))!important;
  color:var(--brown);
  background:#fffdfb;
  border:1px solid #f0e4de;
  border-radius:26px;
  box-shadow:0 24px 70px rgb(77 52 43/.18)
}
.availability-badge.leave{color:#875312;background:#fff0d9}.tag-success{color:#2f6b51;background:#def1e7}.tag-danger{color:#a93f37;background:#fde6e3}.tag-muted,.booking-cancelled{color:#786b66;background:#eeeeec}.journal-guidance{margin:0;padding:14px 16px;color:#745e57;background:#fff1ea;border-radius:14px;line-height:1.7}
.dialog-head{padding:28px 32px 18px;border-bottom:1px solid #f1e5df}
.dialog-head small{color:var(--orange);font-size:.78rem;font-weight:800;letter-spacing:.12em}
.dialog-head h2{margin:7px 0 0;color:var(--ink);font-size:1.9rem;line-height:1.3}
.dialog-head p{margin-top:9px;color:#806961;font-size:.96rem;line-height:1.7}
.dialog-head button{color:var(--ink);background:#fff3ed;transition:background-color .18s ease,transform .18s ease}
.dialog-head button:hover{background:#ffe7dc;transform:translateY(-1px)}
.form-grid{gap:14px;padding:20px 32px 25px}
.detail-form-grid :deep(.q-field__control){min-height:64px;background:#fff6f1;border-radius:15px}
.detail-form-grid :deep(.q-field--outlined .q-field__control:before){border-color:transparent}
.detail-form-grid :deep(.q-field--outlined .q-field__control:hover:before){border-color:#e8c9bd}
.detail-form-grid :deep(.q-field--focused .q-field__control:after){border-width:1.5px;border-color:var(--peach)}
.detail-form-grid :deep(.q-field__prepend){padding-right:13px;color:var(--orange)}
.detail-form-grid :deep(.q-field__label){color:#8a7067;font-size:.82rem}
.detail-form-grid :deep(.q-field__native),
.detail-form-grid :deep(.q-field__input){color:var(--ink);font-size:1rem;font-weight:600;line-height:1.5}
.detail-form-grid :deep(.q-textarea .q-field__control){min-height:82px}
.dialog-actions{padding:17px 32px 29px;border-top:1px solid #f1e5df}
.dialog-actions .q-btn{min-width:120px;min-height:44px;border-radius:13px;font-weight:700}
.dialog-actions .q-btn--outline{color:var(--brown)}
.dialog-actions .primary-btn{color:#fff!important;background:#c55418!important}
.availability-row.available{background:#f1efed}
.location-sharing-card{margin-top:14px;color:var(--brown);background:#fffaf7;border-color:#ead9d1;border-radius:18px}.location-sharing-card__head,.location-sharing-card__head>div{display:flex;align-items:center;gap:10px}.location-sharing-card__head{justify-content:space-between;padding-bottom:8px}.location-sharing-card__head>div>svg{flex:0 0 auto;color:var(--orange)}.location-sharing-card__head span{display:grid}.location-sharing-card__head small{color:#957a71}.location-sharing-card__head strong{color:var(--ink);font-size:1.05rem}.sharing-badge{padding:6px 10px;color:#fff;background:#3f765d}.sharing-badge.is-off{color:#74645e;background:#eee8e5}.location-sharing-card__body{display:grid;gap:8px;padding-top:4px}.location-privacy-banner{color:#755e56;background:#fff0e8}.location-sharing-card__body>small{color:#8d746b}.location-sharing-card__body>p{margin:0;color:#ae4038}.stop-sharing-button{min-height:42px;color:#a44338;border-radius:12px}
.accept-task-button,.complete-task-button,.journey-button{min-height:44px;padding:0 14px;color:#fff;background:#3f765d;border:0;border-radius:12px;font-weight:700;white-space:nowrap;cursor:pointer}.accept-task-button:hover,.complete-task-button:hover,.journey-button:hover{background:#315f4a}.accept-task-button:disabled,.complete-task-button:disabled,.journey-button:disabled{opacity:.55;cursor:wait}.schedule-dialog-calendar{width:100%;background:#fff6f1;border:1px solid #eddfd8;border-radius:17px}.booking-confirm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 32px 25px}.booking-confirm-grid>div{display:grid;gap:5px;padding:17px;background:#fff6f1;border-radius:16px}.booking-confirm-grid span,.booking-confirm-grid small{color:#8a7067}.booking-confirm-grid strong{color:var(--ink);font-size:1.04rem;line-height:1.5}
.leave-day-banner{margin-bottom:16px;color:#665f5b;background:#eeeeec;border:1px solid #d5d1ce}.leave-day-banner :deep(.q-banner__avatar){color:#77716d}.leave-day-banner__copy{display:flex;flex-direction:column;gap:4px}.leave-day-banner__copy strong{color:#514b48;font-size:1rem}.leave-day-banner__copy span{color:#817a76;font-size:.88rem}.accept-task-button:disabled{color:#716a66;background:#ebe8e5;border:1px solid #d8d3cf;cursor:not-allowed;opacity:1}
.booking-view-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px}.booking-view-toolbar>span{color:#8a7067;font-size:.88rem}.calendar-panel{min-width:0;margin-top:14px;overflow:hidden;background:#fffaf7;border:1px solid #eddfd8;border-radius:18px}.calendar-nav{display:grid;grid-template-columns:44px auto minmax(0,1fr) 44px;gap:8px;align-items:center;padding:10px;border-bottom:1px solid #eddfd8}.calendar-nav button{min-width:44px;min-height:44px;padding:0 13px;display:grid;place-items:center;color:var(--brown);background:#fff;border:1px solid #e7d7d0;border-radius:12px;font-weight:700;cursor:pointer}.calendar-nav strong{text-align:center;color:var(--ink)}.calendar-panel :deep(.q-calendar){height:650px;background:#fff}.calendar-event{position:absolute;left:4px!important;right:4px!important;z-index:2;display:grid;align-content:start;gap:2px;min-height:44px;margin:0;padding:5px 7px;text-align:left;white-space:normal;overflow:hidden;border:1px solid rgb(73 56 51/.12);border-radius:8px;cursor:pointer}.calendar-event strong{font-size:.78rem}.calendar-event span{font-size:.82rem;line-height:1.3;overflow:hidden}.calendar-event:focus-visible{outline:3px solid #2f6fca;outline-offset:2px}
@media(max-width:599px){
  .form-dialog{width:calc(100vw - 20px);max-width:calc(100vw - 20px)!important;border-radius:22px}
  .dialog-head{padding:22px 18px 16px}
  .form-grid{padding:18px}
  .dialog-actions{padding:15px 18px 22px}
  .dialog-actions .q-btn{flex:1;min-width:0}
  .booking-confirm-grid{grid-template-columns:1fr;padding:18px}.booking-confirm-grid .wide{grid-column:auto}
  .booking-view-toolbar{align-items:stretch;flex-direction:column}.booking-view-toolbar :deep(.q-btn-group){width:100%}.booking-view-toolbar :deep(.q-btn){min-height:44px;flex:1}.calendar-nav{grid-template-columns:44px auto minmax(0,1fr) 44px;padding:8px}.calendar-nav strong{font-size:.88rem}.calendar-panel :deep(.q-calendar){height:610px}
}
.booking-divider,.calendar-panel{scroll-margin-top:90px}
</style>
