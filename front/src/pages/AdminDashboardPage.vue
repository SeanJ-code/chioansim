<template>
  <q-page class="admin-page">
    <main class="admin-shell">
      <section class="admin-hero">
        <div>
          <p class="eyebrow">CHIOANSIM CARE INTELLIGENCE</p>
          <h1>理解每一次照護，及早接住需要</h1>
          <p>把預約、評價與安全通報整理成清楚的行動提醒，讓管理不只是看資料。</p>
        </div>
        <div class="hero-status" aria-live="polite">
          <span class="live-dot"></span>
          <div><strong>資料已同步</strong><small>{{ refreshedAt }}</small></div>
          <q-btn flat round aria-label="重新整理管理資料" :loading="loading" @click="loadDashboard">
            <RefreshCw :size="21" />
          </q-btn>
        </div>
      </section>

      <section class="pulse-grid" aria-label="平台即時摘要">
        <article v-for="item in pulseCards" :key="item.label" class="pulse-card" :class="item.tone">
          <component :is="item.icon" :size="28" aria-hidden="true" />
          <div><strong>{{ item.value }}</strong><span>{{ item.label }}</span><small>{{ item.note }}</small></div>
        </article>
      </section>

      <section class="attention-card" aria-labelledby="attention-title">
        <header>
          <div><p class="section-kicker">TODAY'S CARE</p><h2 id="attention-title">今天需要關心</h2></div>
          <q-badge rounded :label="`${attentionCount} 件待處理`" color="deep-orange-8" />
        </header>
        <q-list v-if="dashboard.attention.length" separator>
          <q-item v-for="item in dashboard.attention" :key="item.type" clickable v-ripple class="attention-item" @click="openAttention(item)">
            <q-item-section avatar><q-avatar :class="`attention-${item.priority.toLowerCase()}`"><TriangleAlert :size="21" /></q-avatar></q-item-section>
            <q-item-section><q-item-label class="text-weight-bold">{{ item.title }}</q-item-label><q-item-label caption>{{ item.description }}</q-item-label></q-item-section>
            <q-item-section side><q-badge outline color="deep-orange-9" :label="`${item.count} 件`" /></q-item-section>
            <q-item-section side><ChevronRight :size="20" aria-hidden="true" /></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="attention-clear"><ShieldCheck :size="28" /><span>目前沒有需要優先處理的事情</span></div>
      </section>

      <q-tabs v-model="tab" class="admin-tabs" align="left" no-caps outside-arrows mobile-arrows>
        <q-tab name="overview" label="理解總覽" />
        <q-tab name="quality" :label="`品質警訊 ${dashboard.alerts.length || ''}`" />
        <q-tab name="members" label="成員管理" />
        <q-tab name="services" label="預約動向" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated class="admin-panels">
        <q-tab-panel name="overview">
          <div class="insight-grid overview-grid">
            <article class="insight-card ratings-card">
              <header>
                <div class="icon-disc"><Star :size="25" /></div>
                <div><p class="section-kicker">服務心聲</p><h2>整體滿意度</h2></div>
              </header>
              <div class="rating-summary">
                <strong>{{ reviewAverage }}</strong>
                <div>
                  <div class="large-stars" :aria-label="`平均 ${reviewAverage} 顆星`">
                    <Star v-for="number in 5" :key="number" :class="{ filled: number <= Math.round(Number(reviewAverage)) }" />
                  </div>
                  <span>{{ dashboard.reviews.summary.count }} 則真實回饋・{{ positiveRate }}% 為 4 星以上</span>
                </div>
              </div>
              <div class="performance-list">
                <div><span>本月完成率</span><q-linear-progress rounded size="9px" :value="dashboard.performance.completionRate / 100" color="positive" track-color="brown-2" /><strong>{{ dashboard.performance.completionRate }}%</strong></div>
                <div><span>本月取消率</span><q-linear-progress rounded size="9px" :value="dashboard.performance.cancellationRate / 100" color="deep-orange-7" track-color="brown-2" /><strong>{{ dashboard.performance.cancellationRate }}%</strong></div>
                <div><span>評價填寫率</span><q-linear-progress rounded size="9px" :value="dashboard.performance.reviewRate / 100" color="brown-6" track-color="brown-2" /><strong>{{ dashboard.performance.reviewRate }}%</strong></div>
              </div>
            </article>

            <article class="insight-card journey-card">
              <header>
                <div class="icon-disc peach"><Route :size="25" /></div>
                <div><p class="section-kicker">使用旅程</p><h2>從加入到留下心得</h2></div>
              </header>
              <div class="journey-flow">
                <div v-for="step in journeySteps" :key="step.label">
                  <span>{{ step.value }}</span><small>{{ step.label }}</small>
                </div>
              </div>
              <p class="soft-note">可看出使用者在哪個步驟停下，作為後續關懷與介面改善依據。</p>
            </article>

            <q-expansion-item class="ranking-expansion" label="查看服務與居服員排行" header-class="ranking-header">
            <div class="ranking-grid">
            <article class="insight-card demand-card">
              <header><div class="icon-disc green"><ChartNoAxesColumnIncreasing :size="25" /></div><div><p class="section-kicker">使用頻率</p><h2>常用服務</h2></div></header>
              <div v-if="dashboard.serviceDemand.length" class="demand-list"><div v-for="(service, index) in dashboard.serviceDemand.slice(0, 5)" :key="service.name"><span><b>{{ index + 1 }}</b>{{ service.name }}</span><strong>{{ service.count }} 次</strong></div></div>
              <p v-else class="empty-copy">尚無服務頻率資料。</p>
            </article>
            <article class="insight-card caregivers-card">
              <header>
                <div class="icon-disc brown"><HeartHandshake :size="25" /></div>
                <div><p class="section-kicker">服務連結</p><h2>常被選擇的居服員</h2></div>
              </header>
              <div v-if="dashboard.caregiverFrequency.length" class="caregiver-list">
                <div v-for="caregiver in dashboard.caregiverFrequency.slice(0, 5)" :key="caregiver.caregiverId">
                  <div class="avatar">{{ caregiver.name?.slice(0, 1) || '照' }}</div>
                  <div><strong>{{ caregiver.name }}</strong><span>{{ caregiver.bookingCount }} 次預約・{{ caregiver.uniqueRequesterCount }} 位家庭</span></div>
                  <small><Star :size="15" class="filled-star" />{{ caregiver.ratingAverage?.toFixed(1) || '0.0' }}</small>
                </div>
              </div>
              <p v-else class="empty-copy">尚無居服員預約頻率資料。</p>
            </article>
            </div>
            </q-expansion-item>
          </div>
        </q-tab-panel>

        <q-tab-panel name="quality">
          <section class="quality-heading">
            <div><p class="section-kicker">QUALITY & SAFETY</p><h2>需要優先關心的品質警訊</h2><p>三次以上一星評價會自動出現在這裡；處置會保留管理紀錄。</p></div>
            <div class="quality-count"><TriangleAlert :size="26" /><strong>{{ dashboard.alerts.length }}</strong><span>件待處理</span></div>
          </section>
          <q-btn-toggle v-model="qualityStatus" no-caps unelevated toggle-color="deep-orange-8" color="brown-1" text-color="brown-8" :options="qualityStatusOptions" class="filter-toggle" />
          <q-list v-if="filteredAlerts.length" separator class="quality-inbox">
            <q-item v-for="alert in filteredAlerts" :key="alert._id" clickable v-ripple @click="openAlert(alert)">
              <q-item-section avatar><q-avatar :class="`attention-${alert.severity?.toLowerCase() || 'medium'}`"><TriangleAlert :size="20" /></q-avatar></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{ caregiverAlertName(alert) }}</q-item-label><q-item-label caption>{{ alert.title || alert.description }}</q-item-label></q-item-section>
              <q-item-section side><q-badge outline :color="alert.severity === 'HIGH' ? 'negative' : 'orange-8'" :label="alert.severity || '待關注'" /><small>{{ formatDate(alert.createdAt) }}</small></q-item-section>
              <q-item-section side><ChevronRight :size="20" /></q-item-section>
            </q-item>
          </q-list>
          <div v-else class="all-clear"><ShieldCheck :size="44" /><h3>目前沒有未處理的品質警訊</h3><p>系統仍會持續留意低星評價與安全事件。</p></div>

          <section class="recent-reviews">
            <header><MessageCircleHeart :size="25" /><div><p class="section-kicker">最新心聲</p><h2>使用者與受照護者回饋</h2></div></header>
            <div class="review-grid">
              <article v-for="review in dashboard.reviews.recent" :key="review._id">
                <div class="small-stars"><Star v-for="n in 5" :key="n" :class="{ filled: n <= review.rating }" /></div>
                <p>「{{ review.comment || '這次沒有留下文字心得。' }}」</p>
                <small>{{ review.reviewerUserId?.name || '匿名成員' }} → {{ review.targetUserId?.name || '服務成員' }}</small>
              </article>
            </div>
          </section>
        </q-tab-panel>

        <q-tab-panel name="members">
          <section class="table-heading">
            <div><p class="section-kicker">MEMBER MANAGEMENT</p><h2>使用者、受照護者與居服員</h2></div>
            <div class="member-tools">
              <q-input v-model="search" outlined dense clearable placeholder="搜尋姓名、帳號或角色"><template #prepend><Search :size="20" /></template></q-input>
              <q-btn unelevated no-caps label="新增成員" class="resolve-button" @click="openCreate" />
            </div>
          </section>
          <q-btn-toggle v-model="memberRole" no-caps unelevated toggle-color="deep-orange-8" color="brown-1" text-color="brown-8" :options="memberRoleOptions" class="filter-toggle" />
          <div class="member-table" role="table" aria-label="平台成員列表">
            <div class="member-row table-label" role="row"><span>成員</span><span>身份</span><span>聯絡方式</span><span>狀態</span><span>管理</span></div>
            <div v-for="user in filteredUsers" :key="user._id" class="member-row" role="row" :class="{ clickable: user.role === 'NURSE' }" @click="user.role === 'NURSE' && openCaregiver(user)">
              <span class="member-name"><i>{{ user.name?.slice(0, 1) }}</i><b>{{ user.name }}</b><small>{{ user.account }}</small></span>
              <span><q-badge outline :label="roleLabel(user.role)" /></span>
              <span class="contact"><b>{{ user.phone || '未填電話' }}</b><small>{{ user.email || '未填信箱' }}</small></span>
              <span><q-badge :color="user.status === 'ACTIVE' ? 'positive' : 'grey-7'" :label="statusLabel(user.status)" /></span>
              <span class="row-actions">
                <q-btn flat round aria-label="修改成員" @click.stop="openEdit(user)"><Pencil :size="18" /></q-btn>
                <q-btn flat round color="negative" aria-label="隱藏成員" @click.stop="confirmHide(user)"><EyeOff :size="18" /></q-btn>
              </span>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="services">
          <section class="table-heading">
            <div><p class="section-kicker">BOOKING PULSE</p><h2>最近預約與服務動向</h2></div>
            <div class="booking-tools" aria-label="篩選預約動向">
              <q-input v-model="bookingSearch" outlined dense clearable label="搜尋使用者、受照護者或居服員"><template #prepend><Search :size="20" /></template></q-input>
              <q-input v-model="bookingDate" outlined dense clearable type="date" label="預約日期" />
              <q-select v-model="bookingStatus" :options="bookingStatusOptions" outlined dense emit-value map-options label="任務狀態" />
            </div>
          </section>
          <div class="booking-list">
            <article v-for="booking in filteredBookings" :key="booking._id" role="button" tabindex="0" aria-label="查看預約完整資料" @click="openBooking(booking)" @keydown.enter="openBooking(booking)" @keydown.space.prevent="openBooking(booking)">
              <div class="booking-icon"><CalendarClock :size="25" /></div>
              <div><strong>{{ booking.bookingNumber }}</strong><span>{{ serviceNames(booking) }}</span><small>使用者：{{ booking.requesterUserId?.name || '未提供' }}　受照護者：{{ booking.recipientId?.name || '本人服務' }}　居服員：{{ caregiverName(booking) }}</small></div>
              <time>{{ formatDate(booking.scheduledStartAt) }}</time>
              <q-badge :color="bookingStatusColor(booking.status)" :label="bookingStatusLabel(booking.status)" />
            </article>
            <div v-if="!filteredBookings.length" class="booking-empty">目前沒有符合搜尋條件的預約。</div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </main>

    <q-dialog v-model="bookingDialog">
      <q-card class="booking-detail-dialog">
        <q-card-section class="booking-detail-heading">
          <div><p class="section-kicker">BOOKING PROFILE</p><h2>{{ selectedBooking?.bookingNumber }}</h2></div>
          <q-btn flat round aria-label="關閉預約資料" v-close-popup>×</q-btn>
        </q-card-section>
        <q-card-section v-if="selectedBooking" class="booking-detail-body">
          <q-tabs v-model="bookingDetailTab" dense no-caps align="left" class="detail-tabs"><q-tab name="summary" label="任務概況" /><q-tab name="care" label="照護資訊" /><q-tab name="history" label="任務歷程" /></q-tabs>
          <q-tab-panels v-model="bookingDetailTab" animated class="detail-panels">
          <q-tab-panel name="summary">
          <q-banner v-if="bookingAnomaly(selectedBooking)" rounded class="booking-progress__warning"><template #avatar><TriangleAlert :size="22" /></template><strong>需要注意</strong><div>{{ bookingAnomaly(selectedBooking) }}</div></q-banner>
          <q-img v-if="selectedBooking.recipientId?.carePhotoUrls?.[0]" :src="selectedBooking.recipientId.carePhotoUrls[0]" ratio="1.45" :alt="`${selectedBooking.recipientId.name}的照護近照`" />
          <div class="booking-detail-grid">
            <div><span>申請人</span><strong>{{ selectedBooking.requesterUserId?.name || '未提供' }}</strong></div>
            <div><span>受照護者</span><strong>{{ selectedBooking.recipientId?.name || '本人使用服務' }}</strong></div>
            <div><span>服務居服員</span><strong>{{ caregiverName(selectedBooking) }}</strong></div>
            <div><span>預約狀態</span><strong>{{ bookingStatusLabel(selectedBooking.status) }}</strong></div>
            <div><span>預約時間</span><strong>{{ formatFullDate(selectedBooking.scheduledStartAt) }}</strong></div>
            <div><span>服務項目</span><strong>{{ serviceNames(selectedBooking) }}</strong></div>
            <div class="wide"><span>服務地址</span><strong>{{ selectedBooking.serviceAddress?.text || selectedBooking.serviceRequestId?.serviceAddress?.text || '未填寫' }}</strong></div>
          </div>

          <section class="booking-progress" aria-label="任務執行進度">
            <header>
              <div><span>即時任務進度</span><h3>{{ bookingStatusLabel(selectedBooking.status) }}</h3></div>
              <q-badge rounded :color="bookingStatusColor(selectedBooking.status)" :label="bookingStatusLabel(selectedBooking.status)" />
            </header>
            <q-stepper :model-value="bookingProgressStep(selectedBooking)" flat alternative-labels animated active-color="deep-orange-8" done-color="positive" inactive-color="brown-3">
              <q-step :name="1" title="提出需求" :done="bookingProgressStep(selectedBooking) > 1" />
              <q-step :name="2" title="確認任務" :done="bookingProgressStep(selectedBooking) > 2" />
              <q-step :name="3" title="前往服務" :done="bookingProgressStep(selectedBooking) > 3" />
              <q-step :name="4" title="抵達現場" :done="bookingProgressStep(selectedBooking) > 4" />
              <q-step :name="5" title="執行服務" :done="bookingProgressStep(selectedBooking) > 5" />
              <q-step :name="6" title="雙方完成" :done="selectedBooking.status === 'COMPLETED'" />
            </q-stepper>

            <q-banner v-if="['CANCELLED', 'ABANDONED'].includes(selectedBooking.status)" rounded class="booking-progress__warning">
              此任務已{{ selectedBooking.status === 'CANCELLED' ? '取消' : '棄單' }}{{ selectedBooking.cancellationReason ? `：${selectedBooking.cancellationReason}` : '。' }}
            </q-banner>

          </section>
          </q-tab-panel>
          <q-tab-panel name="care">
            <q-img v-if="selectedBooking.recipientId?.carePhotoUrls?.[0]" :src="selectedBooking.recipientId.carePhotoUrls[0]" ratio="1.45" :alt="`${selectedBooking.recipientId.name}的照護近照`" />
            <div class="booking-detail-grid"><div><span>身高／體重</span><strong>{{ recipientMeasurement(selectedBooking.recipientId) }}</strong></div><div><span>照護程度／行動狀況</span><strong>{{ selectedBooking.recipientId?.careLevel || '未填' }}／{{ selectedBooking.recipientId?.mobilityStatus || '未填' }}</strong></div><div class="wide"><span>照護提醒與需求</span><strong>{{ selectedBooking.serviceRequestId?.specialRequirements || selectedBooking.recipientId?.attentionNotes || '目前沒有特別提醒' }}</strong></div></div>
          </q-tab-panel>
          <q-tab-panel name="history">
            <div class="booking-progress-grid"><div><h3>完整任務歷程</h3><q-timeline color="deep-orange-7" layout="dense"><q-timeline-entry v-for="event in bookingTimeline(selectedBooking)" :key="event.label" :title="event.label" :subtitle="formatFullDate(event.at)" /></q-timeline></div><aside class="booking-location">
                <Route :size="25" />
                <div><span>居服員最新位置</span><strong>{{ formatCoordinate(selectedBooking.latestLocation) }}</strong></div>
                <a v-if="selectedBooking.latestLocation?.latitude" :href="locationMapUrl(selectedBooking.latestLocation)" target="_blank" rel="noopener noreferrer">在地圖確認</a>
                <small v-else>尚未開始分享位置；出發後會即時更新。</small>
              </aside>
            </div>
          </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="安心看完了" v-close-popup class="resolve-button" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="qualityDialog"><q-card class="booking-detail-dialog" v-if="selectedAlert"><q-card-section class="booking-detail-heading"><div><p class="section-kicker">QUALITY ALERT</p><h2>{{ caregiverAlertName(selectedAlert) }}</h2></div><q-btn flat round v-close-popup aria-label="關閉品質警訊">×</q-btn></q-card-section><q-card-section class="booking-detail-body"><q-banner rounded class="booking-progress__warning">{{ selectedAlert.description }}</q-banner><div class="review-quotes"><blockquote v-for="review in selectedAlert.reviewIds || []" :key="review._id">「{{ review.comment || '未留下文字說明' }}」</blockquote></div><q-input v-model="selectedAlert.note" outlined autogrow label="管理員處置備註" class="note-input" /><div class="alert-actions"><q-btn outline no-caps label="已發出警示" @click="handleAlert(selectedAlert, 'WARNED', 'ACKNOWLEDGED')" /><q-btn outline no-caps label="安排關懷約談" @click="handleAlert(selectedAlert, 'INTERVIEW_REQUIRED', 'ACKNOWLEDGED')" /><q-btn color="negative" outline no-caps label="暫停接案" @click="handleAlert(selectedAlert, 'SUSPEND_RECOMMENDED', 'ACKNOWLEDGED')" /><q-btn unelevated no-caps label="完成處理" class="resolve-button" @click="handleAlert(selectedAlert, 'CLOSED', 'RESOLVED')" /></div></q-card-section></q-card></q-dialog>

    <q-dialog v-model="caregiverDialog"><q-card class="booking-detail-dialog"><q-card-section class="booking-detail-heading"><div><p class="section-kicker">CAREGIVER PROFILE</p><h2>{{ caregiverOverview.caregiver?.userId?.name || '居服員資料' }}</h2></div><q-btn flat round v-close-popup aria-label="關閉居服員資料">×</q-btn></q-card-section><q-card-section class="booking-detail-body"><q-skeleton v-if="caregiverLoading" type="rect" height="240px" /><template v-else><q-tabs v-model="caregiverTab" dense no-caps align="left" class="detail-tabs"><q-tab name="basic" label="基本資料" /><q-tab name="credentials" :label="`資格與證照 ${caregiverOverview.credentials?.length || ''}`" /><q-tab name="leaves" label="請假紀錄" /><q-tab name="services" label="服務紀錄" /><q-tab name="quality" label="品質與管理" /></q-tabs><q-tab-panels v-model="caregiverTab" animated class="detail-panels"><q-tab-panel name="basic"><div class="booking-detail-grid"><div><span>電話</span><strong>{{ caregiverOverview.caregiver?.userId?.phone || '未填' }}</strong></div><div><span>評分</span><strong>{{ caregiverOverview.caregiver?.ratingAverage?.toFixed?.(1) || '0.0' }}</strong></div></div></q-tab-panel><q-tab-panel name="credentials"><q-list separator><q-item v-for="item in caregiverOverview.credentials" :key="item._id"><q-item-section><q-item-label>{{ item.name }}</q-item-label><q-item-label caption>{{ item.expiresAt ? `${formatDate(item.expiresAt)} 到期` : '無到期日' }}</q-item-label></q-item-section><q-item-section side><q-badge :color="item.verificationStatus === 'APPROVED' ? 'positive' : 'orange-8'" :label="item.verificationStatus" /></q-item-section></q-item></q-list></q-tab-panel><q-tab-panel name="leaves"><q-list separator><q-item v-for="item in caregiverOverview.leaves" :key="item._id"><q-item-section><q-item-label>{{ item.reason }}</q-item-label><q-item-label caption>{{ formatDate(item.startAt) }}</q-item-label></q-item-section><q-item-section side><q-badge :label="item.status" /></q-item-section></q-item></q-list></q-tab-panel><q-tab-panel name="services"><q-list separator><q-item v-for="item in caregiverOverview.bookings" :key="item._id"><q-item-section><q-item-label>{{ item.bookingNumber }}</q-item-label><q-item-label caption>{{ serviceNames(item) }}</q-item-label></q-item-section><q-item-section side>{{ bookingStatusLabel(item.status) }}</q-item-section></q-item></q-list></q-tab-panel><q-tab-panel name="quality"><q-expansion-item :label="`品質警訊 ${caregiverOverview.alerts?.length || 0}`"><q-list><q-item v-for="item in caregiverOverview.alerts" :key="item._id"><q-item-section>{{ item.title }}</q-item-section></q-item></q-list></q-expansion-item><q-expansion-item :label="`管理操作紀錄 ${caregiverOverview.auditLogs?.length || 0}`"><q-list separator><q-item v-for="log in caregiverOverview.auditLogs" :key="log._id"><q-item-section><q-item-label>{{ log.action }}</q-item-label><q-item-label caption>{{ log.adminUserId?.name || '系統管理員' }}・{{ formatDate(log.createdAt) }}</q-item-label></q-item-section></q-item></q-list></q-expansion-item></q-tab-panel></q-tab-panels></template></q-card-section></q-card></q-dialog>

    <q-dialog v-model="editDialog">
      <q-card class="edit-dialog">
        <q-card-section><p class="section-kicker">MEMBER PROFILE</p><h2>調整成員資料</h2></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editForm.name" outlined label="姓名" />
          <q-input v-model="editForm.phone" outlined label="聯絡電話" />
          <q-input v-model="editForm.email" outlined label="電子信箱" />
          <q-select v-model="editForm.status" outlined label="帳號狀態" :options="statusOptions" emit-value map-options />
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="先不修改" v-close-popup /><q-btn unelevated no-caps label="儲存調整" class="resolve-button" @click="saveUser" /></q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="createDialog">
      <q-card class="edit-dialog">
        <q-card-section><p class="section-kicker">NEW MEMBER</p><h2>新增平台成員</h2><p>先建立登入帳號，角色專屬資料可於後續流程補齊。</p></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="createForm.name" outlined label="姓名（必填）" />
          <q-input v-model="createForm.account" outlined label="登入帳號（至少 4 字元）" />
          <q-input v-model="createForm.password" outlined type="password" label="臨時密碼（至少 8 字元）" />
          <q-select v-model="createForm.role" outlined label="使用身份" :options="roleOptions" emit-value map-options />
          <q-input v-model="createForm.phone" outlined label="聯絡電話" />
          <q-input v-model="createForm.email" outlined label="電子信箱" />
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="先不新增" v-close-popup /><q-btn unelevated no-caps label="建立成員帳號" class="resolve-button" :loading="creating" @click="createUser" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import {
  CalendarClock, ChartNoAxesColumnIncreasing, ChevronRight, EyeOff, HeartHandshake, MessageCircleHeart,
  Pencil, RefreshCw, Route, Search, ShieldCheck, Star, TriangleAlert, UsersRound,
} from '@lucide/vue';
import { api } from '@/boot/axios';
import { useAuthStore } from '@/stores/auth-store';
import { useLiveSyncStore } from '@/stores/live-sync-store';
import { taipeiDateKey, taipeiDateTime } from '@/utils/datetime';

