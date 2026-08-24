<template>
  <q-page class="member-page">
    <main class="member-shell">
      <section v-if="!authStore.user" class="login-state" aria-labelledby="login-state-title">
        <div class="login-state__icon"><UserRoundCheck :size="48" /></div>
        <span>安心會員中心</span>
        <h1 id="login-state-title">登入後，就能查看照護安排</h1>
        <p>預約進度、家人資料和通知，都會整理在這裡。</p>
        <router-link to="/login">安心登入 <ArrowRight :size="21" /></router-link>
      </section>

      <template v-else>
        <section class="member-hero" aria-labelledby="member-title">
          <div class="member-profile">
<q-avatar size="76px" class="member-avatar">
              <BoringAvatar
                name="Maya"
                :size="76"
                :colors="['#de4c45', '#d9764d', '#cc9e8a', '#c1c5c7', '#ebdfc6']"
                variant="beam"
              />
            </q-avatar>
            <div>
              <span class="member-kicker">MY CARE HOME</span>
              <h1 id="member-title">{{ greeting }}，{{ authStore.user.name }}</h1>
              <p>{{ roleLabel }}・帳號 {{ authStore.user.account }}</p>
            </div>
          </div>
          <div class="member-status">
            <span><ShieldCheck :size="20" /> 帳號安全使用中</span>
            <router-link to="/caregivers">找居服員 <Search :size="19" /></router-link>
          </div>
        </section>

        <section class="overview-grid" aria-label="我的照護摘要">
          <article class="overview-card next-care" role="link" tabindex="0" aria-label="查看預約與照護進度" @click="openNextCare" @keydown.enter="openNextCare" @keydown.space.prevent="openNextCare">
            <div class="overview-card__icon"><CalendarHeart :size="30" /></div>
            <div v-if="nextBooking"><span :class="{ 'booking-confirmed': nextBooking.status === 'ACCEPTED' }">下一次服務・{{ bookingStatusLabel(nextBooking.status) }}</span><strong>{{ formatBookingDate(nextBooking.scheduledStartAt) }}</strong><small>{{ bookingCaregiverName(nextBooking) }}・{{ nextBooking.serviceTypeIds?.map(item => item.name).join('、') || '照護服務' }}</small></div>
            <div v-else><span>下一次服務</span><strong>找到適合的照護夥伴</strong><small>從認證居服員中安心挑選</small></div>
            <span class="overview-card__arrow" aria-hidden="true"><ChevronRight :size="24" /></span>
          </article>
          <article v-if="!recipients.length" class="overview-card family-care" role="link" tabindex="0" aria-label="建立受照護者資料" @click="router.push('/users/recipients/new')" @keydown.enter="router.push('/users/recipients/new')" @keydown.space.prevent="router.push('/users/recipients/new')">
            <div class="overview-card__icon"><UsersRound :size="30" /></div>
            <div><span>受照護者資料</span><strong>尚未建立資料</strong><small>可新增自己或家人的照護資訊</small></div>
            <span class="overview-card__arrow" aria-hidden="true"><ChevronRight :size="24" /></span>
          </article>
          <article v-else class="overview-card family-care overview-card--selector">
            <div class="overview-card__icon"><UsersRound :size="30" /></div>
            <div class="recipient-summary">
              <span>受照護者資料・共 {{ recipients.length }} 位</span>
              <q-select v-model="overviewRecipientId" :options="recipientOptions" emit-value map-options borderless behavior="menu" aria-label="選擇受照護者" @update:model-value="selectOverviewRecipient">
                <template #append><ChevronDown :size="21" /></template>
              </q-select>
              <small>選擇後，下方檔案會切換為這位受照護者</small>
            </div>
            <button class="overview-add" type="button" aria-label="新增受照護者" @click="router.push('/users/recipients/new')"><UserPlus :size="21" /></button>
          </article>
          <article class="overview-card allowance-care" role="button" tabindex="0" aria-label="了解長照額度功能" @click="openFeature('長照額度')" @keydown.enter="openFeature('長照額度')" @keydown.space.prevent="openFeature('長照額度')">
            <div class="overview-card__icon"><HandCoins :size="30" /></div>
            <div><span>長照額度</span><strong>等待資料串接</strong><small>未來將顯示核定額度與使用明細</small></div>
            <span class="overview-card__arrow" aria-hidden="true"><ChevronRight :size="24" /></span>
          </article>
        </section>

        <section class="features-section" aria-labelledby="feature-title">
          <div class="section-heading">
            <div><span>常用功能</span><h2 id="feature-title">照護大小事，一次整理好</h2></div>
            <p>大卡片、大文字，找功能更輕鬆。</p>
          </div>

          <div class="feature-grid">
            <article v-for="feature in features" :key="feature.title" class="feature-card">
              <header :class="feature.tone">
                <component :is="feature.icon" :size="29" />
                <div class="feature-title"><h3>{{ feature.title }}</h3><small v-if="feature.title === '受照護者檔案' && selectedOverviewRecipient">目前：{{ selectedOverviewRecipient.name }}</small></div>
                <q-badge v-if="feature.badge" rounded :label="feature.title === '預約與照護進度' ? `${activeBookings.length} 筆進行中` : feature.title === '訊息與通知' ? `${totalUnreadCount} 則未讀` : feature.badge" class="feature-badge" />
              </header>
              <q-list separator class="feature-list">
                <q-item
                  v-for="item in feature.items"
                  :key="item.label"
                  clickable
                  v-ripple
                  :to="item.to"
                  @click="item.to ? undefined : handleFeatureItem(item.label)"
                >
                  <q-item-section avatar><component :is="item.icon" :size="22" /></q-item-section>
                  <q-item-section>
                    <q-item-label>{{ item.label }}</q-item-label>
                    <q-item-label v-if="item.caption && item.label !== '查看預約及照護進度'" caption>{{ item.caption }}</q-item-label>
                  </q-item-section>
                  <q-item-section side class="feature-item-side"><q-badge v-if="item.label === '居服員出發與打卡通知' && careUnreadCount" rounded :label="careUnreadCount" /><ChevronRight :size="20" /></q-item-section>
                </q-item>
              </q-list>
            </article>
          </div>
        </section>

        <section class="support-banner" aria-label="需要協助">
          <div class="support-banner__icon"><MessageCircleHeart :size="38" /></div>
          <div><span>找不到功能嗎？</span><h2>別擔心，我們會陪您慢慢完成</h2></div>
          <button type="button" @click="handleFeatureItem('LINE 專人服務')">請專人協助</button>
        </section>
      </template>
    </main>

    <q-dialog v-model="featureDialog">
      <q-card :class="selectedFeature === '長照額度' ? 'calculator-dialog' : 'feature-dialog'">
        <template v-if="selectedFeature === '長照額度'">
          <q-card-section class="calculator-dialog__heading">
            <div><small>長照額度與費用</small><h2>長照補助簡易試算</h2></div>
            <button type="button" aria-label="關閉長照補助試算" v-close-popup><X :size="24" /></button>
          </q-card-section>
          <q-card-section><CareCostCalculator /></q-card-section>
          <q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="安心看完了" v-close-popup /></q-card-actions>
        </template>
        <template v-else>
          <q-card-section class="feature-dialog__heading">
            <span><Sparkles :size="28" /></span>
            <div><small>功能規劃中</small><h2>{{ selectedFeature }}</h2></div>
          </q-card-section>
          <q-card-section>
            <p>這個入口與版面已經準備完成，之後接上預約、補助或通知 API 就能顯示真實資料。</p>
          </q-card-section>
          <q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="我知道了" v-close-popup /></q-card-actions>
        </template>
      </q-card>
    </q-dialog>

    <q-dialog v-model="longTermCareDialog">
      <q-card class="long-term-care-dialog">
        <q-card-section class="detail-dialog__heading long-term-care-heading">
          <div><small>長照政策與申請資訊</small><h2>政府長照服務申請說明</h2></div>
          <button class="detail-dialog__close" type="button" aria-label="關閉長照服務申請說明" v-close-popup><X :size="24" /></button>
        </q-card-section>

        <q-card-section class="long-term-care-body">
          <p class="long-term-care-lead">家中有長期照顧需求，可先透過官方管道提出申請。經各縣市長期照顧管理中心評估後，再依個別需求擬定照顧計畫與連結服務。</p>

          <section aria-labelledby="care-application-steps">
            <h3 id="care-application-steps">四個申請步驟</h3>
            <ol class="long-term-care-steps">
              <li><span>1</span><div><strong>提出申請</strong><small>撥打 1966、聯絡地方照管中心、線上申請，或由住院的出院準備團隊協助。</small></div></li>
              <li><span>2</span><div><strong>專業評估</strong><small>由照管專員了解生活功能與照顧需求，確認長照需要等級及給付額度。</small></div></li>
              <li><span>3</span><div><strong>擬定照顧計畫</strong><small>符合資格後，與個案管理員討論服務項目與實際安排。</small></div></li>
              <li><span>4</span><div><strong>接受長照服務</strong><small>依核定的照顧計畫，由長照特約單位提供服務。</small></div></li>
            </ol>
          </section>

          <q-expansion-item class="long-term-care-expansion" icon="person_search" label="誰可以申請？" header-class="long-term-care-expansion__header">
            <div>主要由各縣市照管中心評估長期照顧需求。是否符合資格、可使用的服務與額度，均以現行規定及實際評估為準。</div>
          </q-expansion-item>
          <q-expansion-item class="long-term-care-expansion" icon="medical_services" label="可能有哪些服務？" header-class="long-term-care-expansion__header">
            <div>依個別評估與照顧計畫，可能包含照顧及專業服務、交通接送、輔具與居家無障礙環境改善，以及喘息服務。</div>
          </q-expansion-item>

          <div class="long-term-care-notice" role="note">
            <ShieldCheck :size="23" />
            <p><strong>平台服務說明</strong>本平台提供照顧資訊及自費照顧服務預約，並非政府長期照顧管理中心。平台預約不等同申請政府長照服務或取得給付資格；資格、額度、部分負擔與服務安排，以主管機關最新公告及評估為準。</p>
          </div>
        </q-card-section>

        <q-card-actions class="long-term-care-actions">
          <a class="care-action care-action--phone" href="tel:1966"><PhoneCall :size="20" />撥打 1966</a>
          <a class="care-action care-action--official" href="https://1966.gov.tw/LTC/cp-6533-70777-207.html" target="_blank" rel="noopener noreferrer">前往官方申請說明 <ArrowRight :size="20" />
          </a>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="faqDialog">
      <q-card class="care-faq-dialog">
        <q-card-section class="detail-dialog__heading care-faq-heading">
          <div><small>先找到方向，再看細節</small><h2>長照常見問題</h2></div>
          <button class="detail-dialog__close" type="button" aria-label="關閉長照常見問題" v-close-popup><X :size="24" /></button>
        </q-card-section>

        <q-card-section class="care-faq-body">
          <section class="care-faq-intro" aria-labelledby="faq-intro-title">
            <span><MessageCircleHeart :size="27" /></span>
            <div><h3 id="faq-intro-title">先分清楚兩種服務</h3><p>政府長照要申請與評估；照安心是自費預約平台，兩者不是同一套服務。</p></div>
          </section>

          <div class="care-faq-compare" aria-label="政府長照與照安心自費服務比較">
            <article><span>政府長照</span><strong>先申請、再評估</strong><small>依核定照顧計畫，由長照特約單位提供服務。</small></article>
            <article><span>照安心自費服務</span><strong>依平台方式預約</strong><small>費用由使用者負擔，不能扣抵政府長照給付。</small></article>
          </div>

          <section aria-labelledby="care-faq-list-title">
            <div class="care-faq-section-title"><h3 id="care-faq-list-title">家屬最常問的 8 件事</h3><small>點問題看簡短回答</small></div>
            <q-expansion-item
              v-for="(faq, index) in careFaqs"
              :key="faq.question"
              :default-opened="index === 0"
              class="care-faq-item"
              expand-separator
              header-class="care-faq-item__header"
            >
              <template #header>
                <q-item-section avatar><span class="care-faq-number">{{ index + 1 }}</span></q-item-section>
                <q-item-section><q-item-label>{{ faq.question }}</q-item-label></q-item-section>
              </template>
              <div class="care-faq-answer">
                <p><strong>{{ faq.shortAnswer }}</strong>{{ faq.answer }}</p>
                <a v-if="faq.source" :href="faq.source" target="_blank" rel="noopener noreferrer">查看衛福部說明 <ArrowRight :size="17" /></a>
              </div>
            </q-expansion-item>
          </section>

          <div class="care-faq-notice" role="note"><ShieldCheck :size="22" /><p>本頁只提供資訊導引，不做資格或補助判定。資格、額度與服務安排，以主管機關最新規定及照管專員評估為準。</p></div>
        </q-card-section>

        <q-card-actions class="care-faq-actions">
          <a href="tel:1966"><PhoneCall :size="20" /><span><small>政府長照申請</small><strong>撥打 1966</strong></span></a>
          <router-link to="/caregivers" @click="faqDialog = false"><Search :size="20" /><span><small>需要自費照顧</small><strong>查看居服員</strong></span></router-link>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="bookingDialog">
      <q-card class="booking-list-dialog">
        <q-card-section class="detail-dialog__heading"><div><small>預約與照護進度</small><h2>我的安心服務安排</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉預約清單" v-close-popup><X :size="24" /></button></q-card-section>
        <q-card-section v-if="bookingLoading" class="booking-skeleton"><q-skeleton v-for="item in 3" :key="item" type="rect" height="112px" /></q-card-section>
        <q-card-section v-if="!bookingLoading && bookings.length" class="booking-filters">
          <q-input v-model="bookingSearch" outlined dense clearable label="搜尋日期、時段、居服員或受照護者"><template #prepend><Search :size="19" /></template></q-input>
          <q-select v-model="bookingStatusFilter" :options="bookingStatusOptions" outlined dense emit-value map-options label="任務狀態" />
        </q-card-section>
        <q-list v-if="!bookingLoading && visibleBookings.length" separator class="booking-list">
          <q-item v-for="booking in visibleBookings" :key="booking._id" class="booking-list__item">
            <q-item-section avatar><span class="booking-date"><strong>{{ bookingDay(booking) }}</strong><small>{{ bookingMonth(booking) }} 月</small></span></q-item-section>
            <q-item-section>
              <q-item-label class="booking-list__title">{{ formatBookingDate(booking.scheduledStartAt) }}</q-item-label>
              <q-item-label caption>受照護者：{{ booking.recipientId?.name || '申請人本人' }}</q-item-label>
              <q-item-label caption>居服員：{{ bookingCaregiverName(booking) }}・{{ booking.serviceTypeIds?.map(item => item.name).join('、') || '照護服務' }}</q-item-label>
            </q-item-section>
            <q-item-section side class="booking-list__side">
              <q-badge rounded :class="bookingStatusTone(bookingDisplayStatus(booking))" :label="bookingStatusLabel(bookingDisplayStatus(booking))" />
              <q-btn v-if="booking.status === 'AWAITING_USER_CONFIRMATION'" unelevated no-caps class="completion-confirm" label="確認完成服務" @click.stop="openCompletionConfirm(booking)" />
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-if="!bookingLoading && !visibleBookings.length" class="booking-empty"><CalendarHeart :size="38" /><h3>{{ bookings.length ? '沒有符合條件的安排' : '目前沒有預約紀錄' }}</h3><p>{{ bookings.length ? '換一個搜尋條件，再找找看。' : '找到合適的照護夥伴後，安排會顯示在這裡。' }}</p></q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="安心看完了" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="careComboDialog">
      <q-card class="care-combo-dialog">
        <q-card-section class="detail-dialog__heading care-combo-heading">
          <div><small>常用與偏好</small><h2>常用照顧組合</h2><p>從已完成的服務快速再次預約熟悉的照護夥伴。</p></div>
          <button class="detail-dialog__close" type="button" aria-label="關閉常用照顧組合" v-close-popup><X :size="24" /></button>
        </q-card-section>
        <q-card-section v-if="careComboLoading" class="care-combo-loading"><q-skeleton v-for="item in 3" :key="item" type="rect" height="250px" /></q-card-section>
        <q-card-section v-else-if="careCombos.length" class="care-combo-body">
          <article v-for="combo in careCombos" :key="combo.key" class="care-combo-card">
            <header class="care-combo-profile">
              <q-avatar size="64px" class="care-combo-avatar"><img v-if="combo.photo" :src="assetUrl(combo.photo)" :alt="`${combo.caregiverName}的照片`" @error="combo.photo = undefined"><UserRound v-else :size="30" /></q-avatar>
              <div><strong>{{ combo.caregiverName }}</strong><span class="care-combo-rating" :aria-label="`平均評分 ${combo.ratingAverage.toFixed(1)} 顆星`"><Star :size="17" fill="currentColor" /> {{ combo.ratingAverage.toFixed(1) }} <small>・{{ combo.ratingCount }} 則評分</small></span></div>
              <q-badge rounded :label="`已服務 ${combo.completedCount} 次`" />
            </header>
            <div class="care-combo-facts"><div><span>受照護者</span><strong>{{ combo.recipientName }}</strong></div><div><span>最近完成</span><strong>{{ formatBookingDate(combo.lastCompletedAt) }}</strong></div></div>
            <div class="care-combo-services"><span>這組照顧服務</span><div><q-chip v-for="service in combo.services" :key="service._id" dense>{{ service.name }}</q-chip></div></div>
            <div class="care-combo-slots">
              <div class="care-combo-slots__title"><span>下次可預約時間</span><q-btn flat dense no-caps label="重新查詢" :loading="combo.slotLoading" @click="loadComboSlots(combo)" /></div>
              <div v-if="combo.slots.length" class="care-combo-slot-list"><button v-for="slot in combo.slots.slice(0, 6)" :key="slot._id" type="button" :class="{ selected: combo.selectedSlotId === slot._id }" @click="combo.selectedSlotId = slot._id"><CalendarClock :size="17" /><span>{{ formatComboSlot(slot) }}</span></button></div>
              <p v-else-if="combo.slotLoaded && !combo.slotLoading">未來 14 天尚無可預約時段。</p>
            </div>
            <footer class="care-combo-actions"><q-btn flat no-caps label="服務紀錄" @click="openComboHistory(combo)" /><q-btn outline no-caps label="查看預約進度" @click="openProgressFromCombo" /><q-btn unelevated no-caps label="再次預約" :disable="!combo.selectedSlotId" :loading="combo.booking" @click="bookCareCombo(combo)" /></footer>
          </article>
        </q-card-section>
        <q-card-section v-else class="booking-empty"><CalendarHeart :size="38" /><h3>尚無常用照顧組合</h3><p>完成第一次服務後，熟悉的居服員與服務項目會顯示在這裡。</p></q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="關閉" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="comboHistoryDialog">
      <q-card class="booking-list-dialog"><q-card-section class="detail-dialog__heading"><div><small>歷史服務紀錄</small><h2>{{ selectedCombo?.caregiverName }} ・ {{ selectedCombo?.recipientName }}</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉服務紀錄" v-close-popup><X :size="24" /></button></q-card-section><q-list separator class="booking-list"><q-item v-for="booking in selectedCombo?.bookings || []" :key="booking._id" class="booking-list__item"><q-item-section avatar><span class="booking-date"><strong>{{ bookingDay(booking) }}</strong><small>{{ bookingMonth(booking) }} 月</small></span></q-item-section><q-item-section><q-item-label class="booking-list__title">{{ formatBookingDate(booking.scheduledStartAt) }}</q-item-label><q-item-label caption>{{ serviceNames(booking) }}</q-item-label></q-item-section><q-item-section side><q-badge rounded class="status-success" label="已完成" /></q-item-section></q-item></q-list></q-card>
    </q-dialog>

    <q-dialog v-model="bookingProgressDialog">
      <q-card class="booking-progress-dialog">
        <q-card-section class="detail-dialog__heading">
          <div><small>預約服務進度</small><h2>{{ selectedProgressBooking ? bookingProgressCopy(selectedProgressBooking).title : '居服員出發與打卡通知' }}</h2></div>
          <button class="detail-dialog__close" type="button" aria-label="關閉預約進度" v-close-popup><X :size="24" /></button>
        </q-card-section>
        <template v-if="selectedProgressBooking">
          <q-tabs v-model="progressTab" dense align="justify" no-caps narrow-indicator class="booking-progress-tabs">
            <q-tab name="progress" label="目前進度" />
            <q-tab name="notifications"><span>通知 <q-badge v-if="careNotifications.length" rounded :label="careNotifications.length" /></span></q-tab>
            <q-tab name="service" label="服務資訊" />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="progressTab" animated swipeable class="booking-progress-panels">
            <q-tab-panel name="progress">
              <div class="booking-current-status" aria-live="polite">
                <span><MapPinned :size="23" /></span>
                <div><strong>{{ bookingProgressCopy(selectedProgressBooking).title }}</strong><p>{{ bookingProgressCopy(selectedProgressBooking).description }}</p></div>
                <q-badge rounded :class="bookingStatusTone(bookingDisplayStatus(selectedProgressBooking))" :label="bookingStatusLabel(bookingDisplayStatus(selectedProgressBooking))" />
              </div>
              <q-expansion-item class="progress-expansion" expand-separator label="查看完整任務歷程" caption="預約、承接、出發與抵達紀錄">
                <q-card flat><q-card-section>
                  <q-timeline color="deep-orange-7" layout="dense">
                    <q-timeline-entry v-for="(event, index) in bookingTimeline(selectedProgressBooking)" :key="`${event.label}-${event.at}`" :title="event.label" :subtitle="formatProgressDate(event.at)" :color="event.danger ? 'negative' : 'deep-orange-7'" :icon="event.danger ? 'close' : 'check'">
                      <span v-if="index === bookingTimeline(selectedProgressBooking).length - 1" class="current-progress-label">目前進度</span>
                    </q-timeline-entry>
                  </q-timeline>
                </q-card-section></q-card>
              </q-expansion-item>
            </q-tab-panel>
            <q-tab-panel name="notifications">
              <div class="care-notifications__heading"><div><h3>最新照護動態</h3><p>開啟後已全部標記為已讀</p></div><q-badge rounded :label="`${careNotifications.length} 則`" /></div>
              <q-list v-if="careNotifications.length" separator bordered class="care-notification-list">
                <q-item v-for="notification in careNotifications" :key="notification._id" clickable v-ripple :class="{ unread: notification.status !== 'READ' }" @click="selectNotificationBooking(notification)">
                  <q-item-section avatar><span class="care-notification-icon"><BellRing :size="19" /></span></q-item-section>
                  <q-item-section><q-item-label>{{ notification.title }}</q-item-label><q-item-label caption lines="2">{{ notification.message }}</q-item-label><q-item-label caption>{{ formatProgressDate(notification.createdAt) }}</q-item-label></q-item-section>
                  <q-item-section side><q-badge v-if="notification.status !== 'READ'" rounded label="新" /><ChevronRight :size="19" /></q-item-section>
                </q-item>
              </q-list>
              <div v-else class="booking-empty"><BellRing :size="38" /><h3>目前沒有通知</h3><p>新的照護動態會顯示在這裡。</p></div>
            </q-tab-panel>
            <q-tab-panel name="service">
              <div class="service-address"><span><MapPinned :size="22" /></span><div><small>服務地點</small><strong>{{ selectedProgressBooking.serviceAddress?.text || '尚未提供服務地址' }}</strong></div></div>
              <q-expansion-item v-if="selectedProgressBooking.serviceAddress?.text" class="progress-expansion" expand-separator label="查看服務地點地圖" caption="展開 Google 地圖">
                <div class="map-panel"><iframe :src="bookingMapEmbedUrl(selectedProgressBooking)" :title="`${selectedProgressBooking.serviceAddress.text}服務地點地圖`" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><a :href="bookingMapSearchUrl(selectedProgressBooking)" target="_blank" rel="noopener noreferrer"><MapPinned :size="19" /> 在地圖中確認位置</a></div>
              </q-expansion-item>
            </q-tab-panel>
          </q-tab-panels>
        </template>
        <q-card-section v-else class="booking-empty"><BellRing :size="38" /><h3>目前沒有預約進度</h3><p>居服員出發或打卡後，會在這裡顯示最新歷程。</p></q-card-section>
        <q-separator /><q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="關閉" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="completionDialog" persistent>
      <q-card class="booking-list-dialog completion-dialog">
        <q-card-section class="detail-dialog__heading"><div><small>雙方完成確認</small><h2>確認這次照護已完成</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉完成確認" @click="completionDialog=false"><X :size="24" /></button></q-card-section>
        <q-card-section v-if="completionBooking" class="journal-fixed">
          <div><span>預約編號</span><strong>{{ completionBooking.bookingNumber || completionBooking._id }}</strong></div>
          <div><span>預約時段</span><strong>{{ formatBookingRange(completionBooking) }}</strong></div>
          <div><span>受照護者</span><strong>{{ completionBooking.recipientId?.name || '申請人本人' }}</strong></div>
          <div><span>執行居服員</span><strong>{{ bookingCaregiverName(completionBooking) }}</strong></div>
          <div class="wide"><span>服務內容</span><strong>{{ serviceNames(completionBooking) }}</strong></div>
        </q-card-section>
        <q-card-section class="refund-note"><ShieldCheck :size="20" /><span>請確認服務確實完成；送出後系統才會正式結案。</span></q-card-section>
        <q-card-actions class="cancel-actions"><q-btn flat no-caps label="再確認一下" @click="completionDialog=false" /><q-btn unelevated no-caps :loading="completionSubmitting" class="completion-confirm" label="確認完成服務" @click="confirmCompletion" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="journalDialog" persistent>
      <q-card class="journal-dialog">
        <q-card-section class="detail-dialog__heading"><div><small>歷史照護日誌</small><h2>留下這次安心照護紀錄</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉照護日誌" @click="journalDialog=false"><X :size="24" /></button></q-card-section>
        <q-card-section class="journal-body">
          <q-select v-model="journalBookingId" :options="journalBookingOptions" outlined emit-value map-options label="選擇已完成的服務（必填）" />
          <div v-if="!journalBookingOptions.length" class="journal-locked"><ShieldCheck :size="22" /><span>服務完成後，才會開放日誌與評價，避免尚未服務就誤留紀錄。</span></div>
          <div v-if="selectedJournalBooking" class="journal-fixed">
            <div><span>申請服務項目</span><strong>{{ serviceNames(selectedJournalBooking) }}</strong></div>
            <div><span>受照顧者</span><strong>{{ selectedJournalBooking.recipientId?.name || '申請人本人' }}</strong></div>
            <div><span>預約時段</span><strong>{{ formatBookingRange(selectedJournalBooking) }}</strong></div>
            <div><span>服務地點</span><strong>{{ selectedJournalBooking.serviceAddress?.text || '未提供' }}</strong></div>
            <div><span>執行居服員</span><strong>{{ bookingCaregiverName(selectedJournalBooking) }}</strong></div>
          </div>
          <q-input v-model="journalContent" outlined type="textarea" autogrow maxlength="1000" counter label="日誌內容（必填）" />
          <div class="journal-status">
            <span>當次照護狀況（單選）</span>
            <q-option-group v-model="journalStatus" :options="journalTagOptions" type="radio" inline color="deep-orange" />
          </div>
          <q-file v-model="journalPhotos" outlined multiple append max-files="5" max-file-size="5242880" accept=".jpg,.jpeg,.png,.webp" label="服務照片（最多 5 張、單張 5 MB）"><template #prepend><FileDown :size="20" /></template></q-file>
          <div class="journal-rating"><span>這次服務滿意度（必填）</span><div class="journal-stars" role="radiogroup" aria-label="這次服務滿意度"><button v-for="score in 5" :key="score" type="button" role="radio" :aria-checked="journalRating === score" :aria-label="`${score} 顆星`" @click="journalRating=score"><Star :size="30" :fill="score <= journalRating ? 'currentColor' : 'none'" /></button></div></div>
        </q-card-section>
        <q-card-actions class="cancel-actions"><q-btn flat no-caps label="先不要" @click="journalDialog=false" /><q-btn unelevated no-caps class="cancel-confirm journal-submit-button" label="完成日誌" :loading="journalSubmitting" @click.stop="submitJournal" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="ratingDialog">
      <q-card class="rating-dialog">
        <q-card-section class="detail-dialog__heading"><div><small>雙向服務評量</small><h2>服務滿意度總評價</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉總評價" v-close-popup><X :size="24" /></button></q-card-section>
        <q-card-section v-if="ratingLoading" class="rating-loading"><q-skeleton type="circle" size="88px" /><q-skeleton type="text" width="180px" /></q-card-section>
        <q-card-section v-else class="rating-summary" aria-live="polite">
          <strong>{{ ratingSummary.average.toFixed(1) }}</strong>
          <div class="rating-summary__stars" :aria-label="`總評價 ${ratingSummary.average.toFixed(1)} 顆星`"><Star v-for="score in 5" :key="score" :size="30" :fill="score <= Math.round(ratingSummary.average) ? 'currentColor' : 'none'" /></div>
          <p>{{ ratingSummary.count }} 筆雙向評價</p>
          <small>包含您給居服員，以及居服員給您或受照護者的服務評價。</small>
          <div v-if="ratingSummary.reviews.length" class="rating-detail-list">
            <article v-for="review in ratingSummary.reviews" :key="review._id" class="rating-detail-card">
              <div class="rating-detail-card__heading">
                <span>{{ reviewDirectionLabel(review) }}</span>
                <div :aria-label="`${review.rating} 顆星`"><Star v-for="score in 5" :key="score" :size="18" :fill="score <= review.rating ? 'currentColor' : 'none'" /></div>
              </div>
              <strong>{{ review.direction === 'GIVEN' ? review.targetName : review.reviewerName }}</strong>
              <p>{{ review.comment || '這筆評價沒有留下文字。' }}</p>
            </article>
          </div>
          <p v-else class="rating-empty">目前還沒有可顯示的評價內容。</p>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps class="dialog-button" label="安心看完了" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="cancelDialog" persistent>
      <q-card class="cancel-dialog">
        <q-card-section class="detail-dialog__heading"><div><small>變更或取消服務</small><h2>選擇要處理的預約</h2></div><button class="detail-dialog__close" type="button" aria-label="關閉取消服務視窗" @click="cancelDialog = false"><X :size="24" /></button></q-card-section>
        <q-card-section class="cancel-dialog__body">
          <div v-if="manageableBookings.length" class="manageable-bookings">
            <article v-for="booking in manageableBookings" :key="booking._id" :class="['manageable-booking', { selected: cancelBookingId === booking._id }]" role="button" tabindex="0" @click="selectManageableBooking(booking)" @keydown.enter="selectManageableBooking(booking)">
              <div>
                <strong>{{ formatBookingDate(booking.scheduledStartAt) }}</strong>
                <span>{{ bookingCaregiverName(booking) }}・{{ serviceNames(booking) }}</span>
                <small>受照護者：{{ booking.recipientId?.name || '申請人本人' }}</small>
              </div>
              <div class="manageable-booking__actions">
                <q-btn outline no-caps label="變更時間" @click.stop="startReschedule(booking)" />
                <q-btn unelevated no-caps class="cancel-task-button" label="取消任務" @click.stop="prepareCancellation(booking)" />
              </div>
            </article>
          </div>
          <div v-else class="booking-empty compact"><CalendarHeart :size="34" /><h3>目前沒有可變更或取消的任務</h3></div>
          <template v-if="selectedCancelBooking">
            <template v-if="bookingAction === 'CHANGE'">
              <div class="change-heading"><small>變更服務時間</small><strong>{{ formatBookingDate(selectedCancelBooking.scheduledStartAt) }}・{{ bookingCaregiverName(selectedCancelBooking) }}</strong></div>
              <div v-if="!canRescheduleSelected" class="refund-note warning">這筆任務已進入服務流程，無法線上變更時間。</div>
              <q-input v-model="changeDate" outlined type="date" label="新的服務日期（週一至週五）" :disable="!canRescheduleSelected" />
              <q-select v-model="changeSlot" :options="changeSlotOptions" outlined emit-value map-options label="新的服務時段" :disable="!canRescheduleSelected" />
              <div class="refund-note"><ShieldCheck :size="22" /><span>變更後會通知居服員，任務將回到「待居服員確認」。</span></div>
            </template>
            <template v-else>
              <div class="change-heading cancellation-heading"><small>取消這次服務</small><strong>{{ formatBookingDate(selectedCancelBooking.scheduledStartAt) }}・{{ bookingCaregiverName(selectedCancelBooking) }}</strong></div>
              <q-select v-model="cancelReason" :options="cancelReasonOptions" outlined emit-value map-options label="取消原因（必填）" />
              <div :class="['refund-note', { warning: !isRefundable(selectedCancelBooking) }]">
                <ShieldCheck :size="22" /><span>{{ isRefundable(selectedCancelBooking) ? '現在取消符合退款條件；取消後會立即通知居服員與管理員。' : '距離服務不足 72 小時；仍可取消，但本次費用不予退回。' }}</span>
              </div>
            </template>
          </template>
        </q-card-section>
        <q-card-actions class="cancel-actions"><q-btn flat no-caps label="先回會員中心" @click="cancelDialog = false" /><q-btn v-if="bookingAction === 'CHANGE' && selectedCancelBooking" unelevated no-caps class="cancel-confirm" label="確認變更時間" :loading="cancellingBooking" @click="confirmRescheduleBooking" /><q-btn v-else-if="bookingAction === 'CANCEL' && selectedCancelBooking" unelevated no-caps class="cancel-task-button" label="確認取消任務" :loading="cancellingBooking" @click="confirmCancelBooking" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="recipientDialog">
      <q-card class="detail-dialog">
        <q-card-section class="detail-dialog__heading">
          <div><small>受照護者檔案・{{ detailModeLabel }}</small><h2>{{ selectedRecipient?.name }}</h2></div>
          <button class="detail-dialog__close" type="button" aria-label="關閉受照護者資料" v-close-popup><X :size="24" /></button>
        </q-card-section>
        <q-card-section v-if="selectedRecipient" class="detail-dialog__body">
          <template v-if="detailMode === 'basic'">
            <div class="profile-detail">
              <div class="profile-photo">
                <q-img v-if="selectedRecipient.carePhotoUrls?.[0]" :src="assetUrl(selectedRecipient.carePhotoUrls[0])" ratio="1" :alt="`${selectedRecipient.name}的生活近照`" />
                <div v-else class="profile-photo__empty"><UserRound :size="42" /><span>尚未上傳近照</span></div>
              </div>
              <div class="detail-grid basic-grid">
                <div><span>姓名</span><strong>{{ selectedRecipient.name }}</strong></div>
                <div><span>聯絡電話</span><strong>{{ selectedRecipient.phone || '尚未填寫' }}</strong></div>
                <div><span>性別／稱謂</span><strong>{{ selectedRecipient.gender || '尚未填寫' }}</strong></div>
                <div><span>出生年月日</span><strong>{{ formatDate(selectedRecipient.birthDate) }}</strong></div>
                <div><span>身高</span><strong>{{ measurement(selectedRecipient.heightCm, '公分') }}</strong></div>
                <div><span>體重</span><strong>{{ measurement(selectedRecipient.weightKg, '公斤') }}</strong></div>
              </div>
            </div>
            <div v-if="selectedRecipient.carePhotoUrls && selectedRecipient.carePhotoUrls.length > 1" class="detail-photo-strip" aria-label="其他生活近照">
              <q-img v-for="photo in selectedRecipient.carePhotoUrls.slice(1)" :key="photo" :src="assetUrl(photo)" ratio="1.3" :alt="`${selectedRecipient.name}的其他生活近照`" />
            </div>
            <div class="reminder-grid">
              <div><span>過敏、需要避開的事項</span><strong>{{ selectedRecipient.allergyNotes || '目前沒有特別提醒' }}</strong></div>
              <div><span>健康與用藥提醒</span><strong>{{ selectedRecipient.medicalNotes || '目前沒有特別提醒' }}</strong></div>
              <div class="wide"><span>希望居服員留意的事項</span><strong>{{ selectedRecipient.attentionNotes || '目前沒有特別提醒' }}</strong></div>
            </div>
          </template>

          <template v-else-if="detailMode === 'address'">
            <div class="address-detail">
              <div><span><MapPinned :size="20" /> 主要照護地址</span><strong>{{ selectedRecipient.address?.text || '尚未填寫' }}</strong></div>
              <div><span><HouseHeart :size="20" /> 住家環境與交通提醒</span><strong>{{ selectedRecipient.homeEnvironmentNotes || '目前沒有特別提醒' }}</strong></div>
            </div>
            <div v-if="selectedRecipient.address?.text" class="map-panel">
              <iframe :src="mapEmbedUrl" :title="`${selectedRecipient.name}主要照護地址地圖`" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              <a :href="mapSearchUrl" target="_blank" rel="noopener noreferrer"><MapPinned :size="19" /> 在地圖中確認位置</a>
            </div>
            <div v-else class="detail-note"><MapPinned :size="20" /><span>尚未填寫地址，補上資料後即可使用地圖定位。</span></div>
          </template>

          <template v-else>
            <div class="emergency-detail">
              <span class="emergency-detail__icon"><PhoneCall :size="34" /></span>
              <div><small>緊急聯絡人姓名</small><strong>{{ selectedRecipient.emergencyContact?.name || '尚未填寫' }}</strong></div>
              <div><small>聯絡電話</small><strong>{{ selectedRecipient.emergencyContact?.phone || '尚未填寫' }}</strong></div>
              <div><small>與受照護者的關係</small><strong>{{ selectedRecipient.emergencyContact?.relationship || '尚未填寫' }}</strong></div>
            </div>
            <div class="detail-note"><ShieldCheck :size="20" /><span>發生需要立即確認的狀況時，照安心會優先聯繫這位家人。</span></div>
          </template>
        </q-card-section>
        <q-card-actions class="detail-actions">
          <q-btn flat no-caps class="soft-delete-button" label="移出我的清單" @click="deleteDialog = true" />
          <q-btn flat no-caps class="dialog-button" label="安心看完了" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="recipientPickerDialog">
      <q-card class="picker-dialog">
        <q-card-section><small>受照護者檔案</small><h2>想查看哪一位家人？</h2><p>請從清單選擇受照護者。</p></q-card-section>
        <q-card-section>
          <q-select v-model="pickerRecipientId" :options="recipientOptions" emit-value map-options outlined label="選擇受照護者" behavior="menu">
            <template #prepend><UsersRound :size="21" /></template>
            <template #append><ChevronDown :size="21" /></template>
          </q-select>
        </q-card-section>
        <q-card-actions class="picker-actions">
          <q-btn flat no-caps label="新增一位家人" @click="router.push('/users/recipients/new'); recipientPickerDialog = false" />
          <q-btn flat no-caps class="dialog-button" label="查看安心檔案" @click="confirmRecipientPick" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="emptyRecipientDialog">
      <q-card class="picker-dialog empty-recipient-dialog">
        <q-card-section class="empty-recipient-dialog__icon"><HouseHeart :size="38" /></q-card-section>
        <q-card-section>
          <small>受照護者檔案</small>
          <h2>先為自己或家人建立安心資料</h2>
          <p>目前這個帳號還沒有受照護者資料。建立後，基本提醒、住家交通與緊急聯絡人都會在相同的安心視窗中顯示。</p>
        </q-card-section>
        <q-card-actions class="picker-actions">
          <q-btn flat no-caps label="稍後再填" v-close-popup />
          <q-btn flat no-caps class="dialog-button" label="前往新增資料" @click="goCreateRecipient" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog" persistent>
      <q-card class="delete-dialog">
        <q-card-section class="delete-dialog__icon"><ArchiveX :size="34" /></q-card-section>
        <q-card-section><h2>要將這份資料移出清單嗎？</h2><p>畫面上會隱藏，但系統仍會保留歷史紀錄，日後需要時可由管理員協助查找。</p></q-card-section>
        <q-card-actions align="center">
          <q-btn flat no-caps label="先保留資料" v-close-popup />
          <q-btn flat no-caps class="soft-delete-confirm" :loading="deletingRecipient" label="確認移出清單" @click="softDeleteRecipient" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="calculatorDialog">
      <q-card class="calculator-dialog">
        <q-card-section class="calculator-dialog__heading"><div><small>長照額度與費用</small><h2>自費項目明細試算</h2></div><button type="button" aria-label="關閉試算" v-close-popup><X :size="24" /></button></q-card-section>
        <q-card-section><CareCostCalculator /></q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="lineDialog">
      <q-card class="line-dialog">
        <q-card-section class="line-dialog__mark"><MessageCircleHeart :size="42" /></q-card-section>
        <q-card-section class="line-dialog__copy">
          <small>照安心 LINE 官方帳號</small><h2>需要時，我們就在 LINE 裡陪您</h2>
          <p>官方 LINE ID</p><strong>@690hzupc</strong>
          <a href="https://line.me/R/ti/p/@690hzupc" target="_blank" rel="noopener noreferrer">開啟 LINE 加好友 <ArrowRight :size="20" /></a>
        </q-card-section>
        <q-card-actions align="center"><q-btn flat no-caps label="稍後再綁定" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import BoringAvatar from '@/components/BoringAvatar.vue'
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import {
  AlertCircle,
  ArchiveX,
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarHeart,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileDown,
  HandCoins,
  Heart,
  HeartPulse,
  History,
  HouseHeart,
  MapPinned,
  MessageCircleHeart,
  PhoneCall,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UserRoundCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
} from '@lucide/vue';
import { useAuthStore } from '@/stores/auth-store';
import { useLiveSyncStore } from '@/stores/live-sync-store';
import { api } from '@/boot/axios';
import CareCostCalculator from '@/components/CareCostCalculator.vue';

