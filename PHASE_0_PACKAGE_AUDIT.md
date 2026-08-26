# 照安心預約套件第一階段研究

研究日期：2026-08-25

本階段只盤點與決策，未安裝套件、未修改 API、Schema、登入、角色、通知或 GPS 流程。

## 決策摘要

| 題目 | 決策 |
|---|---|
| FullCalendar vs QCalendar | **選 QCalendar** |
| Day.js | **暫不加入**；目前 `Date`、`Intl.DateTimeFormat` 與 Quasar 日期元件足以支撐第一個日曆 MVP |
| Zod | **不加入**；沿用已安裝且已形成共用錯誤處理的 Yup |
| Redis / BullMQ | **暫不導入**；Render 技術上適合，但可靠 queue 需要付費持久化 Key Value 與付費 background worker |
| Socket.IO 與登入整合 | **沿用現有 Socket.IO + JWT**；下一步把全域失效通知縮到伺服器核准的 `user:{userId}` room |

## A. Existing Stack

### 前端

- Vue 3.5、TypeScript 6、Quasar 2.23、`@quasar/app-vite` 3.3、Pinia、Vue Router。
- 已有 `socket.io-client` 4.8，`live-sync-store.ts` 會用 sessionStorage 的 Access Token 建立連線。
- 已有 Quasar `QDate` 與原生 `input[type=date|datetime-local]`，日期顯示主要使用 `Date`、`Intl.DateTimeFormat`。
- 已有 GSAP；沒有 Day.js、date-fns、Luxon、Moment、FullCalendar、QCalendar、MapLibre。
- 已有瀏覽器 Geolocation 封裝與 GPS 分享狀態；尚未有地圖渲染套件。

### 後端

- Express 5、Mongoose 9、MongoDB、JWT、Passport。
- 已有 `socket.io` 4.8，握手時驗證既有 JWT，並再次確認帳號為 `ACTIVE`。
- 已有 Yup，Authentication、Nurse、Admin 的輸入驗證已使用它，錯誤也接入共用 error handler。
- Booking 路由仍以手寫 guard 為主；Mongoose Schema 提供 enum、required 等資料層驗證。
- 已有 Playwright E2E；沒有 Redis、BullMQ、cron 或獨立 worker。

### 現有核心資料可直接供日曆使用

`Booking` 已有 `scheduledStartAt` 與 `scheduledEndAt`，也已有 `requesterUserId`、`caregiverId`、`recipientId`、`serviceTypeIds`、`status`。Calendar Event 只需在前端或 API adapter 轉成：

```ts
{
  id: booking._id,
  start: booking.scheduledStartAt,
  end: booking.scheduledEndAt,
  title: `${recipientName}・${serviceNames}`
}
```

**不需要修改 Booking Schema，也不需要 migration。**

## B. Missing Capabilities

真正缺少的能力依序是：

1. 居服員可讀的日／週班表視圖；現在只有 `QDate + 列表`。
2. Booking API 一致的 request validation；不是缺 Zod，而是 Booking 尚未套用既有 Yup。
3. 即時事件的收件者隔離；現在事件不含個資，但所有已登入 client 都會收到並重抓 API。
4. Token 更新後的 Socket 重新連線；目前 Access Token 過期或 `connect_error` 後會直接斷線，只剩 60 秒輪詢。
5. 可靠的延遲提醒／逾時改派；目前沒有 queue，但產品流程也尚未定義完整重試與補償規則。

不是目前缺口：新的 Authentication、Booking Schema、通知資料模型、GPS 收集、動畫框架、E2E framework。

## C. Package Comparison