type PlainObject = Record<string, any>;
type AlertItem = PlainObject & { note?: string };
type Dashboard = {
  generatedAt: string;
  pulse: PlainObject;
  reviews: { distribution: { _id: number; count: number }[]; summary: PlainObject; recent: PlainObject[] };
  serviceDemand: { code?: string; name: string; count: number; completedCount: number; uniqueRequesterCount: number; uniqueCaregiverCount: number }[];
  caregiverFrequency: PlainObject[];
  journey: PlainObject;
  performance: PlainObject;
  attention: PlainObject[];
  alerts: AlertItem[];
  recentBookings: PlainObject[];
};

const emptyDashboard = (): Dashboard => ({ generatedAt: '', pulse: {}, reviews: { distribution: [], summary: {}, recent: [] }, serviceDemand: [], caregiverFrequency: [], journey: {}, performance: {}, attention: [], alerts: [], recentBookings: [] });
const dashboard = reactive<Dashboard>(emptyDashboard());
const users = ref<PlainObject[]>([]);
const tab = ref('overview');
const search = ref('');
const bookingSearch = ref('');
const bookingDate = ref('');
const bookingStatus = ref('ALL');
const attentionFilter = ref('');
const memberRole = ref('ALL');
const qualityStatus = ref('OPEN');
const memberRoleOptions = [{ label: '全部', value: 'ALL' }, { label: '使用者', value: 'USER' }, { label: '受照護者', value: 'PATIENT' }, { label: '居服員', value: 'NURSE' }, { label: '管理員', value: 'ADMIN' }];
const qualityStatusOptions = [{ label: '待處理', value: 'OPEN' }, { label: '已關注', value: 'ACKNOWLEDGED' }, { label: '已完成', value: 'RESOLVED' }];
const qualityDialog = ref(false);
const selectedAlert = ref<AlertItem | null>(null);
const caregiverDialog = ref(false);
const caregiverLoading = ref(false);
const caregiverTab = ref('basic');
const caregiverOverview = reactive<PlainObject>({ caregiver: null, credentials: [], leaves: [], bookings: [], alerts: [], auditLogs: [] });
const loading = ref(false);
const editDialog = ref(false);
const bookingDialog = ref(false);
const bookingDetailTab = ref('summary');
const selectedBooking = ref<PlainObject | null>(null);
const createDialog = ref(false);
const creating = ref(false);
const editingId = ref('');
const editForm = reactive({ name: '', phone: '', email: '', status: 'ACTIVE' });
const createForm = reactive({ name: '', account: '', password: '', role: 'USER', phone: '', email: '' });
const statusOptions = [{ label: '正常使用', value: 'ACTIVE' }, { label: '暫停使用', value: 'SUSPENDED' }, { label: '等待處理', value: 'PENDING' }];
const roleOptions = [{ label: '使用者／家屬', value: 'USER' }, { label: '受照護者', value: 'PATIENT' }, { label: '居服員', value: 'NURSE' }, { label: '管理員', value: 'ADMIN' }];
const bookingStatusOptions = [{ label: '全部狀態', value: 'ALL' }, { label: '等待居服員確認', value: 'PENDING' }, { label: '確認任務', value: 'ACCEPTED' }, { label: '等待使用者確認完成', value: 'AWAITING_USER_CONFIRMATION' }, { label: '已完成', value: 'COMPLETED' }, { label: '取消任務', value: 'CANCELLED' }];
const authStore = useAuthStore();
const liveSync = useLiveSyncStore();
const router = useRouter();
const $q = useQuasar();