const authStore = useAuthStore();
const liveSync = useLiveSyncStore();
const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const featureDialog = ref(false);
const longTermCareDialog = ref(false);
const faqDialog = ref(false);
const recipientDialog = ref(false);
const recipientPickerDialog = ref(false);
const emptyRecipientDialog = ref(false);
const deleteDialog = ref(false);
const calculatorDialog = ref(false);
const lineDialog = ref(false);
const bookingDialog = ref(false);
const careComboDialog = ref(false);
const comboHistoryDialog = ref(false);
const careComboLoading = ref(false);
const selectedCombo = ref<CareCombo | null>(null);
const bookingProgressDialog = ref(false);
const progressTab = ref<'progress'|'notifications'|'service'>('progress');
const selectedProgressBooking = ref<Booking | null>(null);
const bookingLoading = ref(false);
const bookingSearch = ref('');
const bookingStatusFilter = ref('ALL');
const bookingStatusOptions = [
  { label:'全部狀態', value:'ALL' }, { label:'待居服員確認', value:'PENDING' },
  { label:'確認任務', value:'ACCEPTED' }, { label:'路途中', value:'DEPARTED' },
  { label:'服務中', value:'IN_SERVICE' }, { label:'等待您確認完成', value:'AWAITING_USER_CONFIRMATION' }, { label:'已完成任務', value:'COMPLETED' },
  { label:'取消任務', value:'CANCELLED' },
];
const completionDialog = ref(false);
const completionBooking = ref<Booking | null>(null);
const completionSubmitting = ref(false);
const journalDialog = ref(false);
const journalBookingId = ref<string | null>(null);
const journalContent = ref('');
const journalStatus = ref('');
const journalPhotos = ref<File[] | null>(null);
const journalRating = ref(0);
const journalSubmitting = ref(false);
const ratingDialog = ref(false);
const ratingLoading = ref(false);
type RatingReview = { _id:string; rating:number; comment:string; direction:'GIVEN'|'RECEIVED'; reviewerName:string; reviewerRole:string; targetName:string; targetRole:string };
const ratingSummary = ref({ average: 0, count: 0, givenCount: 0, receivedCount: 0, reviews: [] as RatingReview[] });
const reviewRoleLabel = (role:string) => ({ NURSE:'居服員', USER:'使用者／家屬', PATIENT:'受照護者', ADMIN:'管理員' } as Record<string,string>)[role] || '平台成員';
const reviewDirectionLabel = (review:RatingReview) => review.direction === 'GIVEN' ? `我給${reviewRoleLabel(review.targetRole)}的評價` : `${reviewRoleLabel(review.reviewerRole)}給我的評價`;
const journalTagOptions = ['有按時服藥','食慾良好','情緒穩定','情緒不佳','物品需補充','有跌倒或不適'].map((label) => ({ label, value:label }));
const cancelDialog = ref(false);
const cancellingBooking = ref(false);
const bookingAction = ref<'CHANGE' | 'CANCEL'>('CHANGE');
const cancelBookingId = ref<string | null>(null);
const cancelReason = ref('SCHEDULE_CHANGE');
const cancelReasonOptions = [
  { label: '家屬或受照護者行程有變', value: 'SCHEDULE_CHANGE' },
  { label: '身體狀況改變', value: 'HEALTH_CHANGE' },
  { label: '想改由其他居服員服務', value: 'CHANGE_CAREGIVER' },
  { label: '其他原因', value: 'OTHER' },
];
const changeDate = ref('');
const changeSlot = ref('');
const changeSlotOptions = ['09:00–11:00','11:00–13:00','13:00–15:00','15:00–17:00'].map((label) => ({ label, value:label }));
const selectedFeature = ref('');
const recipients = ref<CareRecipient[]>([]);
const bookings = ref<Booking[]>([]);
const notifications = ref<NotificationItem[]>([]);
const selectedRecipient = ref<CareRecipient | null>(null);
const overviewRecipientId = ref<string | null>(null);
const pickerRecipientId = ref<string | null>(null);
const deletingRecipient = ref(false);
const detailMode = ref<'basic' | 'address' | 'emergency'>('basic');
const hour = new Date().getHours();
const greeting = computed(() => hour < 11 ? '早安' : hour < 17 ? '您好' : '晚安');
const roleLabel = computed(() => ({ USER: '使用者／家屬', PATIENT: '受照護者', NURSE: '居服員', ADMIN: '管理員' }[authStore.user?.role || 'USER']));
const recipientOptions = computed(() => recipients.value.map((recipient) => ({ label: recipient.name, value: recipient._id })));
const selectedOverviewRecipient = computed(() => recipients.value.find((recipient) => recipient._id === overviewRecipientId.value) || null);
const detailModeLabel = computed(() => ({ basic: '基本資料與照護提醒', address: '住家地址與交通備註', emergency: '緊急聯絡人設定' }[detailMode.value]));
const mapSearchUrl = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRecipient.value?.address?.text || '')}`);
const mapEmbedUrl = computed(() => `https://maps.google.com/maps?q=${encodeURIComponent(selectedRecipient.value?.address?.text || '')}&z=16&hl=zh-TW&output=embed`);