| 功能 | 候選套件 | 是否推薦 | 理由 | 修改風險 | 優先度 |
|---|---|---:|---|---|---|
| 班表 Calendar | QCalendar | **是** | MIT；Vue 3 / Quasar Vite；日、週、月、Agenda、Resource、Scheduler、Task 均可用；目前 v5 與專案 `@quasar/app-vite >=3` 相容 | 中：需控制 mobile 密度與事件轉換 | P1 |
| 班表 Calendar | FullCalendar | 否 | Vue 3、TypeScript 與標準日／週／月／列表都成熟，但 Resource Timeline / Scheduler 是 Premium；目前需求用 QCalendar 免費功能即可 | 中：非 Quasar 視覺整合，Premium 路線有授權成本 | — |
| 日期時間 | Day.js | 暫不推薦 | 現有格式化、比較與排序可由原生 `Date` / `Intl` 完成；現在導入只會形成第二套日期規則 | 中：混用 local time / UTC 的風險不會因換 library 自動消失 | P2（有明確 timezone/relative-time 需求才重評） |
| Validation | Yup | **沿用** | 已安裝、已有多個 schema 與共用錯誤處理；補 Booking schema 是最小且一致的改動 | 低 | P1 |
| Validation | Zod | 否 | 與 Yup 重疊，導入會形成兩套 validation layer，無法保護既有 API | 中 | — |
| 即時同步 | Socket.IO | **沿用並收斂** | 前後端已安裝，JWT 握手已正確使用伺服器驗證的 `userId`；只需補 rooms 與 token refresh reconnect | 中：錯誤 room 授權可能洩漏狀態 | P0 |
| 延遲工作 | BullMQ + Render Key Value | 暫緩 | Render 官方支援 BullMQ worker 與 Redis-compatible Key Value；但免費 Key Value 不持久，background worker 無 free plan，不適合作為可靠提醒的免費方案 | 高：新增持久服務、worker、重試與監控 | P3 |
| 地圖 | MapLibre | 暫緩 | 現有 GPS consent、狀態與位置 API 先保留；完成可視權限與保存政策後才需要畫地圖 | 高：隱私與地圖資源成本 | P3 |
| 動畫 | GSAP | 已有，不擴充 | 已安裝；不影響預約 business logic | 低 | — |
| E2E | Playwright | 已有，擴充 | 不建立第二套 E2E framework | 低 | 每 Phase |

### 為什麼選 QCalendar

- 專案精確符合 QCalendar v5 的 Vue 3、Quasar、Vite 與 Node 需求。
- MIT 免費版已包含目前需要的 Day / Week / Month / Agenda / Resource / Scheduler；不必碰付費能力。
- 第一個 MVP 只做「居服員我的班表」，沿用現有 `NurseWorkspacePage` 的資料與 Quasar 視覺語言。
- 手機預設不硬塞七欄月曆：小螢幕用 agenda/day，桌面才顯示 week；保留至少 44px 點擊目標，事件點擊開既有 Booking dialog。

FullCalendar 標準版也是 MIT 且支援 Vue 3/TypeScript，但 Resource Timeline 與資源欄視圖屬 Premium。照安心目前不需要用一個付費路線取代 QCalendar 已免費提供的能力。