const refreshedAt = computed(() => dashboard.generatedAt ? `更新於 ${new Date(dashboard.generatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}` : '準備資料中');
const reviewAverage = computed(() => Number(dashboard.reviews.summary.average || 0).toFixed(1));
const positiveRate = computed(() => dashboard.reviews.summary.count ? Math.round((dashboard.reviews.summary.positive / dashboard.reviews.summary.count) * 100) : 0);
const attentionCount = computed(() => dashboard.attention.reduce((sum, item) => sum + Number(item.count), 0));
const pulseCards = computed(() => [
  { label: '今日預約服務', value: dashboard.pulse.todayBookings || 0, note: `${dashboard.pulse.activeServices || 0} 件進行中`, icon: CalendarClock, tone: 'orange' },
  { label: '本月完成率', value: `${dashboard.performance.completionRate || 0}%`, note: `取消率 ${dashboard.performance.cancellationRate || 0}%`, icon: ChartNoAxesColumnIncreasing, tone: 'brown' },
  { label: '需要關心', value: attentionCount.value, note: `${dashboard.pulse.openComplaints || 0} 件申訴處理中`, icon: TriangleAlert, tone: 'red' },
  { label: '待審居服員文件', value: dashboard.pulse.pendingCredentials || 0, note: `共 ${dashboard.pulse.caregiverCount || 0} 位居服員`, icon: ShieldCheck, tone: 'green' },
]);
const journeySteps = computed(() => [
  { label: '註冊成員', value: dashboard.journey.registered || 0 }, { label: '提出需求', value: dashboard.journey.requested || 0 },
  { label: '成功預約', value: dashboard.journey.booked || 0 }, { label: '完成服務', value: dashboard.journey.completed || 0 },
  { label: '留下心得', value: dashboard.journey.reviewed || 0 },
]);
const filteredUsers = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return users.value
    .filter((user) => memberRole.value === 'ALL' || user.role === memberRole.value)
    .filter((user) => attentionFilter.value !== 'DOCUMENT_ATTENTION' || user.role === 'NURSE')
    .filter((user) => !keyword || [user.name, user.account, user.role, user.phone, user.email].some((value) => String(value || '').toLowerCase().includes(keyword)));
});
const filteredAlerts = computed(() => dashboard.alerts.filter((alert) => alert.status === qualityStatus.value));
const filteredBookings = computed(() => {
  const keyword = bookingSearch.value.trim().toLowerCase();
  return dashboard.recentBookings
    .filter((booking) => bookingStatus.value === 'ALL' || booking.status === bookingStatus.value)
    .filter((booking) => attentionFilter.value !== 'PENDING_OVER_2H' || (booking.status === 'PENDING' && Date.now() - new Date(booking.createdAt).getTime() >= 7200000))
    .filter((booking) => attentionFilter.value !== 'CONFIRMATION_OVER_24H' || (booking.status === 'AWAITING_USER_CONFIRMATION' && Date.now() - new Date(booking.completionRequestedAt).getTime() >= 86400000))
    .filter((booking) => !bookingDate.value || localDateKey(booking.scheduledStartAt) === bookingDate.value)
    .filter((booking) => !keyword || [booking.requesterUserId?.name, booking.requesterUserId?.account, booking.recipientId?.name, caregiverName(booking)].some((value) => String(value || '').toLowerCase().includes(keyword)))
    .slice()
    .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());
});