interface FeatureItem {
  label: string;
  caption?: string;
  icon: Component;
  to?: string;
}

interface MemberFeature {
  title: string;
  tone: string;
  icon: Component;
  badge?: string;
  items: FeatureItem[];
}

interface CareRecipient {
  _id: string;
  name: string;
  careLevel?: string;
  mobilityStatus?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  allergyNotes?: string;
  medicalNotes?: string;
  attentionNotes?: string;
  homeEnvironmentNotes?: string;
  carePhotoUrls?: string[];
  address?: { text?: string };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
}
interface Booking { _id:string; bookingNumber?:string; scheduledStartAt:string; scheduledEndAt?:string; status:string; attendanceStatus?:string; createdAt?:string; acceptedAt?:string; departedAt?:string; arrivedAt?:string; serviceStartedAt?:string; completionRequestedAt?:string; completedAt?:string; cancelledAt?:string; serviceAddress?:{ text?:string }; recipientId?:{ _id?:string; name?:string }; caregiverId?:{ _id?:string; profilePhotoUrl?:string; ratingAverage?:number; ratingCount?:number; userId?:{ _id?:string; name?:string } }; serviceTypeIds?:Array<{ _id?:string; name:string }> }
interface NotificationItem { _id:string; bookingId?:string; type:'BOOKING'|'SAFETY'|'SYSTEM'; title:string; message:string; status:'SENT'|'FAILED'|'READ'; createdAt:string }
interface ComboSlot { _id:string; date:string; startTime:string; endTime:string }
interface ComboCaregiver { _id:string; profilePhotoUrl?:string; ratingAverage?:number; ratingCount?:number; userId?:{ name?:string } }
interface CareCombo { key:string; caregiverId:string; caregiverName:string; photo:string|undefined; ratingAverage:number; ratingCount:number; recipientId:string|undefined; recipientName:string; services:Array<{ _id:string; name:string }>; completedCount:number; lastCompletedAt:string; address:string; bookings:Booking[]; slots:ComboSlot[]; selectedSlotId:string; slotLoading:boolean; slotLoaded:boolean; booking:boolean }
const careCombos = ref<CareCombo[]>([]);
const nextBooking = computed(() => bookings.value.filter((item) => !['COMPLETED','CANCELLED','ABANDONED'].includes(item.status) && new Date(item.scheduledStartAt) >= new Date()).sort((a,b) => +new Date(a.scheduledStartAt) - +new Date(b.scheduledStartAt))[0]);
const activeBookings = computed(() => bookings.value.filter((item) => !['COMPLETED','CANCELLED','ABANDONED'].includes(item.status)));
const careNotifications = computed(() => notifications.value.filter((item) => item.type === 'BOOKING'));
const careUnreadCount = computed(() => careNotifications.value.filter((item) => item.status !== 'READ').length);
const totalUnreadCount = computed(() => notifications.value.filter((item) => item.status !== 'READ').length);
const visibleBookings = computed(() => {
  const keyword = bookingSearch.value.trim().toLowerCase();
  const status = bookingStatusFilter.value;
  const now = Date.now();
  return bookings.value
    .filter((booking) => status === 'ALL' || bookingDisplayStatus(booking) === status)
    .filter((booking) => !keyword || [formatBookingDate(booking.scheduledStartAt), bookingStatusLabel(bookingDisplayStatus(booking)), bookingCaregiverName(booking), booking.recipientId?.name, serviceNames(booking)].join(' ').toLowerCase().includes(keyword))
    .sort((a,b) => Math.abs(+new Date(a.scheduledStartAt) - now) - Math.abs(+new Date(b.scheduledStartAt) - now));
});
const manageableBookings = computed(() => bookings.value
  .filter((item) => ['PENDING', 'ACCEPTED'].includes(item.status))
  .sort((a, b) => +new Date(a.scheduledStartAt) - +new Date(b.scheduledStartAt)));