參考：[QCalendar package / releases](https://www.npmjs.com/package/@quasar/quasar-ui-qcalendar)、[FullCalendar Vue 3](https://fullcalendar.io/docs/vue)、[FullCalendar Premium](https://fullcalendar.io/docs/premium)。

## D. Recommended Stack

本輪真正推薦的新增 dependency 只有：

- `@quasar/quasar-ui-qcalendar`（進入 P1 實作時才安裝）

沿用、不新增：

- 日期：原生 `Date`、`Intl.DateTimeFormat`、Quasar date utils / components。
- 驗證：Yup + Mongoose validation。
- 即時：既有 Socket.IO。
- 測試：既有 Playwright、TypeScript、Build scripts。

暫不加入：Day.js、Zod、BullMQ、Redis client、MapLibre、其他 UI framework。

## Socket.IO 與目前登入權限的整合方案

目前做對的部分：

- client 用 `auth.token` 傳既有 Access Token。
- server 用同一個 JWT secret 驗簽，不相信 client 傳來的 userId / role。
- server 再查 `User.status === ACTIVE`。
- Socket 只傳「資料有變」，完整 Booking / GPS / Notification 仍由既有受權限保護的 API 取得。

P0 最小修正方向：

1. 握手驗證成功後，由 server 執行 `socket.join('user:' + payload.userId)`；ADMIN 可額外加入 `role:ADMIN`。
2. Booking 異動後，從 server 已查到的 Booking 取得 requester 與 caregiver account user id，只對這些 `user:*` rooms 發 `booking:changed`。
3. 不讓 client 自行要求加入任意 `booking:{id}`。若未來需要 booking room，server 必須先重用 `canView` 等效授權後才可加入。
4. 前端在 Access Token refresh / login 後更新 `socket.auth` 並 reconnect；logout 時 disconnect。
5. 保留 API refetch 模式，不把 Booking、健康資料或 GPS payload 直接塞進 Socket event。

現況的 `io.emit()` 不直接洩漏資料，因 payload 只有 event name 與時間；但它會讓所有登入者知道系統某類資料剛異動，並造成不必要 API refresh，應列為 P0 收斂項目。

Socket.IO 官方文件支持以 connection middleware 讀取 `handshake.auth` 驗證，並以 server-only rooms 對使用者或 entity 子集合推送：[Authentication middleware](https://socket.io/docs/v4/middlewares/)、[Rooms](https://socket.io/docs/v4/rooms/)。

## Render / Redis / BullMQ 判斷

**Render 適合部署 BullMQ，但目前專案不適合立刻導入。**

可行架構是同區域的：

```text
Web Service (API / producer)
        ↓ internal REDIS_URL
Render Key Value (noeviction + persistence)
        ↑
Background Worker (BullMQ worker)
```

限制：

- 新 Render Key Value 實際為 Redis-compatible Valkey；BullMQ 可連接。
- queue 應用要用 `noeviction`，且可靠提醒需要付費方案的 disk-backed persistence。
- Render Blueprint 明確指出 background worker 沒有 free plan；因此這不是零成本功能。
- worker 必須獨立執行，不能只把 consumer 塞進可能休眠、重啟或水平擴展的 Web Service。
- 在產品先定義逾時、重試、重複執行冪等性與通知補償前，不應建立 queue。

所以 P3 的啟用條件是：「服務前提醒或 2 小時未承接改派」成為確定需求，並接受持續部署成本。屆時先只做一種 job。

參考：[Render Key Value](https://render.com/docs/key-value)、[Render Background Workers](https://render.com/docs/background-workers)、[Render Blueprint plans](https://render.com/docs/blueprint-spec)。

## E. Implementation Order

### P0 — 先保護既有即時權限

- 將 Socket 全域失效事件改成 JWT 身分對應的 user rooms。
- 修正 token refresh 後重連。
- 加一個最小 Socket 權限檢查：無 token 拒絕；Booking 接受事件只有相關 user 收到。

### P1 — 單一 Calendar MVP + Booking Yup

- 安裝 QCalendar。
- 只在居服員工作區製作「我的班表」。
- Booking → Calendar Event adapter；不改 Schema。
- 以現有 Yup 補 Booking create / reschedule trust-boundary validation。
- 桌面 week、手機 agenda/day；event click 使用既有詳情 dialog。

### P2 — 日期規則收斂

- 先抽出 Booking 專用的少量 formatter / parser，避免各頁重複。
- 明確規定 API 傳 ISO UTC，輸入以 Asia/Taipei 解讀，顯示用 `zh-TW`。
- 只有出現 timezone plugin、相對時間、跨時區或大量 calendar arithmetic 時，才重新評估 Day.js。

### P3 — 有付費部署與產品規則後才做 Queue

- Render persistent Key Value + background worker。
- BullMQ 只做一個 booking timeout 或 reminder job。
- MapLibre 仍等 GPS 可視權限與保存政策完成後再評估。

## F. Files Likely To Change

P0：

- `back/src/realtime.ts`
- `back/src/configs/app.ts`（或將 emit 移到已有 Booking 實體的 route；避免 URL regex 無法判斷收件者）
- `front/src/stores/live-sync-store.ts`
- `front/src/stores/auth-store.ts`
- 一個最小 realtime 權限 check/test

P1：

- `front/package.json`、`front/package-lock.json`
- `front/src/pages/NurseWorkspacePage.vue`
- 可選的一個 Booking calendar adapter（只有轉換在第二處重用時才建立）
- `back/src/routes/booking-routes.ts`
- 一個 Booking validation check/test
- `back/tests/e2e/mvp-flow.spec.ts`

P2 不應全 repository 重寫；先只改 Booking 相關頁面。P3 在確認成本前不建立 worker、queue config 或 `render.yaml`。

## 本階段驗證與風險

- 已檢查兩份 `package.json`、lockfiles、Booking Schema / routes、Authentication middleware、Realtime server/client、Nurse/User/Admin Booking 顯示、GPS、Notification 與 Playwright 設定。
- 本階段沒有程式碼或 dependency 變更，因此未執行 build / E2E。
- 最大安全風險：Socket 全域廣播 metadata 與 token 過期後不恢復即時連線。
- 最大資料風險：`datetime-local`、本地 `Date` 與 UTC ISO 的規則尚未集中；Calendar 前必須固定 timezone contract。
- 最大部署風險：免費 Render Key Value 不持久，且 background worker 無 free plan，不能承諾可靠提醒。
- 最大 UI 風險：週/月班表在手機過密；MVP 必須採自適應 view，而不是縮小文字或橫向捲動。