async function loadDashboard() {
  loading.value = true;
  try {
    const [{ data }, usersResponse, nursesResponse] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/users'), api.get('/admin/nurses')]);
    Object.assign(dashboard, emptyDashboard(), data);
    const profiles = new Map(nursesResponse.data.map((profile: PlainObject) => [profile.userId?._id, profile]));
    users.value = usersResponse.data.map((user: PlainObject) => ({ ...user, caregiverProfile: profiles.get(user._id) }));
  } catch {
    $q.notify({ type: 'negative', message: '管理資料暫時無法讀取，請確認管理員權限與後端連線。' });
  } finally { loading.value = false; }
}

function ratingCount(rating: number) { return dashboard.reviews.distribution.find((item) => item._id === rating)?.count || 0; }
function ratingPercent(rating: number) { return dashboard.reviews.summary.count ? Math.round((ratingCount(rating) / dashboard.reviews.summary.count) * 100) : 0; }
function serviceWidth(count: number) { return Math.max(8, Math.round((count / Math.max(...dashboard.serviceDemand.map((item) => item.count), 1)) * 100)); }
function caregiverAlertName(alert: PlainObject) { return alert.caregiverId?.userId?.name || '待確認居服員'; }
function roleLabel(role: string) { return ({ USER: '使用者／家屬', PATIENT: '受照護者', NURSE: '居服員', ADMIN: '管理員' } as PlainObject)[role] || role; }
function statusLabel(status: string) { return ({ ACTIVE: '正常', SUSPENDED: '暫停', PENDING: '等待處理' } as PlainObject)[status] || status; }
function serviceNames(booking: PlainObject) { return booking.serviceTypeIds?.map((item: PlainObject) => item.name).join('、') || '一般照護服務'; }
function caregiverName(booking: PlainObject) { return booking.caregiverId?.userId?.name || '等待居服員'; }
function formatDate(value: string) { return taipeiDateTime(value, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function localDateKey(value: string) { return taipeiDateKey(value); }
function formatFullDate(value: string) { return taipeiDateTime(value, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }); }
function bookingStatusLabel(status: string) { return ({ PENDING: '等待居服員確認', ACCEPTED: '確認任務', DEPARTED: '前往中', ARRIVED: '已抵達', WAITING_DECISION: '等待判定', IN_SERVICE: '服務中', AWAITING_USER_CONFIRMATION: '等待使用者確認完成', COMPLETED: '已完成', CANCELLED: '取消任務', ABANDONED: '已棄單' } as PlainObject)[status] || status; }
function bookingStatusColor(status: string) { return ['WAITING_DECISION', 'ABANDONED'].includes(status) ? 'negative' : ['ACCEPTED', 'COMPLETED'].includes(status) ? 'positive' : ['DEPARTED', 'ARRIVED', 'IN_SERVICE', 'AWAITING_USER_CONFIRMATION'].includes(status) ? 'orange-8' : 'brown-6'; }
function bookingProgressStep(booking: PlainObject) {
  if (booking.completedAt || booking.status === 'COMPLETED') return 6;
  if (booking.serviceStartedAt || ['IN_SERVICE', 'AWAITING_USER_CONFIRMATION'].includes(booking.status)) return 5;
  if (booking.arrivedAt || ['ARRIVED', 'WAITING_DECISION'].includes(booking.status)) return 4;
  if (booking.departedAt || booking.status === 'DEPARTED') return 3;
  if (booking.acceptedAt || booking.status === 'ACCEPTED') return 2;
  return 1;
}
function bookingTimeline(booking: PlainObject) {
  return [
    { label: '使用者提出照護需求', at: booking.createdAt },
    { label: '居服員確認任務', at: booking.acceptedAt },
    { label: '居服員開始前往', at: booking.departedAt },
    { label: '抵達服務地點', at: booking.arrivedAt },
    { label: '開始執行服務', at: booking.serviceStartedAt },
    { label: '居服員提出完成', at: booking.completionRequestedAt },
    { label: '雙方確認完成', at: booking.completedAt },
    { label: '任務取消', at: booking.cancelledAt },
  ].filter((event) => Boolean(event.at));
}
function formatCoordinate(location?: PlainObject) { return location?.address || (location?.latitude ? `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}` : '尚未分享位置'); }
function locationMapUrl(location: PlainObject) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`; }
function recipientMeasurement(recipient?: PlainObject) { return recipient ? `${recipient.heightCm || '未填'} 公分／${recipient.weightKg || '未填'} 公斤` : '未建立受照護者資料'; }
function openBooking(booking: PlainObject) { selectedBooking.value = booking; bookingDetailTab.value = 'summary'; bookingDialog.value = true; }
function openAttention(item: PlainObject) { tab.value = item.targetTab; attentionFilter.value = item.filter || ''; if (item.targetStatus) bookingStatus.value = item.targetStatus; if (item.targetTab === 'members') memberRole.value = 'NURSE'; if (item.targetTab === 'quality') qualityStatus.value = 'OPEN'; }
function openAlert(alert: AlertItem) { selectedAlert.value = alert; qualityDialog.value = true; }
async function openCaregiver(user: PlainObject) { const id = user.caregiverProfile?._id; if (!id) { $q.notify({ type: 'warning', message: '這位居服員尚未建立完整專業資料。' }); return; } caregiverDialog.value = true; caregiverLoading.value = true; caregiverTab.value = attentionFilter.value === 'DOCUMENT_ATTENTION' ? 'credentials' : 'basic'; try { Object.assign(caregiverOverview, { caregiver: null, credentials: [], leaves: [], bookings: [], alerts: [], auditLogs: [] }, (await api.get(`/admin/nurses/${id}/overview`)).data); } catch { $q.notify({ type: 'negative', message: '居服員詳細資料暫時無法載入。' }); } finally { caregiverLoading.value = false; } }
function bookingAnomaly(booking: PlainObject) { const now = Date.now(); const elapsed = (value?: string) => value ? now - new Date(value).getTime() : 0; if (booking.status === 'PENDING' && elapsed(booking.createdAt) >= 7200000) return `此任務等待居服員承接已 ${Math.floor(elapsed(booking.createdAt) / 3600000)} 小時 ${Math.floor(elapsed(booking.createdAt) % 3600000 / 60000)} 分鐘`; if (booking.status === 'AWAITING_USER_CONFIRMATION' && elapsed(booking.completionRequestedAt) >= 86400000) return '使用者等待確認完成已超過 24 小時'; if (booking.status === 'DEPARTED' && elapsed(booking.departedAt) >= 7200000) return '居服員出發較久仍未抵達，建議主動確認'; return ''; }

async function handleAlert(alert: AlertItem, action: string, status: string) {
  await api.patch(`/admin/quality-alerts/${alert._id}`, { action, status, adminNote: alert.note });
  $q.notify({ type: 'positive', message: status === 'RESOLVED' ? '品質警訊已完成處理並留下紀錄。' : '管理處置已記錄。' });
  await loadDashboard();
  liveSync.notifyChanged();
}
function openEdit(user: PlainObject) { editingId.value = user._id; Object.assign(editForm, { name: user.name, phone: user.phone || '', email: user.email || '', status: user.status }); editDialog.value = true; }
async function saveUser() { await api.patch(`/admin/users/${editingId.value}`, editForm); editDialog.value = false; $q.notify({ type: 'positive', message: '成員資料已更新。' }); await loadDashboard(); liveSync.notifyChanged(); }
function openCreate() { Object.assign(createForm, { name: '', account: '', password: '', role: 'USER', phone: '', email: '' }); createDialog.value = true; }
async function createUser() {
  creating.value = true;
  try { await api.post('/admin/users', createForm); createDialog.value = false; $q.notify({ type: 'positive', message: '新成員帳號已建立。' }); await loadDashboard(); liveSync.notifyChanged(); }
  catch (error: any) { $q.notify({ type: 'negative', message: error?.response?.data?.message || '請確認必填資料與帳號是否重複。' }); }
  finally { creating.value = false; }
}
function confirmHide(user: PlainObject) {
  $q.dialog({ title: '確認隱藏這筆帳號？', message: `${user.name} 的資料不會真正刪除，日後仍可由稽核紀錄找回。`, cancel: { label: '先保留', flat: true }, ok: { label: '確認隱藏', color: 'negative', unelevated: true }, prompt: { model: '', type: 'text', label: '隱藏原因（選填）' } }).onOk(async (reason) => { await api.delete(`/admin/users/${user._id}`, { data: { reason } }); $q.notify({ type: 'positive', message: '帳號已隱藏，原始關聯資料仍完整保留。' }); await loadDashboard(); });
}

onMounted(async () => {
  await authStore.restoreSession();
  if (authStore.user?.role !== 'ADMIN') { await router.replace('/login'); return; }
  await loadDashboard();
  liveSync.start(loadDashboard);
});
onBeforeUnmount(liveSync.stop);
</script>

<style scoped>
.admin-page { min-height: 100vh; color: #4b3934; background: #fff9f5; font-family: 'jf-openhuninn-2.1', 'Noto Sans TC', sans-serif; }
.admin-shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 42px 0 72px; }
.admin-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; padding: 38px 42px; color: white; background: linear-gradient(125deg, #5f4942, #80665d); border-radius: 28px; box-shadow: 0 20px 50px rgb(78 52 43 / 15%); }
.eyebrow, .section-kicker { margin: 0 0 8px; color: #f5b29f; font-size: .75rem; font-weight: 800; letter-spacing: .16em; }
.admin-hero h1 { margin: 0; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.22; letter-spacing: .04em; }
.admin-hero p:last-child { max-width: 680px; margin: 15px 0 0; color: #f7e9e3; font-size: 1rem; line-height: 1.8; }
.hero-status { min-width: 190px; display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 16px; color: #5b463f; background: #fff9f5; border-radius: 17px; }
.hero-status div { display: grid; flex: 1; }.hero-status strong { font-size: .88rem; }.hero-status small { color: #8b756d; }.live-dot { width: 10px; height: 10px; background: #4f876f; border-radius: 50%; box-shadow: 0 0 0 5px rgb(79 135 111 / 14%); }
.pulse-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 22px 0; }
.pulse-card { min-height: 142px; display: flex; align-items: flex-start; gap: 17px; padding: 24px; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 22px; box-shadow: 0 12px 30px rgb(78 52 43 / 7%); }
.pulse-card > svg { flex: 0 0 auto; box-sizing: content-box; padding: 12px; border-radius: 15px; }.pulse-card div { display: grid; }.pulse-card strong { font-size: 1.8rem; line-height: 1; }.pulse-card span { margin-top: 9px; font-weight: 800; }.pulse-card small { margin-top: 5px; color: #8a756e; }.pulse-card.brown svg { color: #6e5750; background: #eee4df; }.pulse-card.orange svg { color: #b84f16; background: #ffeadf; }.pulse-card.red svg { color: #b13d33; background: #fde5e1; }.pulse-card.green svg { color: #3f725e; background: #e2f0ea; }
.attention-card { margin-bottom: 22px; overflow: hidden; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 22px; box-shadow: 0 12px 34px rgb(78 52 43 / 7%); }.attention-card > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px 14px; }.attention-card h2 { margin: 0; font-size: 1.35rem; }.attention-item { min-height: 72px; padding: 12px 24px; }.attention-item :deep(.q-item__section--side) { color: #755f57; }.attention-item :deep(.q-avatar) { width: 44px; height: 44px; }.attention-high { color: #a7352c; background: #fde5e1; }.attention-medium { color: #a95619; background: #ffeadf; }.attention-low { color: #4a6b5d; background: #e2f0ea; }.attention-clear { display: flex; align-items: center; gap: 12px; padding: 18px 24px 24px; color: #3f725e; }
.admin-tabs { margin-bottom: 16px; color: #6e5750; background: #fffdfb; border: 1px solid rgb(110 87 80 / 11%); border-radius: 18px; }.admin-tabs :deep(.q-tab--active) { color: #b84f16; }.admin-panels { background: transparent; }.admin-panels :deep(.q-tab-panel) { padding: 0; }
.insight-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }.insight-card { min-width: 0; padding: 28px; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 24px; box-shadow: 0 12px 34px rgb(78 52 43 / 7%); }.insight-card header, .recent-reviews header { display: flex; align-items: center; gap: 13px; }.insight-card h2, .quality-heading h2, .table-heading h2, .recent-reviews h2, .edit-dialog h2 { margin: 0; font-size: 1.35rem; }.insight-card .section-kicker, .quality-heading .section-kicker, .table-heading .section-kicker, .recent-reviews .section-kicker, .edit-dialog .section-kicker { color: #b84f16; }.icon-disc { display: grid; place-items: center; width: 48px; height: 48px; color: #b84f16; background: #ffeadf; border-radius: 15px; }.icon-disc.green { color: #3f725e; background: #e2f0ea; }.icon-disc.peach { color: #a84e3e; background: #f7dfd8; }.icon-disc.brown { color: #6e5750; background: #eee4df; }
.overview-grid > .ranking-expansion { grid-column: 1 / -1; }.ranking-expansion { overflow: hidden; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 20px; }.ranking-expansion :deep(.ranking-header) { min-height: 58px; color: #6e5750; font-weight: 800; }.ranking-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; padding: 0 18px 18px; }.ranking-grid .insight-card { box-shadow: none; }
.rating-summary { display: flex; align-items: center; gap: 22px; margin: 28px 0 20px; }.rating-summary > strong { font-size: 4.2rem; line-height: 1; }.rating-summary > div { display: grid; gap: 7px; color: #876f67; }.large-stars { display: flex; gap: 5px; }.large-stars svg { width: 27px; color: #d9c9c3; }.large-stars .filled, .small-stars .filled, .filled-star { color: #d96b27; fill: currentColor; }.rating-bars { display: grid; gap: 9px; }.rating-row { display: grid; grid-template-columns: 45px 1fr 28px; align-items: center; gap: 10px; font-size: .85rem; }.rating-row > div, .demand-list > div > div { height: 9px; overflow: hidden; background: #f0e6e1; border-radius: 99px; }.rating-row i, .demand-list i { height: 100%; display: block; background: #eb9079; border-radius: inherit; }
.performance-list { display: grid; gap: 13px; }.performance-list > div { display: grid; grid-template-columns: 92px 1fr 42px; align-items: center; gap: 12px; color: #755f57; font-size: .86rem; }.performance-list strong { color: #4b3934; text-align: right; }
.demand-list { display: grid; gap: 10px; margin-top: 27px; }.demand-list > div { display: grid; grid-template-columns: minmax(190px, 1fr) 1fr minmax(190px,auto); align-items: center; gap: 12px;padding:8px;border-radius:12px }.demand-list > div.service-alert{background:#eceae8}.demand-list span { display: flex; align-items: center; gap: 9px; }.demand-list b { display: grid; place-items: center; width: 25px; height: 25px; color: #b84f16; background: #ffeadf; border-radius: 9px; }.demand-list i { background: #4f806d; }.demand-list strong { font-size: .8rem; text-align: right; }.empty-copy { margin: 28px 0 0; color: #8a756e; }
.journey-flow { display: grid; grid-template-columns: repeat(5, 1fr); margin: 30px 0 20px; }.journey-flow div { position: relative; display: grid; justify-items: center; gap: 8px; }.journey-flow div:not(:last-child)::after { content: ''; position: absolute; top: 22px; left: 67%; width: 66%; border-top: 2px dashed #e7c6b9; }.journey-flow span { z-index: 1; width: 46px; height: 46px; display: grid; place-items: center; color: white; background: #d96b27; border-radius: 50%; font-weight: 800; }.journey-flow small { color: #79635c; text-align: center; }.soft-note { margin: 0; padding: 14px 16px; color: #755f57; background: #fff3ed; border-radius: 13px; line-height: 1.6; }
.caregiver-list { display: grid; margin-top: 20px; }.caregiver-list > div { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid #eee4df; }.avatar { width: 42px; height: 42px; display: grid; place-items: center; color: white; background: #80665d; border-radius: 14px; font-weight: 800; }.caregiver-list div div:nth-child(2) { display: grid; }.caregiver-list span { color: #8a756e; font-size: .8rem; }.caregiver-list small { display: flex; align-items: center; gap: 4px; font-weight: 800; }
.quality-heading, .table-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 18px; padding: 28px 30px; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 22px; }.quality-heading p:last-child { margin: 8px 0 0; color: #826d65; }.quality-count { display: grid; grid-template-columns: auto auto; align-items: center; gap: 5px 10px; min-width: 135px; padding: 16px; color: #a7352c; background: #fde9e5; border-radius: 17px; }.quality-count svg { grid-row: span 2; }.quality-count strong { font-size: 1.5rem; }.quality-count span { font-size: .8rem; }
.alert-list { display: grid; gap: 15px; }.alert-card { display: flex; gap: 20px; padding: 24px; background: #fffdfb; border: 1px solid rgb(177 61 51 / 24%); border-left: 6px solid #b13d33; border-radius: 22px; box-shadow: 0 12px 34px rgb(78 52 43 / 7%); }.alert-icon { flex: 0 0 auto; width: 62px; height: 62px; display: grid; place-items: center; color: #b13d33; background: #fde5e1; border-radius: 19px; }.alert-body { flex: 1; min-width: 0; }.alert-title { display: flex; justify-content: space-between; gap: 12px; }.alert-title span { color: #b13d33; font-size: .78rem; font-weight: 800; }.alert-title h3 { margin: 5px 0 0; font-size: 1.25rem; }.alert-body > p { color: #765f58; }.review-quotes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.review-quotes blockquote { margin: 0; padding: 12px; color: #755f57; background: #fff4ef; border-radius: 12px; line-height: 1.6; }.note-input { margin-top: 14px; }.alert-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 13px; }.resolve-button { color: white; background: #b84f16; border-radius: 11px; }.all-clear { display: grid; justify-items: center; padding: 55px 20px; color: #3f725e; background: #f1f8f4; border-radius: 22px; }.all-clear h3 { margin: 13px 0 5px; }.all-clear p { margin: 0; }
.recent-reviews { margin-top: 20px; padding: 28px; background: #fffdfb; border-radius: 22px; }.review-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; margin-top: 20px; }.review-grid article { padding: 17px; background: #fff7f2; border-radius: 15px; }.small-stars { display: flex; gap: 2px; }.small-stars svg { width: 17px; color: #d9c9c3; }.review-grid p { min-height: 52px; line-height: 1.6; }.review-grid small { color: #88736b; }
.member-tools { display: flex; align-items: center; gap: 10px; }.member-tools :deep(.q-field) { width: min(340px, 100%); }.booking-tools{display:grid;grid-template-columns:minmax(260px,1fr) 170px 190px;gap:10px;flex:1;max-width:760px}.booking-tools :deep(.q-field__control){min-height:48px;border-radius:14px}.member-table { overflow: hidden; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 22px; }.member-row { display: grid; grid-template-columns: 1.2fr .7fr 1.2fr .65fr .55fr; align-items: center; gap: 14px; min-height: 72px; padding: 12px 20px; border-bottom: 1px solid #eee4df; }.member-row:last-child { border: 0; }.table-label { min-height: 48px; color: #8a756e; background: #f8efea; font-size: .82rem; font-weight: 800; }.member-name { display: grid; grid-template-columns: 40px 1fr; align-items: center; }.member-name i { grid-row: span 2; width: 38px; height: 38px; display: grid; place-items: center; color: white; background: #80665d; border-radius: 13px; font-style: normal; }.member-name small, .contact small { color: #907a72; }.contact { display: grid; }.row-actions { display: flex; }.booking-list { display: grid; gap: 12px; }.booking-list article { display: grid; grid-template-columns: 50px 1fr auto auto; align-items: center; gap: 16px; padding: 19px; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 18px; cursor:pointer;transition:.2s ease; }.booking-list article:hover,.booking-list article:focus-visible{border-color:#dc8d6f;box-shadow:0 10px 28px rgb(90 58 47 / 10%);outline:none;transform:translateY(-1px)}.booking-icon { width: 48px; height: 48px; display: grid; place-items: center; color: #b84f16; background: #ffeadf; border-radius: 15px; }.booking-list article > div:nth-child(2) { display: grid; }.booking-list span, .booking-list small { color: #826d65; }.booking-list time { color: #715b54; font-weight: 700; }.booking-empty{padding:32px;text-align:center;color:#826d65;background:#fffdfb;border:1px dashed #ddc9c0;border-radius:18px}.edit-dialog { width: min(520px, calc(100vw - 32px)); padding: 10px; color: #4b3934; background: #fffdfb; border-radius: 23px; }.booking-detail-dialog{width:min(940px,calc(100vw - 32px));max-width:min(940px,calc(100vw - 32px))!important;max-height:90vh;overflow:auto;color:#4b3934;background:#fffdfb;border-radius:26px}.booking-detail-heading{display:flex;align-items:center;justify-content:space-between;padding:26px 30px 14px}.booking-detail-heading h2{margin:4px 0 0;font-size:1.8rem}.booking-detail-body{padding:10px 30px 24px}.booking-detail-body :deep(.q-img){max-height:260px;margin-bottom:18px;border-radius:20px}.booking-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.booking-detail-grid>div{display:flex;flex-direction:column;gap:5px;padding:15px 17px;background:#fff4ee;border-radius:16px}.booking-detail-grid span,.booking-progress span{color:#8a7067;font-size:.86rem}.booking-detail-grid strong{font-size:1rem;line-height:1.5}.booking-detail-grid .wide{grid-column:1/-1}.booking-progress{margin-top:22px;padding:20px;border:1px solid #eadbd4;background:#fffaf7;border-radius:20px}.booking-progress>header{display:flex;align-items:center;justify-content:space-between;gap:16px}.booking-progress h3{margin:4px 0 0;font-size:1.1rem}.booking-progress :deep(.q-stepper){margin-top:14px;background:transparent;box-shadow:none}.booking-progress :deep(.q-stepper__content){display:none}.booking-progress__warning{margin:10px 0;color:#9c3f35;background:#fce5e1}.booking-progress-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,.72fr);gap:18px;padding-top:12px;border-top:1px solid #eadbd4}.booking-progress-grid>div>h3{margin-bottom:12px}.booking-progress :deep(.q-timeline__title){font-size:.98rem}.booking-progress :deep(.q-timeline__subtitle){color:#8a7067}.booking-location{align-self:start;display:grid;grid-template-columns:auto 1fr;gap:10px;padding:18px;color:#4a6b5d;background:#eef7f2;border-radius:17px}.booking-location div{display:grid;gap:4px}.booking-location a,.booking-location small{grid-column:1/-1;color:#4a6b5d}.booking-location a{font-weight:800;text-decoration:underline;text-underline-offset:3px}
.detail-tabs { margin-bottom: 16px; color: #6e5750; border-bottom: 1px solid #eadbd4; }.detail-tabs :deep(.q-tab--active) { color: #b84f16; }.detail-panels { background: transparent; }.detail-panels :deep(.q-tab-panel) { padding: 8px 0; }
.filter-toggle { max-width: 100%; margin: 0 0 18px; border: 1px solid #eadbd4; border-radius: 14px; overflow-x: auto; }
.quality-inbox { overflow: hidden; margin-bottom: 28px; background: #fffdfb; border: 1px solid rgb(110 87 80 / 12%); border-radius: 20px; box-shadow: 0 10px 28px rgb(78 52 43 / 6%); }
.quality-inbox .q-item { min-height: 76px; padding: 13px 20px; }
.quality-inbox small { margin-top: 6px; color: #8a7067; }
.member-row.clickable { cursor: pointer; transition: background-color .2s ease; }
.member-row.clickable:hover, .member-row.clickable:focus-within { background: #fff4ee; }
@media (max-width: 900px) { .pulse-grid, .insight-grid, .ranking-grid { grid-template-columns: repeat(2, 1fr); }.review-grid { grid-template-columns: 1fr 1fr; }.member-row { grid-template-columns: 1.1fr .7fr 1fr .5fr; }.member-row > :nth-child(3), .table-label > :nth-child(3) { display: none; } }
@media (max-width: 650px) { .admin-shell { width: min(100% - 20px, 1180px); padding-top: 20px; }.admin-hero { align-items: flex-start; flex-direction: column; padding: 28px 23px; border-radius: 22px; }.hero-status { width: 100%; }.pulse-grid { grid-template-columns: repeat(2, 1fr); }.insight-grid, .ranking-grid, .review-grid { grid-template-columns: 1fr; }.pulse-card { min-height: 132px; padding: 18px 14px; flex-direction: column; gap: 12px; }.pulse-card > svg { padding: 9px; }.pulse-card strong { font-size: 1.55rem; }.attention-card > header { align-items: flex-start; padding: 20px 18px 10px; }.attention-item { padding: 12px 14px; }.attention-item :deep(.q-item__section--side:last-child) { display: none; }.admin-tabs { position: sticky; top: 68px; z-index: 5; }.insight-card { padding: 22px 18px; }.rating-summary { gap: 14px; }.rating-summary > strong { font-size: 3.3rem; }.performance-list > div { grid-template-columns: 82px 1fr 38px; gap: 8px; }.demand-list > div { grid-template-columns: 1fr auto; }.demand-list strong{text-align:left}.journey-flow { grid-template-columns: repeat(5, minmax(62px, 1fr)); overflow-x: auto; padding-bottom: 8px; }.quality-heading, .table-heading, .member-tools { align-items: stretch; flex-direction: column; padding: 22px; }.booking-tools{grid-template-columns:1fr;max-width:none}.quality-count { width: 100%; }.alert-card { flex-direction: column; padding: 20px 16px; }.alert-title { flex-direction: column; }.review-quotes { grid-template-columns: 1fr; }.member-table { overflow-x: auto; }.member-row { min-width: 650px; }.booking-list article { grid-template-columns: 48px 1fr; }.booking-list time, .booking-list .q-badge { justify-self: start; grid-column: 2; }.booking-detail-heading,.booking-detail-body{padding-left:18px;padding-right:18px}.booking-detail-grid,.booking-progress-grid{grid-template-columns:1fr}.booking-detail-grid .wide{grid-column:auto}.booking-progress{padding:15px}.booking-progress :deep(.q-stepper__tab){min-width:92px;padding:12px 4px}.booking-progress :deep(.q-stepper__header){overflow-x:auto;flex-wrap:nowrap}.booking-progress :deep(.q-stepper__label){font-size:.72rem} }
</style>