const selectedCancelBooking = computed(() => bookings.value.find((item) => item._id === cancelBookingId.value) || null);
const canRescheduleSelected = computed(() => ['PENDING','ACCEPTED'].includes(selectedCancelBooking.value?.status || ''));
const journalBookingOptions = computed(() => bookings.value.filter((item) => item.status === 'COMPLETED').map((item) => ({ label:`${formatBookingDate(item.scheduledStartAt)}・${bookingCaregiverName(item)}`, value:item._id })));
const selectedJournalBooking = computed(() => bookings.value.find((item) => item._id === journalBookingId.value) || null);

const features: MemberFeature[] = [
  {
    title: '預約與照護進度', tone: 'coral', icon: markRaw(CalendarHeart), badge: '0 筆進行中',
    items: [
      { label: '查看預約及照護進度', caption: '目前沒有進行中的服務', icon: markRaw(CalendarClock) },
      { label: '變更或取消服務', icon: markRaw(Clock3) },
      { label: '歷史照護日誌', icon: markRaw(History) },
      { label: '服務滿意度評價', icon: markRaw(Star) },
    ],
  },
  {
    title: '受照護者檔案', tone: 'wood', icon: markRaw(UsersRound),
    items: [
      { label: '基本資料與照護提醒', icon: markRaw(UserRound) },
      { label: '住家地址與交通備註', icon: markRaw(MapPinned) },
      { label: '緊急聯絡人設定', icon: markRaw(AlertCircle) },
      { label: '新增家人資料', caption: '也可以只替自己預約', icon: markRaw(HouseHeart) },
    ],
  },
  {
    title: '長照額度與費用', tone: 'sage', icon: markRaw(HandCoins), badge: '框架',
    items: [
      { label: '長照額度查詢', caption: '待政府核定資料串接', icon: markRaw(WalletCards) },
      { label: '自費項目明細', icon: markRaw(ReceiptText) },
      { label: '電子收據下載', icon: markRaw(FileDown) },
      { label: '補助試算工具', icon: markRaw(HandCoins), to: '/#subsidy' },
    ],
  },
  {
    title: '常用與偏好', tone: 'peach', icon: markRaw(Heart),
    items: [
      { label: '收藏的居服員', icon: markRaw(Heart), to: '/caregivers?favorites=1' },
      { label: '常用照顧組合', caption: '快速再次預約', icon: markRaw(Sparkles) },
      { label: '最近瀏覽居服員', icon: markRaw(History), to: '/caregivers?recent=1' },
    ],
  },
  {
    title: '訊息與通知', tone: 'amber', icon: markRaw(BellRing), badge: '0 則未讀',
    items: [
      { label: '居服員出發與打卡通知', icon: markRaw(BellRing) },
      { label: '系統重要公告', icon: markRaw(MessageCircleHeart) },
      { label: 'LINE 帳號綁定', caption: '官方帳號 @690hzupc', icon: markRaw(MessageCircleHeart) },
    ],
  },
  {
    title: '幫助與長照指南', tone: 'cream', icon: markRaw(CircleHelp),
    items: [
      { label: '長照服務申請說明', icon: markRaw(CircleHelp) },
      { label: '各鄉鎮服務範圍', icon: markRaw(MapPinned) },
      { label: '常見問題', icon: markRaw(MessageCircleHeart) },
    ],
  },
];

const careFaqs: Array<{ question:string; shortAnswer:string; answer:string; source?:string }> = [
  {
    question: '政府長照補助可以在照安心折抵嗎？',
    shortAnswer: '目前不可以。',
    answer: '照安心是自費預約平台，無法直接扣抵政府長照給付額度；政府核定服務請依個管員安排使用。',
  },
  {
    question: '我要怎麼申請政府長照？',
    shortAnswer: '最簡單是撥打 1966。',
    answer: '也可聯絡所在地照管中心、線上申請，或在住院期間詢問出院準備團隊。流程是申請、評估、擬定照顧計畫、開始服務。',
    source: 'https://1966.gov.tw/LTC/cp-6533-70777-207.html',
  },
  {
    question: '申請後就一定有補助嗎？',
    shortAnswer: '不一定。',
    answer: '需由照管中心評估長照需要等級，再依身分與照顧計畫確認可用服務和給付額度。',
    source: 'https://1966.gov.tw/LTC/cp-6533-70777-207.html',
  },
  {
    question: '政府長照和自費服務差在哪裡？',
    shortAnswer: '申請方式和付費制度不同。',
    answer: '政府長照依評估與核定計畫使用；自費服務依平台規則預約並由使用者負擔費用。兩者沒有額度串接。',
  },
  {
    question: '家人快出院，回家後沒人照顧怎麼辦？',
    shortAnswer: '出院前就先向醫院詢問。',
    answer: '可詢問「出院準備銜接長照服務」，或撥打 1966，提早進行需求評估與服務銜接。',
    source: 'https://1966.gov.tw/LTC/cp-6458-69942-207.html',
  },
  {
    question: '家裡有外籍看護，還能申請長照嗎？',
    shortAnswer: '仍可提出申請。',
    answer: '符合評估條件者，可能使用部分長照服務；實際項目與照顧空窗規定，以政府評估為準。',
    source: 'https://1966.gov.tw/LTC/cp-6460-69943-207.html',
  },
  {
    question: '照顧者太累，可以找人暫時替手嗎？',
    shortAnswer: '可以詢問喘息服務。',
    answer: '照顧者需要休息或暫時無法照顧時，可撥打 1966，由長照體系評估並協助連結服務。',
    source: 'https://1966.gov.tw/LTC/cp-6454-70075-207.html',
  },
  {
    question: '現在就需要照顧，應該先做什麼？',
    shortAnswer: '緊急狀況先打 119。',
    answer: '若不是醫療緊急狀況，可同步撥打 1966 詢問政府長照，並另行了解平台提供的自費服務。',
  },
];

function openFeature(name: string) {
  selectedFeature.value = name;
  featureDialog.value = true;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
function assetUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath.startsWith('/uploads/') ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
}

async function loadRecipients() {
  try {
    const { data } = await api.get<CareRecipient[]>('/patients');
    recipients.value = data;
    const selectedStillExists = data.some((recipient) => recipient._id === overviewRecipientId.value);
    if (!selectedStillExists) overviewRecipientId.value = data[0]?._id || null;
  } catch {
    recipients.value = [];
  }
}

async function loadBookings() {
  try { bookings.value = (await api.get<Booking[]>('/bookings')).data; } catch { bookings.value = []; }
}
async function loadNotifications() {
  try { notifications.value = (await api.get<NotificationItem[]>('/notifications')).data; } catch { notifications.value = []; }
}
function formatBookingDate(value:string) { return new Intl.DateTimeFormat('zh-TW',{month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function bookingStatusLabel(value:string) { return ({PENDING:'待居服員確認',ACCEPTED:'確認任務',DEPARTED:'路途中',ARRIVED:'已抵達',WAITING_DECISION:'等待安全確認',IN_SERVICE:'服務中',AWAITING_USER_CONFIRMATION:'等待您確認完成',COMPLETED:'已完成任務',CANCELLED:'取消任務',ABANDONED:'已棄單',LATE:'遲到',OVERDUE:'逾期中'} as Record<string,string>)[value] || value; }
function bookingDisplayStatus(booking:Booking) { return ['LATE','OVERDUE'].includes(booking.attendanceStatus || '') ? booking.attendanceStatus! : booking.status; }
function bookingCaregiverName(booking:Booking) { return booking.caregiverId?.userId?.name || '照安心居服員'; }
function serviceNames(booking:Booking) { return booking.serviceTypeIds?.map((item) => item.name).join('、') || '照護服務'; }
function formatBookingRange(booking:Booking) { return `${formatBookingDate(booking.scheduledStartAt)}${booking.scheduledEndAt ? `－${new Intl.DateTimeFormat('zh-TW',{hour:'2-digit',minute:'2-digit'}).format(new Date(booking.scheduledEndAt))}` : ''}`; }
function bookingDay(booking:Booking) { return new Date(booking.scheduledStartAt).getDate(); }
function bookingMonth(booking:Booking) { return new Date(booking.scheduledStartAt).getMonth() + 1; }
function bookingStatusTone(status:string) { return ['ACCEPTED','ARRIVED','IN_SERVICE'].includes(status) ? 'status-success' : ['PENDING','DEPARTED','WAITING_DECISION','AWAITING_USER_CONFIRMATION'].includes(status) ? 'status-waiting' : ['CANCELLED','ABANDONED','LATE','OVERDUE'].includes(status) ? 'status-warning' : 'status-muted'; }
function bookingTimeline(booking:Booking) {
  return [
    { label:'使用者提出照護需求', at:booking.createdAt }, { label:'居服員確認任務', at:booking.acceptedAt },
    { label:'居服員開始前往', at:booking.departedAt }, { label:'抵達服務地點', at:booking.arrivedAt },
    { label:'開始執行服務', at:booking.serviceStartedAt }, { label:'居服員提出完成', at:booking.completionRequestedAt },
    { label:'雙方確認完成', at:booking.completedAt }, { label:'任務取消', at:booking.cancelledAt, danger:true },
  ].filter((event): event is { label:string; at:string; danger?:boolean } => Boolean(event.at));
}
function bookingProgressCopy(booking:Booking) {
  if (booking.cancelledAt || booking.status === 'CANCELLED') return { title:'預約已取消', description:'這筆照護服務已取消。' };
  if (booking.completedAt || booking.status === 'COMPLETED') return { title:'服務已完成', description:'本次照護服務已由雙方確認完成。' };
  if (booking.completionRequestedAt || booking.status === 'AWAITING_USER_CONFIRMATION') return { title:'等待您確認完成', description:'居服員已提出服務完成，等待您確認。' };
  if (booking.serviceStartedAt || booking.status === 'IN_SERVICE') return { title:'居服員正在執行服務', description:'居服員已抵達，目前正在執行照護服務。' };
  if (booking.arrivedAt || ['ARRIVED','WAITING_DECISION'].includes(booking.status)) return { title:'居服員已抵達', description:'居服員已抵達您的服務地點。' };
  if (booking.departedAt || booking.status === 'DEPARTED') return { title:'居服員前往服務地點中', description:'居服員已出發，正在前往您的服務地點。' };
  if (booking.acceptedAt || booking.status === 'ACCEPTED') return { title:'居服員已確認任務', description:'居服員已確認這筆照護服務。' };
  return { title:'等待居服員確認', description:'您的照護需求已送出，等待居服員確認任務。' };
}
function formatProgressDate(value:string) { return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function bookingMapSearchUrl(booking:Booking) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.serviceAddress?.text || '')}`; }
function bookingMapEmbedUrl(booking:Booking) { return `https://maps.google.com/maps?q=${encodeURIComponent(booking.serviceAddress?.text || '')}&z=16&hl=zh-TW&output=embed`; }
async function openBookingProgress() {
  progressTab.value = 'progress';
  await Promise.all([loadBookings(), loadNotifications()]);
  const notifiedBooking = careNotifications.value.find((item) => item.bookingId)?.bookingId;
  selectedProgressBooking.value = bookings.value.find((booking) => booking._id === notifiedBooking) || bookings.value.find((booking) => ['DEPARTED','ARRIVED','WAITING_DECISION','IN_SERVICE','AWAITING_USER_CONFIRMATION'].includes(booking.status)) || activeBookings.value[0] || bookings.value[0] || null;
  bookingProgressDialog.value = true;
  if (careUnreadCount.value) {
    try {
      await api.patch('/notifications/booking/read');
      notifications.value = notifications.value.map((item) => item.type === 'BOOKING' ? { ...item, status:'READ' } : item);
    } catch { $q.notify({ type:'negative', message:'通知已開啟，但已讀狀態暫時無法更新。' }); }
  }
}
function selectNotificationBooking(notification:NotificationItem) { selectedProgressBooking.value = bookings.value.find((booking) => booking._id === notification.bookingId) || selectedProgressBooking.value; }
async function openCompletionConfirm(booking:Booking) {
  completionBooking.value = booking;
  bookingDialog.value = false;
  await nextTick();
  completionDialog.value = true;
}
async function confirmCompletion() {
  const booking = completionBooking.value;
  if (!booking) return;
  completionSubmitting.value = true;
  try {
    const { data } = await api.post<{ booking:Booking }>(`/bookings/${booking._id}/confirm-completion`);
    bookings.value = bookings.value.map((item) => item._id === booking._id ? data.booking : item);
    await loadBookings(); liveSync.notifyChanged(); completionDialog.value = false;
    $q.notify({ type:'positive', message:'本次照護已由雙方確認完成' });
  } catch (error:any) { $q.notify({ type:'negative', message:error?.response?.data?.message || '目前無法確認完成，請稍後再試。' }); }
  finally { completionSubmitting.value = false; }
}
function isRefundable(booking:Booking) { return booking.status === 'PENDING' || new Date(booking.scheduledStartAt).getTime() - Date.now() >= 72 * 60 * 60 * 1000; }
function selectManageableBooking(booking: Booking) { cancelBookingId.value = booking._id; }
function startReschedule(booking:Booking) { selectManageableBooking(booking); bookingAction.value = 'CHANGE'; changeDate.value = ''; changeSlot.value = ''; }
function prepareCancellation(booking: Booking) { selectManageableBooking(booking); bookingAction.value = 'CANCEL'; cancelReason.value = 'SCHEDULE_CHANGE'; }

async function openBookingList() {
  bookingDialog.value = true;
  bookingLoading.value = true;
  await loadBookings();
  bookingLoading.value = false;
}
function openNextCare() { nextBooking.value ? void openBookingList() : void router.push('/caregivers'); }

function buildCareCombos() {
  const combos = new Map<string, CareCombo>();
  bookings.value.filter((booking) => booking.status === 'COMPLETED').forEach((booking) => {
    const caregiverId = booking.caregiverId?._id;
    const serviceIds = (booking.serviceTypeIds || []).map((item) => item._id).filter((id): id is string => Boolean(id)).sort();
    if (!caregiverId || !serviceIds.length) return;
    const recipientId = booking.recipientId?._id;
    const key = `${caregiverId}|${recipientId || 'SELF'}|${serviceIds.join(',')}`;
    const existing = combos.get(key);
    if (existing) {
      existing.bookings.push(booking); existing.completedCount++;
      if (+new Date(booking.completedAt || booking.scheduledStartAt) > +new Date(existing.lastCompletedAt)) { existing.lastCompletedAt = booking.completedAt || booking.scheduledStartAt; existing.address = booking.serviceAddress?.text || existing.address; }
      return;
    }
    combos.set(key, { key, caregiverId, caregiverName:bookingCaregiverName(booking), photo:booking.caregiverId?.profilePhotoUrl, ratingAverage:booking.caregiverId?.ratingAverage || 0, ratingCount:booking.caregiverId?.ratingCount || 0, recipientId, recipientName:booking.recipientId?.name || '申請人本人', services:(booking.serviceTypeIds || []).map((item) => ({ _id:item._id!, name:item.name })), completedCount:1, lastCompletedAt:booking.completedAt || booking.scheduledStartAt, address:booking.serviceAddress?.text || '', bookings:[booking], slots:[], selectedSlotId:'', slotLoading:false, slotLoaded:false, booking:false });
  });
  careCombos.value = [...combos.values()].sort((a,b) => b.completedCount - a.completedCount || +new Date(b.lastCompletedAt) - +new Date(a.lastCompletedAt));
}
async function loadComboSlots(combo:CareCombo) { combo.slotLoading = true; try { combo.slots = (await api.get<ComboSlot[]>(`/nurses/${combo.caregiverId}/availability`)).data; combo.selectedSlotId = combo.slots[0]?._id || ''; } catch { combo.slots = []; $q.notify({ type:'negative', message:'可預約時段暫時無法載入' }); } finally { combo.slotLoading = false; combo.slotLoaded = true; } }
async function refreshComboCaregiver(combo:CareCombo) { try { const nurse = (await api.get<ComboCaregiver>(`/nurses/${combo.caregiverId}`)).data; if (nurse._id !== combo.caregiverId) return; combo.caregiverName = nurse.userId?.name || combo.caregiverName; combo.photo = nurse.profilePhotoUrl; combo.ratingAverage = nurse.ratingAverage || 0; combo.ratingCount = nurse.ratingCount || 0; } catch { combo.photo = undefined; } }
async function openCareComboDialog() { careComboDialog.value = true; careComboLoading.value = true; try { await loadBookings(); buildCareCombos(); await Promise.all(careCombos.value.map(refreshComboCaregiver)); await Promise.all(careCombos.value.slice(0,3).map(loadComboSlots)); } finally { careComboLoading.value = false; } }
function formatComboSlot(slot:ComboSlot) { return `${new Intl.DateTimeFormat('zh-TW',{month:'numeric',day:'numeric',weekday:'short'}).format(new Date(slot.date))} ${slot.startTime}–${slot.endTime}`; }
function openComboHistory(combo:CareCombo) { selectedCombo.value = combo; comboHistoryDialog.value = true; }
async function openProgressFromCombo() { careComboDialog.value = false; await nextTick(); await openBookingList(); }
async function bookCareCombo(combo:CareCombo) {
  if (!combo.selectedSlotId || !combo.address) { $q.notify({ type:'warning', message:'找不到原服務地址，請從居服員頁面預約' }); return; }
  combo.booking = true;
  try { await api.post('/bookings', { availabilityId:combo.selectedSlotId, recipientId:combo.recipientId, serviceTypeIds:combo.services.map((item) => item._id), serviceAddress:{ text:combo.address } }); await loadBookings(); liveSync.notifyChanged(); careComboDialog.value = false; bookingDialog.value = true; $q.notify({ type:'positive', message:'預約已送出，等待居服員確認' }); }
  catch (error:any) { $q.notify({ type:'negative', message:error?.response?.data?.message || '預約沒有送出成功，請重新選擇時段' }); await loadComboSlots(combo); }
  finally { combo.booking = false; }
}

async function confirmCancelBooking() {
  const booking = selectedCancelBooking.value;
  if (!booking || !cancelReason.value) { $q.notify({ type:'warning', message:'請先選擇取消原因' }); return; }
  cancellingBooking.value = true;
  try {
    const { data } = await api.post<{ booking: Booking; refundEligible:boolean }>(`/bookings/${booking._id}/cancel`, { reason: cancelReason.value });
    const cancelled = data.booking || { ...booking, status: 'CANCELLED' };
    bookings.value = bookings.value.map((item) => item._id === booking._id ? cancelled : item);
    await loadBookings();
    liveSync.notifyChanged();
    cancelDialog.value = false;
    bookingDialog.value = true;
    $q.notify({ type:'positive', message:data.refundEligible ? '已取消任務，符合退款條件' : '已取消任務，本次不符合退款條件' });
  } catch (error:any) {
    $q.notify({ type:'negative', message:error?.response?.data?.message || '取消失敗，請重新整理後再試一次' });
  } finally { cancellingBooking.value = false; }
}

async function confirmRescheduleBooking() {
  const booking = selectedCancelBooking.value;
  const [startTime, endTime] = changeSlot.value.split('–');
  if (!booking || !canRescheduleSelected.value || !changeDate.value || !startTime || !endTime) { $q.notify({ type:'warning', message:'請選擇可變更的預約、新日期與時段' }); return; }
  cancellingBooking.value = true;
  try {
    await api.patch(`/bookings/${booking._id}/reschedule`, { date:changeDate.value, startTime, endTime });
    await loadBookings(); liveSync.notifyChanged(); cancelDialog.value = false;
    $q.notify({ type:'positive', message:'預約時間已變更，等待居服員重新確認' });
  } finally { cancellingBooking.value = false; }
}

function openRecipient(mode: 'basic' | 'address' | 'emergency' = 'basic') {
  if (!recipients.value.length) {
    emptyRecipientDialog.value = true;
    return;
  }
  detailMode.value = mode;
  openRecipientById(overviewRecipientId.value || recipients.value[0]!._id);
}

function goCreateRecipient() {
  emptyRecipientDialog.value = false;
  void router.push('/users/recipients/new');
}

function openRecipientById(id: string | null) {
  if (!id) return;
  const recipient = recipients.value.find((item) => item._id === id);
  if (!recipient) return;
  overviewRecipientId.value = id;
  selectedRecipient.value = recipient;
  recipientPickerDialog.value = false;
  recipientDialog.value = true;
}

function selectOverviewRecipient(id: string | null) {
  if (!id) return;
  overviewRecipientId.value = id;
  selectedRecipient.value = recipients.value.find((item) => item._id === id) || null;
}

function confirmRecipientPick() {
  openRecipientById(pickerRecipientId.value);
}

function formatDate(value?: string) {
  if (!value) return '尚未填寫';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '尚未填寫' : new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function measurement(value: number | undefined, unit: string) {
  return value === undefined ? '尚未填寫' : `${value} ${unit}`;
}

async function softDeleteRecipient() {
  if (!selectedRecipient.value) return;
  deletingRecipient.value = true;
  try {
    await api.delete(`/patients/${selectedRecipient.value._id}`, { data: { reason: '使用者從會員中心移出清單' } });
    deleteDialog.value = false;
    recipientDialog.value = false;
    selectedRecipient.value = null;
    await loadRecipients();
    liveSync.notifyChanged();
  } finally {
    deletingRecipient.value = false;
  }
}

function handleFeatureItem(name: string) {
  const recipientModes = {
    '基本資料與照護提醒': 'basic',
    '住家地址與交通備註': 'address',
    '緊急聯絡人設定': 'emergency',
  } as const;
  if (name in recipientModes) {
    openRecipient(recipientModes[name as keyof typeof recipientModes]);
    return;
  }
  if (name === '新增家人資料') {
    void router.push('/users/recipients/new');
    return;
  }
  if (name === '查看預約及照護進度') { void openBookingList(); return; }
  if (name === '常用照顧組合') { void openCareComboDialog(); return; }
  if (name === '居服員出發與打卡通知') { void openBookingProgress(); return; }
  if (name === '變更或取消服務') {
    cancelBookingId.value = null;
    bookingAction.value = 'CHANGE'; changeDate.value = ''; changeSlot.value = ''; cancelReason.value = 'SCHEDULE_CHANGE';
    cancelDialog.value = true;
    return;
  }
  if (name === '歷史照護日誌') {
    journalBookingId.value = journalBookingOptions.value[0]?.value || null;
    journalContent.value = '';
    journalStatus.value = '';
    journalPhotos.value = null;
    journalRating.value = 0;
    journalDialog.value = true;
    return;
  }
  if (name === '服務滿意度評價') { void openRatingSummary(); return; }
  if (name === 'LINE 帳號綁定' || name === 'LINE 專人服務') {
    lineDialog.value = true;
    return;
  }
  if (name === '自費項目明細') {
    calculatorDialog.value = true;
    return;
  }
  if (name === '長照服務申請說明') {
    longTermCareDialog.value = true;
    return;
  }
  if (name === '常見問題') {
    faqDialog.value = true;
    return;
  }
  openFeature(name);
}

async function openRatingSummary() {
  ratingDialog.value = true;
  ratingLoading.value = true;
  try {
    ratingSummary.value = (await api.get('/feedback/reviews/summary')).data;
  } catch (error:any) {
    $q.notify({ type:'negative', message:error?.response?.data?.message || '總評價載入失敗，請稍後再試' });
  } finally { ratingLoading.value = false; }
}

async function createJournal(complaintReason = '') {
  const booking = selectedJournalBooking.value;
  const targetUserId = booking?.caregiverId?.userId?._id;
  if (!booking || !targetUserId || !journalContent.value.trim() || !journalRating.value) {
    $q.notify({ type:'warning', message:'請選擇已完成服務，並填寫日誌與星級評價' });
    return;
  }
  journalSubmitting.value = true;
  try {
    const body = new FormData();
    body.append('bookingId', booking._id);
    body.append('targetUserId', targetUserId);
    body.append('rating', String(journalRating.value));
    body.append('comment', journalContent.value.trim());
    body.append('careTags', JSON.stringify(journalStatus.value ? [journalStatus.value] : []));
    (journalPhotos.value || []).forEach((file) => body.append('photos', file));
    await api.post('/feedback/reviews', body);
    if (complaintReason) await api.post('/feedback/complaints', { bookingId:booking._id, targetUserId, category:'SERVICE_QUALITY', description:complaintReason, priority:'HIGH' });
    liveSync.notifyChanged();
    journalDialog.value = false;
    $q.notify({ type:'positive', message:complaintReason ? '照護日誌與品質通報已送達' : '照護日誌已安心保存' });
  } catch (error:any) {
    $q.notify({ type:'negative', message:error?.response?.data?.message || '日誌送出失敗，請稍後再試' });
  } finally { journalSubmitting.value = false; }
}

function submitJournal() {
  if (!selectedJournalBooking.value || !journalContent.value.trim() || !journalRating.value) { void createJournal(); return; }
  if (journalRating.value !== 1) { void createJournal(); return; }
  $q.dialog({ title:'需要管理員協助嗎？', message:'收到一星評價，我們很重視您的感受。是否同時提出服務投訴？', cancel:{ label:'只留下評價', flat:true }, ok:{ label:'提出投訴', color:'negative' }, persistent:true })
    .onCancel(() => void createJournal())
    .onOk(() => $q.dialog({ title:'請告訴我們發生什麼事', prompt:{ model:'', type:'textarea', isValid:(value:string) => value.trim().length >= 5 }, cancel:{ label:'先不要', flat:true }, ok:{ label:'送出投訴', color:'negative' }, persistent:true }).onOk((reason:string) => void createJournal(reason.trim())));
}

onMounted(async () => {
  await Promise.all([loadRecipients(), loadBookings(), loadNotifications()]);
  liveSync.start(async () => { await Promise.all([loadRecipients(), loadBookings(), loadNotifications()]); });
  if (route.query.recipientSaved === '1') openRecipient();
});
onBeforeUnmount(liveSync.stop);
</script>

<style scoped>
.member-page { --milk:#fff9f5; --paper:#fffdfb; --ink:#493833; --chestnut:#6e5750; --peach:#eb9079; --persimmon:#b84f16; --sage:#4f7264; min-height:100%; color:var(--ink); background:var(--milk); }
.member-shell { width:min(1180px,100%); margin:0 auto; padding:32px 24px 72px; }
.member-hero { display:flex; align-items:center; justify-content:space-between; gap:28px; padding:34px 38px; color:white; background:linear-gradient(120deg,#6e5750,#80665d); border-radius:28px; box-shadow:0 20px 46px rgb(78 52 43 / 14%); }
.member-profile { display:flex; align-items:center; gap:20px; }
.member-kicker { color:#ffd9cd; font-size:.83rem; font-weight:700; letter-spacing:.14em; }
.member-profile h1 { margin:7px 0 5px; font-size:clamp(1.9rem,4vw,2.8rem); line-height:1.25; }
.member-profile p { margin:0; color:#f4e7e1; font-size:1rem; }
.member-status { display:flex; flex-direction:column; align-items:flex-end; gap:13px; }
.member-status span,.member-status a { min-height:44px; display:inline-flex; align-items:center; gap:7px; }
.member-status a { padding:0 18px; color:#824019; background:#fff5ef; border-radius:14px; font-weight:700; text-decoration:none; }
.overview-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:24px; }
.overview-card { min-height:136px; display:flex; align-items:center; gap:16px; padding:22px; background:var(--paper); border:1px solid rgb(110 87 80 / 12%); border-radius:22px; box-shadow:0 12px 30px rgb(78 52 43 / 7%); cursor:pointer; transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease; touch-action:manipulation; }
.overview-card:hover{transform:translateY(-3px);border-color:rgb(184 79 22 / 25%);box-shadow:0 17px 34px rgb(78 52 43 / 11%)}.overview-card:active{transform:translateY(-1px)}.overview-card:focus-visible{outline:3px solid #ee9b84;outline-offset:3px}
.overview-card__icon { flex:0 0 58px; width:58px; height:58px; display:grid; place-items:center; border-radius:19px; }
.next-care .overview-card__icon { color:#a5441e; background:#ffe7de; }.family-care .overview-card__icon{color:#694f40;background:#eee2da}.allowance-care .overview-card__icon{color:#38604f;background:#deeee6}
.overview-card>div:nth-child(2){display:flex;flex-direction:column;gap:4px}.overview-card span{color:#7e675f}.overview-card strong{font-size:1.12rem}.overview-card small{color:#8a746c;line-height:1.4}.overview-card__arrow{min-width:44px;min-height:44px;display:grid!important;place-items:center;margin-left:auto;color:var(--persimmon)!important;border-radius:12px;transition:transform .2s ease}.overview-card:hover .overview-card__arrow{transform:translateX(3px)}
.overview-card--selector{cursor:default}.overview-card--selector:hover{transform:none}.recipient-summary{min-width:0;flex:1}.recipient-summary :deep(.q-field__control){min-height:42px;color:transparent}.recipient-summary :deep(.q-field__native){padding:0;color:var(--ink);font-size:1.12rem;font-weight:700}.recipient-summary :deep(.q-field__append){color:var(--persimmon)}.recipient-summary :deep(.q-select__dropdown-icon),.picker-dialog :deep(.q-select__dropdown-icon){display:none}.overview-add{flex:0 0 44px;width:44px;height:44px;display:grid;place-items:center;color:#84401f;background:#fff0e9;border:0;border-radius:14px;cursor:pointer}
.booking-confirmed{color:#36705a!important;font-weight:800!important}
.features-section { padding-top:62px; }.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.section-heading span{color:var(--persimmon);font-size:.9rem;font-weight:700;letter-spacing:.12em}.section-heading h2{margin:8px 0 0;font-size:clamp(2rem,4vw,3rem);line-height:1.25}.section-heading p{margin:0;color:#7c655e;font-size:1rem}
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }.feature-card{overflow:hidden;background:var(--paper);border:1px solid rgb(110 87 80 / 12%);border-radius:24px;box-shadow:0 14px 35px rgb(78 52 43 / 8%)}.feature-card header{min-height:86px;display:flex;align-items:center;gap:12px;padding:20px 22px;color:white}.feature-card header h3{margin:0;font-size:1.28rem}.feature-card header.coral{background:#b95326}.feature-card header.wood{background:#735a50}.feature-card header.sage{background:#4f7264}.feature-card header.peach{background:#cf7662}.feature-card header.amber{background:#a96832}.feature-card header.cream{color:#5a463f;background:#ead9cd}.feature-badge{margin-left:auto;color:#684b40;background:#fff4ee}.feature-list :deep(.q-item){min-height:66px;padding:12px 18px;color:var(--chestnut)}.feature-list :deep(.q-item:hover){background:#fff5f0}.feature-list :deep(.q-item__section--avatar){min-width:38px;color:var(--persimmon)}.feature-list :deep(.q-item__label){font-size:1rem;line-height:1.45}.feature-list :deep(.q-item__label--caption){font-size:.83rem;color:#8b756d}.feature-item-side{display:flex;align-items:center;flex-direction:row!important;gap:8px}.feature-item-side :deep(.q-badge){min-width:24px;justify-content:center;color:white;background:#b84f16;font-weight:800}
.empty-recipient-dialog{padding:14px}.empty-recipient-dialog__icon{width:68px;height:68px;display:grid;place-items:center;margin:22px 24px 0;color:#9b411b;background:#fff0e9;border-radius:22px}.empty-recipient-dialog h2{margin:8px 0 10px}.empty-recipient-dialog p{margin:0;color:#806a62;line-height:1.75}
.support-banner{display:flex;align-items:center;gap:20px;margin-top:52px;padding:27px 32px;color:white;background:var(--sage);border-radius:24px}.support-banner__icon{flex:0 0 64px;width:64px;height:64px;display:grid;place-items:center;background:rgb(255 255 255 / 13%);border-radius:20px}.support-banner span{color:#dcebe4}.support-banner h2{margin:4px 0 0;font-size:clamp(1.3rem,3vw,1.9rem)}.support-banner button{min-height:48px;margin-left:auto;padding:0 20px;color:#315344;background:#f0faf4;border:0;border-radius:14px;font:inherit;font-weight:700;cursor:pointer}
.login-state{min-height:560px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;background:var(--paper);border-radius:28px}.login-state__icon{width:92px;height:92px;display:grid;place-items:center;color:var(--persimmon);background:#ffe8df;border-radius:30px}.login-state>span{margin-top:22px;color:var(--persimmon);font-weight:700;letter-spacing:.12em}.login-state h1{margin:10px 0;font-size:clamp(2rem,5vw,3rem)}.login-state p{margin:0 0 24px;color:#79635b;font-size:1.08rem}.login-state a{min-height:52px;display:inline-flex;align-items:center;gap:8px;padding:0 24px;color:white;background:var(--persimmon);border-radius:15px;font-size:1.06rem;font-weight:700;text-decoration:none}
.feature-dialog{width:min(460px,calc(100vw - 32px));padding:10px;background:#fffdfb;border-radius:24px}.feature-dialog__heading{display:flex;align-items:center;gap:14px}.feature-dialog__heading>span{width:54px;height:54px;display:grid;place-items:center;color:#9e421a;background:#ffe7de;border-radius:17px}.feature-dialog small{color:var(--persimmon);font-weight:700}.feature-dialog h2{margin:3px 0 0;font-size:1.55rem}.feature-dialog p{margin:0;color:#725c54;font-size:1rem;line-height:1.7}.dialog-button{min-height:44px;color:white;background:var(--persimmon);border-radius:13px;padding:0 17px}
.long-term-care-dialog{width:min(760px,calc(100vw - 32px));max-width:min(760px,calc(100vw - 32px))!important;max-height:92dvh;display:flex;flex-direction:column;overflow:hidden;color:var(--ink);background:#fffdfb;border-radius:26px}.long-term-care-heading{flex:none;border-bottom:1px solid #eee1da}.long-term-care-body{min-height:0;overflow-y:auto;padding:20px 32px 24px}.long-term-care-lead{margin:0 0 24px;color:#694f47;font-size:1.05rem;line-height:1.8}.long-term-care-body h3{margin:0 0 14px;font-size:1.25rem}.long-term-care-steps{display:grid;gap:10px;margin:0 0 20px;padding:0;list-style:none}.long-term-care-steps li{display:grid;grid-template-columns:42px 1fr;align-items:start;gap:13px;padding:15px;background:#fff6f1;border:1px solid #f0e2db;border-radius:16px}.long-term-care-steps li>span{width:42px;height:42px;display:grid;place-items:center;color:white;background:#b84f16;border-radius:13px;font-weight:800}.long-term-care-steps li>div{display:grid;gap:4px}.long-term-care-steps strong{font-size:1.03rem}.long-term-care-steps small{color:#765f57;font-size:.91rem;line-height:1.6}.long-term-care-expansion{overflow:hidden;margin-top:10px;border:1px solid #e8d9d1;border-radius:15px}.long-term-care-expansion :deep(.q-item){min-height:58px;color:#5d4942;font-weight:700}.long-term-care-expansion :deep(.q-expansion-item__content)>div{padding:2px 18px 18px;color:#725c54;line-height:1.7}.long-term-care-notice{display:flex;align-items:flex-start;gap:11px;margin-top:18px;padding:16px;color:#315f4c;background:#e8f3ed;border-radius:16px}.long-term-care-notice svg{flex:none;margin-top:2px}.long-term-care-notice p{margin:0;line-height:1.65}.long-term-care-notice strong{display:block;margin-bottom:3px}.long-term-care-actions{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 32px 22px;border-top:1px solid #eee1da}.care-action{min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:14px;font-weight:800;text-decoration:none}.care-action--phone{color:#3b6654;background:#e5f1eb}.care-action--official{color:white;background:#b84f16}
.care-faq-dialog{width:min(780px,calc(100vw - 32px));max-width:min(780px,calc(100vw - 32px))!important;max-height:92dvh;display:flex;flex-direction:column;overflow:hidden;color:var(--ink);background:#fffdfb;border-radius:26px}.care-faq-heading{flex:none;border-bottom:1px solid #eee1da}.care-faq-body{min-height:0;overflow-y:auto;padding:22px 32px 26px}.care-faq-intro{display:flex;align-items:flex-start;gap:14px;padding:18px;color:#65451f;background:#fff3d6;border:1px solid #f0dfb7;border-radius:18px}.care-faq-intro>span{width:48px;height:48px;display:grid;place-items:center;flex:none;color:#8a5522;background:#fffaf0;border-radius:15px}.care-faq-intro h3{margin:0 0 4px;font-size:1.2rem}.care-faq-intro p{margin:0;line-height:1.65}.care-faq-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0 26px}.care-faq-compare article{display:grid;gap:5px;padding:17px;border:1px solid #e7d9d1;border-radius:17px}.care-faq-compare article:first-child{background:#edf5f1}.care-faq-compare article:last-child{background:#fff3ed}.care-faq-compare span{color:#796159;font-size:.84rem;font-weight:800}.care-faq-compare strong{font-size:1.05rem}.care-faq-compare small{color:#6f5b54;font-size:.9rem;line-height:1.55}.care-faq-section-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.care-faq-section-title h3{margin:0;font-size:1.25rem}.care-faq-section-title small{color:#806a62}.care-faq-item{overflow:hidden;margin-top:9px;border:1px solid #e8d9d1;border-radius:15px}.care-faq-item :deep(.q-item){min-height:64px;padding:10px 14px}.care-faq-item :deep(.q-item__label){color:#513e38;font-size:1rem;font-weight:800;line-height:1.45}.care-faq-number{width:34px;height:34px;display:grid;place-items:center;color:#8b451f;background:#ffeadf;border-radius:11px;font-weight:800}.care-faq-answer{padding:2px 18px 18px 66px}.care-faq-answer p{margin:0;color:#6e5850;line-height:1.75}.care-faq-answer p strong{margin-right:5px;color:#3e302c}.care-faq-answer a{display:inline-flex;align-items:center;gap:5px;margin-top:10px;color:#9d451d;font-weight:800;text-decoration:none}.care-faq-notice{display:flex;align-items:flex-start;gap:10px;margin-top:18px;padding:15px;color:#315f4c;background:#e8f3ed;border-radius:15px}.care-faq-notice svg{flex:none;margin-top:2px}.care-faq-notice p{margin:0;line-height:1.65}.care-faq-actions{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:15px 32px 21px;border-top:1px solid #eee1da}.care-faq-actions a{min-height:58px;display:flex;align-items:center;justify-content:center;gap:10px;color:white;background:#4f7264;border-radius:15px;text-decoration:none}.care-faq-actions a:last-child{background:#b84f16}.care-faq-actions span{display:grid}.care-faq-actions small{font-size:.78rem;font-weight:600;opacity:.85}.care-faq-actions strong{font-size:1rem}
.booking-list-dialog,.cancel-dialog{width:min(760px,calc(100vw - 32px));max-width:min(760px,calc(100vw - 32px))!important;max-height:90vh;overflow-y:auto;color:var(--ink);background:#fffdfb;border-radius:26px}.booking-skeleton{display:grid;gap:12px}.booking-skeleton>*{border-radius:17px}.booking-list{padding:0 24px}.booking-list__item{min-height:112px;padding:16px 8px}.booking-date{width:58px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#a44820;background:#fff0e9;border-radius:16px}.booking-date strong{font-size:1.35rem}.booking-date small{font-size:.75rem}.booking-list__title{margin-bottom:5px;font-size:1.08rem;font-weight:800}.booking-list__side{align-items:flex-end;gap:8px}.booking-list__side :deep(.q-badge){padding:7px 10px;font-weight:700}.status-success{color:#2f6652;background:#dff1e8}.status-waiting{color:#765020;background:#fff0cd}.status-warning{color:#8e3e31;background:#f8dfdb}.status-muted{color:#695b56;background:#eae5e2}.booking-empty{padding:36px;text-align:center;color:#8b756d}.booking-empty h3{margin:10px 0 4px;color:var(--ink)}.booking-empty p{margin:0}.cancel-dialog__body{display:grid;gap:16px;padding:12px 32px 26px}.cancel-dialog :deep(.q-field__control){border-radius:16px}.refund-note{display:flex;align-items:flex-start;gap:10px;padding:15px;color:#315f4c;background:#e5f3ec;border-radius:16px}.refund-note.warning{color:#8d3f32;background:#fce7e2}.cancel-actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 32px 24px;border-top:1px solid #eee1da}.cancel-confirm,.completion-confirm{min-height:44px;padding:0 18px;color:white;background-color: #f7941d;border-radius:13px}.completion-dialog .journal-fixed{margin:0 24px}.completion-dialog .refund-note{margin:0 24px 8px}
.booking-progress-dialog{width:min(700px,calc(100vw - 32px));max-width:min(700px,calc(100vw - 32px))!important;max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;color:var(--ink);background:#fffdfb;border-radius:26px}.booking-progress-dialog>.detail-dialog__heading{flex:none;padding-bottom:20px}.booking-progress-tabs{flex:none;color:#806a62}.booking-progress-tabs :deep(.q-tab){min-height:52px;font-weight:700}.booking-progress-tabs :deep(.q-tab--active){color:var(--persimmon)}.booking-progress-tabs :deep(.q-tab__indicator){background:var(--persimmon)}.booking-progress-tabs :deep(.q-badge){margin-left:5px;color:white;background:#b84f16}.booking-progress-panels{min-height:350px;max-height:56dvh;overflow-y:auto;background:#fffdfb}.booking-progress-panels :deep(.q-tab-panel){padding:24px 30px}.booking-current-status{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:18px;color:#315f4c;background:#e8f3ed;border:1px solid #d4e8de;border-radius:18px}.booking-current-status>span{width:46px;height:46px;display:grid;place-items:center;color:white;background:#4f7264;border-radius:15px}.booking-current-status div{display:grid;gap:3px}.booking-current-status strong{font-size:1.08rem}.booking-current-status p{margin:0;color:#5d746a;line-height:1.55}.booking-current-status :deep(.q-badge){padding:7px 10px;font-weight:700}.progress-expansion{overflow:hidden;margin-top:16px;border:1px solid #eadbd4;border-radius:16px}.progress-expansion :deep(.q-item){min-height:68px}.progress-expansion :deep(.q-item__label){font-weight:700}.progress-expansion :deep(.q-item__label--caption){margin-top:3px;color:#806a62;font-weight:400}.progress-expansion :deep(.q-timeline){padding:4px 0}.current-progress-label{display:inline-flex;padding:3px 9px;color:#a5441e;background:#fff0e9;border-radius:999px;font-size:.78rem;font-weight:800}.service-address{display:flex;align-items:flex-start;gap:13px;padding:18px;background:#fff6f1;border:1px solid #eadbd4;border-radius:17px}.service-address>span{width:44px;height:44px;display:grid;place-items:center;flex:none;color:#a54820;background:#ffe6da;border-radius:14px}.service-address>div{display:grid;gap:4px}.service-address small{color:#806a62}.service-address strong{font-size:1.02rem;line-height:1.55}.booking-progress-dialog .map-panel{margin:0;border-radius:0}.booking-progress-dialog .map-panel iframe{height:270px}.booking-progress-dialog>.q-card__actions{flex:none;padding:10px 20px 16px}
.care-notifications__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.care-notifications__heading h3{margin:0;font-size:1.15rem}.care-notifications__heading p{margin:4px 0 0;color:#806a62}.care-notifications__heading :deep(.q-badge){padding:6px 10px;color:#77431e;background:#ffe5c2}.care-notification-list{overflow:hidden;border-color:#eadbd4;border-radius:17px}.care-notification-list :deep(.q-item){min-height:82px;padding:12px 15px}.care-notification-list :deep(.q-item.unread){background:#fff7ed}.care-notification-list :deep(.q-item__label){font-weight:700}.care-notification-list :deep(.q-item__label--caption){margin-top:3px;color:#806a62;font-weight:400;line-height:1.45}.care-notification-list :deep(.q-item__section--side){display:flex;align-items:center;flex-direction:row;gap:7px}.care-notification-list :deep(.q-item__section--side .q-badge){color:white;background:#b84f16}.care-notification-icon{width:40px;height:40px;display:grid;place-items:center;color:#a54820;background:#ffe8dc;border-radius:13px}
.detail-dialog{width:min(880px,calc(100vw - 40px));max-width:min(880px,calc(100vw - 40px))!important;max-height:90vh;overflow-y:auto;color:var(--ink);background:#fffdfb;border-radius:26px}.detail-dialog__heading{display:flex;align-items:center;justify-content:space-between;padding:28px 32px 18px}.detail-dialog__heading small{color:var(--persimmon);font-weight:700;letter-spacing:.08em}.detail-dialog__heading h2{margin:5px 0 0;font-size:1.9rem}.detail-dialog__close{min-width:44px;min-height:44px;display:grid;place-items:center;color:var(--wood);background:#fff5f0;border:0;border-radius:14px;cursor:pointer}.detail-dialog__body{padding:10px 32px 24px}.profile-detail{display:grid;grid-template-columns:230px 1fr;gap:22px}.profile-photo{overflow:hidden;min-height:230px;background:#f5ebe6;border-radius:22px}.profile-photo :deep(.q-img){height:100%;margin:0;border-radius:22px}.profile-photo__empty{height:100%;min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#8b7067}.detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.detail-grid>div,.reminder-grid>div,.address-detail>div{display:flex;flex-direction:column;gap:5px;padding:15px;background:#fff6f1;border-radius:15px}.detail-grid span,.reminder-grid span,.address-detail span{color:#8a7067}.detail-grid strong,.reminder-grid strong,.address-detail strong{font-size:1rem;line-height:1.55}.detail-photo-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.detail-photo-strip :deep(.q-img){overflow:hidden;margin:0;border-radius:16px}.reminder-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.reminder-grid .wide{grid-column:1/-1}.address-detail{display:grid;grid-template-columns:1fr 1fr;gap:14px}.address-detail span{display:flex;align-items:center;gap:7px}.map-panel{overflow:hidden;margin-top:18px;background:#f4e8e1;border-radius:20px}.map-panel iframe{width:100%;height:310px;display:block;border:0}.map-panel a{min-height:50px;display:flex;align-items:center;justify-content:center;gap:8px;color:white;background:#6e5750;font-weight:700;text-decoration:none}.emergency-detail{display:grid;grid-template-columns:80px repeat(3,1fr);align-items:center;gap:12px;padding:20px;background:#fff5ef;border-radius:20px}.emergency-detail__icon{width:68px;height:68px;display:grid;place-items:center;color:#a8461d;background:#ffe3d8;border-radius:21px}.emergency-detail>div{display:flex;flex-direction:column;gap:5px}.emergency-detail small{color:#8d746b}.emergency-detail strong{font-size:1.08rem}.detail-note{display:flex;align-items:flex-start;gap:9px;margin-top:14px;padding:15px;color:#3c6454;background:#e9f4ee;border-radius:15px}.line-dialog{width:min(460px,calc(100vw - 28px));padding:26px;text-align:center;color:var(--ink);background:#fffdfb;border-radius:28px}.line-dialog__mark{width:84px;height:84px;display:grid;place-items:center;margin:0 auto;color:white;background:#4f8a5b;border-radius:27px;box-shadow:0 14px 30px rgb(79 138 91 / 24%)}.line-dialog__copy small{color:#4f7659;font-weight:700;letter-spacing:.1em}.line-dialog__copy h2{margin:7px 0 16px;font-size:1.75rem;line-height:1.35}.line-dialog__copy p{margin:0;color:#816a62}.line-dialog__copy strong{display:block;margin:4px 0 18px;font-size:1.45rem}.line-dialog__copy a{min-height:50px;display:flex;align-items:center;justify-content:center;gap:8px;color:white;background:#3f7d4d;border-radius:15px;font-weight:700;text-decoration:none}
.detail-dialog__close{color:var(--chestnut)}
.detail-actions{display:flex;justify-content:space-between;padding:0 26px 22px}.soft-delete-button{min-height:44px;color:#8d4b38;background:#fff0eb;border-radius:13px}.picker-dialog{width:min(470px,calc(100vw - 28px));padding:12px;color:var(--ink);background:#fffdfb;border-radius:25px}.picker-dialog small{color:var(--persimmon);font-weight:700;letter-spacing:.08em}.picker-dialog h2{margin:4px 0 8px;font-size:1.65rem}.picker-dialog p{margin:0;color:#7d675f}.picker-dialog :deep(.q-field__control){min-height:60px;border-radius:16px}.picker-actions{display:flex;justify-content:space-between;padding:12px 16px 16px}.delete-dialog{width:min(430px,calc(100vw - 28px));padding:24px;text-align:center;color:var(--ink);background:#fffdfb;border-radius:26px}.delete-dialog__icon{width:72px;height:72px;display:grid;place-items:center;margin:0 auto;color:#985039;background:#ffe7df;border-radius:23px}.delete-dialog h2{margin:0 0 9px;font-size:1.55rem}.delete-dialog p{margin:0;color:#765f57;line-height:1.7}.soft-delete-confirm{color:white;background:#a94d2d;border-radius:13px}.calculator-dialog{width:min(980px,calc(100vw - 48px));max-width:min(980px,calc(100vw - 48px))!important;max-height:92vh;overflow-y:auto;padding:20px;color:var(--ink);background:#fffdfb;border-radius:28px}.calculator-dialog__heading{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 16px}.calculator-dialog__heading small{color:var(--persimmon);font-weight:700;letter-spacing:.08em}.calculator-dialog__heading h2{margin:4px 0 0;font-size:1.9rem}.calculator-dialog__heading button{flex:0 0 48px;width:48px;height:48px;display:grid;place-items:center;color:var(--chestnut);background:#fff2ec;border:0;border-radius:14px;cursor:pointer}.calculator-dialog>.q-card__section:last-child{padding:18px 16px 20px}
a:focus-visible,button:focus-visible{outline:3px solid #ee9b84;outline-offset:3px}
.feature-title{min-width:0;display:flex;flex-direction:column;gap:3px}.feature-title small{color:rgb(255 255 255 / 78%);font-size:.78rem}
.booking-list-dialog,.cancel-dialog,.journal-dialog{width:min(820px,calc(100vw - 32px));max-width:min(820px,calc(100vw - 32px))!important}
.booking-filters{display:grid;grid-template-columns:1fr 210px;gap:12px;padding:4px 32px 14px}.booking-filters :deep(.q-field__control),.journal-body :deep(.q-field__control){border-radius:15px}
.journal-dialog{max-height:90vh;overflow-y:auto;color:var(--ink);background:#fffdfb;border-radius:26px}.journal-body{display:grid;gap:16px;padding:8px 32px 24px}.journal-fixed{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.journal-fixed>div{display:flex;flex-direction:column;gap:4px;padding:14px;background:#fff4ee;border-radius:15px}.journal-fixed>div:last-child{grid-column:1/-1}.journal-fixed span,.journal-rating>span{color:#8a7067;font-size:.85rem}.journal-fixed strong{line-height:1.45}.journal-rating{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;background:#fff7f2;border-radius:15px}.journal-stars{display:flex;gap:4px;color:#e06b24}.journal-stars button{display:grid;padding:3px;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px}.journal-stars button:focus-visible{outline:2px solid #d96b27;outline-offset:2px}.journal-locked{display:flex;align-items:flex-start;gap:10px;padding:14px;color:#35604f;background:#eaf4ef;border-radius:15px;line-height:1.55}
@media(max-width:980px){.overview-grid{grid-template-columns:1fr}.feature-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.booking-filters,.journal-fixed{grid-template-columns:1fr}.journal-dialog{width:calc(100vw - 20px);max-width:calc(100vw - 20px)!important}.journal-body{padding-left:18px;padding-right:18px}.journal-rating{align-items:flex-start;flex-direction:column}}
@media(max-width:700px){.member-shell{padding:16px 12px 48px}.member-hero{align-items:flex-start;padding:26px 20px;border-radius:24px}.member-avatar{width:62px!important;height:62px!important}.member-status{display:none}.overview-grid{margin-top:16px}.feature-grid{grid-template-columns:1fr;gap:17px}.features-section{padding-top:48px}.section-heading p{display:none}.section-heading h2{font-size:2rem}.support-banner{align-items:flex-start;flex-wrap:wrap;padding:24px 20px}.support-banner button{width:100%;margin-left:0}.overview-card{padding:18px}.member-profile h1{font-size:1.85rem}.profile-detail,.detail-grid,.reminder-grid,.address-detail,.emergency-detail{grid-template-columns:1fr}.profile-photo{min-height:auto;aspect-ratio:1.35}.emergency-detail__icon{margin-bottom:4px}.detail-dialog,.calculator-dialog,.booking-list-dialog,.booking-progress-dialog,.cancel-dialog{width:calc(100vw - 20px);max-width:calc(100vw - 20px)!important;padding:8px;border-radius:22px}.detail-dialog__heading,.detail-dialog__body,.cancel-dialog__body{padding-left:18px;padding-right:18px}.booking-progress-panels{min-height:330px;max-height:54dvh}.booking-progress-panels :deep(.q-tab-panel){padding:18px 12px}.booking-current-status{grid-template-columns:auto 1fr}.booking-current-status :deep(.q-badge){grid-column:2}.booking-progress-tabs :deep(.q-tab){padding:0 7px;font-size:.88rem}.booking-list{padding:0 10px}.booking-list__item{align-items:flex-start;flex-wrap:wrap}.booking-list__side{width:100%;flex-direction:row;align-items:center;justify-content:flex-end}.detail-actions,.picker-actions{align-items:stretch;flex-direction:column-reverse;gap:8px}.detail-actions>*{width:100%}.overview-card--selector{align-items:flex-start}.overview-card--selector .overview-card__icon{margin-top:4px}.overview-add{margin-top:6px}}
@media(max-width:700px){.long-term-care-dialog,.care-faq-dialog{width:calc(100vw - 20px);max-width:calc(100vw - 20px)!important;padding:8px;border-radius:22px}.long-term-care-body,.care-faq-body{padding-left:18px;padding-right:18px}.long-term-care-heading h2,.care-faq-heading h2{font-size:1.5rem}.long-term-care-actions,.care-faq-actions{grid-template-columns:1fr;padding:12px 18px 18px}.care-faq-compare{grid-template-columns:1fr}.care-faq-section-title{align-items:start;flex-direction:column;gap:3px}.care-faq-answer{padding-left:18px}}
.manageable-bookings{display:grid;gap:12px}.manageable-booking{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 18px;background:#fff7f2;border:1px solid #eadbd3;border-radius:18px;cursor:pointer;transition:border-color .2s ease,background-color .2s ease}.manageable-booking:hover,.manageable-booking.selected{background:#fff0e9;border-color:#e98a6f}.manageable-booking>div:first-child{min-width:0;display:flex;flex-direction:column;gap:4px}.manageable-booking strong{font-size:1.05rem}.manageable-booking span,.manageable-booking small{color:#836d65}.manageable-booking small{font-size:.82rem}.manageable-booking__actions{display:flex;gap:10px;flex-shrink:0}.manageable-booking__actions :deep(.q-btn){min-height:44px;padding:0 16px;border-radius:13px}.cancel-task-button{color:#fff;background:#a94835}.change-heading{display:flex;flex-direction:column;gap:4px;margin-top:4px;padding:15px 17px;color:#684e45;background:#f3e7e1;border-radius:15px}.change-heading small{color:var(--persimmon);font-weight:700}.cancellation-heading{background:#fce9e5}.booking-empty.compact{padding:28px 16px}.booking-empty.compact h3{font-size:1.05rem}
@media(max-width:600px){.manageable-booking{align-items:stretch;flex-direction:column}.manageable-booking__actions{display:grid;grid-template-columns:1fr 1fr}.manageable-booking__actions :deep(.q-btn){width:100%}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
.completion-confirm{min-height:46px;padding:0 20px;font-weight:800;box-shadow:0 9px 20px rgb(217 107 39 / 20%)}
.completion-confirm:hover{background:#bd531d}
.journal-dialog{max-height:90dvh;display:flex;flex-direction:column;overflow:hidden}
.journal-body{min-height:0;overflow-y:auto;overscroll-behavior:contain}
.journal-dialog>.cancel-actions{flex:0 0 auto;background:#fffdfb}
.journal-stars button{min-width:44px;min-height:44px;place-items:center;padding:0}
.rating-dialog{width:min(680px,calc(100vw - 28px));max-height:90vh;overflow-y:auto;color:var(--ink);background:#fffdfb;border-radius:26px}
.rating-loading,.rating-summary{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 32px 30px;text-align:center}
.rating-summary>strong{color:var(--chestnut);font-size:4rem;line-height:1}
.rating-summary__stars{display:flex;gap:5px;color:#e06b24}
.rating-summary p{margin:4px 0 0;font-size:1.1rem;font-weight:800}
.rating-summary small{max-width:390px;color:#806a62;line-height:1.65}
.journal-status{display:grid;gap:10px;padding:14px 16px;background:#fff7f2;border-radius:15px}.journal-status>span{color:#8a7067;font-size:.85rem}.journal-status :deep(.q-option-group){display:flex;flex-wrap:wrap;gap:8px 16px}.journal-status :deep(.q-radio){min-height:44px;margin:0}.journal-submit-button{min-width:170px;font-weight:800;box-shadow:0 10px 22px rgb(197 84 24 / 18%)}
.rating-detail-list{width:100%;display:grid;gap:10px;margin-top:18px;text-align:left}.rating-detail-card{padding:15px 16px;background:#fff6f1;border:1px solid #eddfd8;border-radius:16px}.rating-detail-card__heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.rating-detail-card__heading>span{color:#b34d20;font-size:.82rem;font-weight:800}.rating-detail-card__heading>div{display:flex;color:#d96b27}.rating-detail-card>strong{display:block;margin-top:7px;color:var(--ink);font-size:1rem}.rating-detail-card>p{margin:5px 0 0;color:#6e5750;line-height:1.6}.rating-empty{width:100%;margin-top:16px;padding:14px;color:#806a62;background:#fff6f1;border-radius:14px}
@media(max-width:700px){.journal-dialog>.cancel-actions{padding:12px 18px 18px}.journal-dialog>.cancel-actions :deep(.q-btn){flex:1}}
.care-combo-dialog{width:min(920px,calc(100vw - 32px));max-width:min(920px,calc(100vw - 32px))!important;max-height:92dvh;overflow-y:auto;color:var(--ink);background:#fffdfb;border-radius:26px}.care-combo-heading p{margin:6px 0 0;color:#806a62}.care-combo-loading,.care-combo-body{display:grid;gap:16px;padding:6px 32px 24px}.care-combo-loading>*{border-radius:20px}.care-combo-card{padding:20px;background:#fff;border:1px solid #eadbd3;border-radius:22px;box-shadow:0 10px 28px rgb(78 52 43 / 7%)}.care-combo-profile{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:15px}.care-combo-avatar{color:#9b4b29;background:#fff0e9}.care-combo-profile>div{display:grid;gap:4px}.care-combo-profile strong{font-size:1.25rem}.care-combo-profile>.q-badge{padding:7px 11px;color:#35604f;background:#e6f2ec;font-weight:800}.care-combo-rating{display:flex;align-items:center;gap:5px;color:#c35a1d;font-weight:800}.care-combo-rating small{color:#806a62;font-weight:500}.care-combo-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.care-combo-facts>div{display:grid;gap:4px;padding:13px 15px;background:#fff6f1;border-radius:14px}.care-combo-facts span,.care-combo-services>span,.care-combo-slots__title>span{color:#806a62;font-size:.85rem}.care-combo-services{margin-top:15px}.care-combo-services>div{display:flex;flex-wrap:wrap;margin-top:5px}.care-combo-services :deep(.q-chip){color:#664d44;background:#f3e7e1}.care-combo-slots{margin-top:14px;padding:15px;background:#f0f6f3;border-radius:17px}.care-combo-slots__title{display:flex;align-items:center;justify-content:space-between}.care-combo-slots__title :deep(.q-btn){min-height:44px;color:#416b59}.care-combo-slot-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.care-combo-slot-list button{min-height:48px;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;color:#4f665d;background:#fff;border:1px solid #cbded4;border-radius:12px;cursor:pointer}.care-combo-slot-list button.selected{color:#fff;background:#4f7264;border-color:#4f7264}.care-combo-slots>p{margin:8px 0 0;color:#725c54}.care-combo-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px;padding-top:16px;border-top:1px solid #eee1da}.care-combo-actions :deep(.q-btn){min-height:44px;padding:0 15px;border-radius:12px}.care-combo-actions :deep(.q-btn:last-child){color:#fff;background:#c55418}.care-combo-actions :deep(.q-btn--disabled){background:#ddd2cd}
@media(max-width:700px){.care-combo-dialog{width:calc(100vw - 20px);max-width:calc(100vw - 20px)!important;border-radius:22px}.care-combo-body,.care-combo-loading{padding:4px 14px 18px}.care-combo-card{padding:16px}.care-combo-profile{grid-template-columns:auto 1fr}.care-combo-profile>.q-badge{grid-column:2;width:max-content}.care-combo-facts{grid-template-columns:1fr}.care-combo-slot-list{grid-template-columns:1fr 1fr}.care-combo-actions{display:grid;grid-template-columns:1fr 1fr}.care-combo-actions :deep(.q-btn:last-child){grid-column:1/-1}}
@media(max-width:420px){.care-combo-slot-list,.care-combo-actions{grid-template-columns:1fr}.care-combo-actions :deep(.q-btn:last-child){grid-column:auto}.care-combo-heading p{display:none}}
</style>
