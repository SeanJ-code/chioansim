# 照安心（chioansim）Phase 0 現況稽核

稽核日期：2026-08-26  
依據：`chioansim_codex_implementation_plan.md`  
範圍：只盤點現有架構、流程與風險；本階段未修改功能、Schema、API 或 UI，也未安裝套件。

## 結論摘要

目前專案已具備可沿用的 Booking 核心閉環：建立預約、居服員確認、出發與 GPS、抵達、開始服務、提出完成、使用者確認、站內通知、JWT Socket room、角色權限與 E2E。現況不需要重建 Booking。

Phase 1 的真正工作不是新增另一套狀態，而是把分散在 Route 的狀態寫入集中到單一 Workflow Service，並補上所有角色都可用的 Booking Audit。現有 `AuditLog` 只適合 ADMIN 管理操作，不能直接視為已完成 Phase 1。

目前最高風險是 `PATCH /bookings/:id` 允許 ADMIN 將 request body 原樣寫入 Booking，可繞過所有流程；其次是取消權限沿用 `canView`，沒有檢查關係人的 `canCancelBooking`。

---

# A. Existing Architecture

## A.1 Backend

```text
Express app
  ├─ authenticate / authorize
  ├─ routes（目前包含大部分 Booking business logic）
  ├─ Mongoose models
  ├─ booking-policy / booking-validation / datetime utils
  ├─ Notification
  ├─ Socket.IO user rooms
  └─ Playwright E2E + 小型 assert checks
```

- 技術：Node.js、TypeScript、Express 5、Mongoose 9、MongoDB、JWT、Refresh Token、Socket.IO、Yup。
- API 同時保留 `/api/...` 與無 `/api` 的相容路徑。
- Booking 尚無 Controller / Domain Service；主要流程集中在 `back/src/routes/booking-routes.ts`。
- 全站錯誤由 `back/src/utils/http.ts` 統一處理，已涵蓋 400、401、403、404、409 與 500，但尚未建立規格中的錯誤 `code` 與 422 業務錯誤格式。
- Booking 建立與改期已有 Yup 驗證；其他狀態操作仍多為 route 內手寫 guard。

## A.2 現有 Booking Schema

位置：`back/src/models/index.ts`

| 類別 | 現有欄位 |
|---|---|
| 識別 | `bookingNumber`、`serviceRequestId` |
| 關係 | `requesterUserId`、`recipientId?`、`caregiverId`、`serviceTypeIds[]` |
| 排程 | `scheduledStartAt`、`scheduledEndAt?`、`serviceAddress` |
| 狀態 | `status`、`attendanceStatus` |
| 時間戳 | `acceptedAt`、`departedAt`、`arrivedAt`、`serviceStartedAt`、`completionRequestedAt`、`completedAt`、`cancelledAt` |
| GPS | `latestLocation`、`locationSharingStoppedAt`、ETA / 距離 / 時長 |
| 取消 | `cancellationReason`、`cancellationRefundEligible` |
| 相容資料 | `hidden`、`hiddenAt`、`hiddenByUserId` |

現有狀態：

```text
PENDING
ACCEPTED
DEPARTED
ARRIVED
WAITING_DECISION
IN_SERVICE
AWAITING_USER_CONFIRMATION
COMPLETED
CANCELLED
ABANDONED
```

對規格 Canonical State 的建議對照：

| 現有狀態 | Canonical 意義 |
|---|---|
| `PENDING` | 現況同時代表已建立、已指定居服員、等待居服員確認；Phase 1 先保留，不拆 enum |
| `ACCEPTED` | `ACCEPTED` / `SCHEDULED` 的既有合併狀態 |
| `DEPARTED` | `CAREGIVER_EN_ROUTE` |
| `ARRIVED` | `ARRIVED` |
| `WAITING_DECISION` | 傷況／負面場景等待下單者決定的既有例外狀態 |
| `IN_SERVICE` | `IN_SERVICE` |
| `AWAITING_USER_CONFIRMATION` | `PENDING_CONFIRMATION` |
| `COMPLETED` | `COMPLETED` |
| `CANCELLED` | `CANCELLED` |
| `ABANDONED` | 居服員棄單；未來應映射到改派或取消例外流程 |

## A.3 現有 Booking API

所有 `/bookings` 路由先經 `authenticate`。

| Method | Path | 角色／用途 | 現況 |
|---|---|---|---|
| GET | `/bookings` | 依角色列出案件 | 已依 USER / PATIENT / NURSE / ADMIN 篩選 |
| POST | `/bookings` | 建立 ServiceRequest + Booking | 已驗證時段、照護者權限、服務項目、重疊；Booking 建立時已指定 caregiver |
| GET | `/bookings/:id` | 讀取單筆 | 使用共用 `canView` |
| POST | `/bookings/:id/accept` | 居服員確認 | 以條件式 `findOneAndUpdate` 原子限制 `PENDING → ACCEPTED` |
| PATCH | `/bookings/:id` | ADMIN 通用更新 | 高風險：request body 可直接改狀態與其他欄位 |
| DELETE | `/bookings/:id` | 軟隱藏 | 案件可查看者皆可隱藏 |
| POST | `/bookings/:id/depart` | 出發並啟用位置 | `ACCEPTED → DEPARTED` |
| PATCH | `/bookings/:id/location` | 更新最新位置 | 僅 `DEPARTED / ARRIVED` |
| POST | `/bookings/:id/location/stop` | 停止位置 | 無狀態 guard |
| POST | `/bookings/:id/arrive` | 抵達 | `DEPARTED → ARRIVED` |
| POST / GET | `/bookings/:id/injuries` | 傷況紀錄 | 異常時直接寫入 `WAITING_DECISION` |
| PATCH | `/bookings/:id/injuries/:reportId/decision` | 繼續／取消 | `WAITING_DECISION → ARRIVED / CANCELLED`，但未集中驗證目前狀態 |
| POST | `/bookings/:id/start` | 開始服務 | `ARRIVED → IN_SERVICE`，並停止 GPS |
| POST | `/bookings/:id/request-completion`、`/complete` | 居服員提出完成 | `IN_SERVICE → AWAITING_USER_CONFIRMATION` |
| POST | `/bookings/:id/confirm-completion` | 使用者確認完成 | `AWAITING_USER_CONFIRMATION → COMPLETED`，並建立 `ServiceRecord` |
| POST | `/bookings/:id/abandon` | 居服員棄單 | 目前缺少允許狀態限制 |
| POST | `/bookings/:id/cancel` | 取消 | 有終態 guard 與退款資格判斷 |
| PATCH | `/bookings/:id/reschedule` | 改期 | `PENDING / ACCEPTED → PENDING` |

## A.4 Notification

- Model：`back/src/models/notification.ts`。
- 現有欄位為 `recipientUserId`、`type`、`title`、`message`、`bookingId?`、`channel`、`status`、`attempts`、`sentAt`、`readAt`。
- 已有查詢、單筆已讀與「全部 Booking 通知已讀」API。
- 前端 `UsersPage.vue` 由最多 100 筆通知自行計算未讀數。
- 打開進度 Dialog 時會呼叫 `/notifications/booking/read`，將該使用者所有 Booking 通知標成已讀；與新規格「只標記本次成功載入並展示的 IDs」不符。
- `features` 的初始 badge 仍寫有 `0 則未讀`，雖然後續會依 computed 值更新，仍應在 Phase 4 收斂為單一資料來源。

## A.5 Realtime / Socket

- Server 在 Socket handshake 驗證 JWT，並再次確認 User 為 `ACTIVE`。
- 連線只由 server 加入 `user:{userId}`，client 不能自行選擇 room。
- `emitBookingRealtime()` 由 Booking 關係推導 requester、caregiver account、recipient account 與可查看關係人。
- Payload 只有 `{ changedAt }`，完整資料由前端重抓 API，沒有透過 Socket 傳個資。
- 現有事件名稱：`booking:changed`、`alert:changed`、`location:changed`；尚未對齊規格最終命名。
- 前端登入／refresh 會更新 socket token 並 reconnect；logout 會 disconnect；頁面 `start()` 先 `stop()`，可避免同一 store 重複 listener。
- 仍保留 60 秒輪詢作為斷線備援。

## A.6 GPS

- GPS 目前存於 `Booking.latestLocation` 與 `CaregiverProfile.currentLocation`，尚無 `gpsSessions` / `gpsLocations`。
- 前端使用 Browser Geolocation；開始分享必須先取得同意，後端也要求每次 payload 的 `consent === true`。
- 前端最多每 10 秒上傳一次。
- 允許更新狀態為 `DEPARTED`、`ARRIVED`；開始服務、提出完成、取消時會清除位置。
- 目前只保存最新點位，沒有軌跡與 session stop reason；符合 Phase 0 可沿用現況，Phase 3 再拆 collection。

## A.7 Authentication / Permission

- 角色：`USER`、`PATIENT`、`NURSE`、`ADMIN`。
- `authenticate` 驗 JWT、期限與帳號 ACTIVE 狀態；`authorize` 驗角色。
- `canView` 允許 ADMIN、下單者、指定居服員、Recipient 登入帳號、具 `canViewRecord` 關係人。
- 前端 route meta 只做導頁體驗；實際 API 仍由後端驗證，方向正確。
- 尚無 `SUPERVISOR / FINANCE / COMPLIANCE`；依規格不應在 Phase 1 修改 role enum。

## A.8 日期與時區

- 後端已有 `taipeiDateTimeToUtc`、`taipeiDateKey`、`taipeiWeekday`，明確將 UI 時間視為 `Asia/Taipei` 並以 UTC Date 儲存。
- 前端已有 `front/src/utils/datetime.ts` 與 Booking calendar adapter，顯示採 `zh-TW`、`Asia/Taipei`。
- 已有 assert check 驗證台北時間轉 UTC、日期 key、星期與非法日期。
- 部分 Availability 路徑仍直接使用 `new Date(...T00:00:00)` 或 UTC midnight，需在後續 Phase 小範圍收斂，不應全專案重寫。

## A.9 Frontend

### User

- `UsersPage.vue` 已有近期／進行中預約、狀態文案、進度 Dialog、通知、服務資訊、改期、取消、完成確認。
- 進度 Dialog 已採 Tabs 與按需展開，符合「Care first. Status second. Details on demand.」。
- 目前頁面很大，資料、API、Dialog 與 UI 均集中在單檔；Phase 6 才做最小拆分，Phase 1 不碰視覺。

### Caregiver

- `NurseWorkspacePage.vue` 已有摘要、今日／近期任務、班表、位置分享、狀態對應 CTA、完成申請與通知回饋。
- CTA 已依後端現有狀態顯示；合法性最終仍由 API 判斷。
- 已使用 skeleton、44px 以上按鈕、台北時間與 responsive CSS，可沿用。

### Admin

- `AdminDashboardPage.vue` 已有今日預約、進行中、異常、預約列表、詳情 Dialog、Tabs、Stepper、GPS 與 Timeline。
- 現有介面比規格 Phase 7 多一些統計，但不需要先刪除；Phase 1 只應封住後端通用狀態更新。

## A.10 Tests

- `back/tests/e2e/mvp-flow.spec.ts` 已覆蓋：建立 Recipient、預約、接單、GPS 同意、出發、抵達、開始服務、提出完成、低星評價、改期、取消與雙角色讀取。
- 小型 check 已覆蓋：Booking completion policy、退款門檻、GPS 允許狀態、Socket room isolation、Asia/Taipei 轉換、Booking payload validation。
- 尚缺：非法跨狀態、無關角色 ownership、關係人取消權限、同一 Booking 競爭寫入、Audit、使用者確認完成後的完整閉環。

---

# B. Current Booking State Map

## B.1 正常主流程

```text
POST /bookings
  PENDING
    ↓ caregiver accept
  ACCEPTED
    ↓ caregiver depart + GPS consent
  DEPARTED
    ↓ caregiver arrive
  ARRIVED
    ↓ caregiver start
  IN_SERVICE
    ↓ caregiver request completion
  AWAITING_USER_CONFIRMATION
    ↓ user / patient / admin confirm
  COMPLETED
```

## B.2 例外與旁路

```text
ARRIVED（或目前任何可新增 injuries 的案件）
  ↓ injury / negative scene
WAITING_DECISION
  ├─ CONTINUE → ARRIVED
  └─ CANCEL   → CANCELLED

PENDING / ACCEPTED
  ↓ reschedule
PENDING

PENDING / ACCEPTED / DEPARTED / ARRIVED / WAITING_DECISION
  ↓ cancel
CANCELLED

目前任何 assigned 狀態
  ↓ abandon
ABANDONED

任何狀態
  ↓ ADMIN PATCH /bookings/:id
任何 Schema enum 允許的狀態（流程旁路）
```

## B.3 已有的原子保護

- `accept` 使用 `{ caregiverId, status: PENDING }` 的條件式 `findOneAndUpdate`，同一筆 Booking 只能由指定 caregiver 成功一次。
- `depart`、`arrive`、`start`、`request-completion`、`confirm-completion` 也各自用 current status 作為更新條件，可避免大部分重複點擊。
- 但這些 guard 分散在 route；新增入口時很容易漏掉，且 ADMIN 通用 PATCH 已能繞過。

---

# C. Reusable Components

## C.1 可直接沿用

| 能力 | 現有實作 | Phase 1 用法 |
|---|---|---|
| Booking Schema / enum | `back/src/models/index.ts` | 不刪除、不換 collection、不大量改 enum |
| 原子狀態寫入 | 多個 `findOneAndUpdate({ status })` | 移入 Workflow Service，保留相同 API response |
| Booking policy | `back/src/utils/booking-policy.ts` | 擴充成完整 transition guard；不建立重複 helper |
| 輸入驗證 | Yup + `booking-validation.ts` | 沿用，不加 Zod |
| 共用錯誤出口 | `back/src/utils/http.ts` | 讓 Workflow Service 回 409 / 422 可理解錯誤 |
| 站內通知 | `Notification` model | 保留 collection 與現有中文文案 |
| Audit 基礎 | `AuditLog` + `recordAudit` | 向後相容擴充 actor 欄位，不另建第二個 audit collection |
| 即時同步 | JWT Socket + user rooms | DB 成功後 emit；不傳完整 Booking |
| GPS 最新位置 | Booking + caregiver currentLocation | Phase 1 保留，Phase 3 再加入 session |
| 服務成果 | `ServiceRecord` | 保留 unique bookingId，Phase 3 再補提交內容與 incident |
| 日期工具 | 前後端 Taipei utilities | 所有新流程沿用 |
| 前端狀態文案 | User / Nurse / Admin pages | Phase 1 不改 UI；後端 response 相容 |
| 測試方式 | assert checks + Playwright | 新增一個 workflow check 並擴充既有 E2E |

## C.2 不需要新增

- 不需要新狀態管理套件。
- 不需要新 validation 套件。
- 不需要 Redis / queue。
- 不需要新 UI framework。
- 不需要現在拆 GPS collections、Assignment collections、Quote 或 Payment。

---

# D. Compatibility Risks

## D.1 P0 — 進入 Phase 1 前必須處理

1. **ADMIN 可繞過流程**  
   `PATCH /bookings/:id` 將 request body 原樣寫入，能直接 `PENDING → COMPLETED`。Phase 1 應禁止此 route 修改 `status` 與流程時間戳，狀態只能走 Workflow Service。

2. **狀態規則分散**  
   accept、depart、arrive、injury decision、start、complete、confirm、abandon、cancel、reschedule 各自寫 status。任何新 route 都可能形成非法跳轉或漏 Audit。

3. **取消權限過寬**  
   cancel 使用 `canView`；具 `canViewRecord` 的關係人即可能取消，沒有檢查 `canCancelBooking`、關係狀態與授權到期日。

4. **AuditLog 不符合 Booking Audit**  
   現有 Schema 強制 `adminUserId`，欄位語意只涵蓋 ADMIN，無法正確記錄 USER / NURSE actor；Booking 狀態轉換目前完全未寫 Audit。

5. **棄單無狀態限制**  
   assigned caregiver 可從已完成或服務中狀態寫成 `ABANDONED`，且 route 在找不到 Booking 時仍回 200 + null。

## D.2 P1 — Workflow 導入時需一起保護

6. **傷況 decision 未檢查 current status**  
   decision 可把非 `WAITING_DECISION` Booking 改回 `ARRIVED` 或取消。

7. **GPS stop 先清全域位置再確認 Booking**  
   傳入不存在或不屬於自己的 Booking ID 時，仍先清除 caregiver currentLocation；應由集中流程先驗案件再變更。

8. **通知與 Audit 不是同一成功邊界**  
   現況多為先更新 Booking、再建立 Notification；後續步驟失敗可能留下已變更狀態但缺通知／Audit。Phase 1 至少要由同一 Service 統一呼叫順序與錯誤策略。

9. **ServiceRecord 建立時間與提交內容不一致**  
   居服員 `/request-completion` 傳入的 `completedItems` / note 未保存；正式 record 到使用者確認後才從 `serviceTypeIds` 推導。Phase 3 應修正，Phase 1 只維持相容。

10. **Booking 建立時已綁定 caregiver**  
    現有 `PENDING` 不是規格中的公開待派案，而是「已選定 caregiver、等待確認」。Phase 2 應以 optional/default 新欄位與獨立 Assignment 漸進擴充，不能現在把 `caregiverId` 改 optional 造成全站連鎖修改。

## D.3 P2 / P4 / P6 後續風險

11. **資料揭露粒度尚未 DTO 化**  
    Booking API populate 完整 Recipient，`canViewRecord` 與 `canViewMedicalNotes` 尚未分層；Caregiver dashboard 也直接回傳多個 populate 欄位。後續需建立角色別 DTO。

12. **通知已讀行為不符合規格**  
    現況一次標記所有 Booking 通知；應改為傳 `notificationIds`，並由後端回 unread count。

13. **Socket 命名尚未收斂**  
    現況安全但名稱與最終規格不同；若更名需先同時支援舊 listener，再逐步移除，不能一次切換。

14. **前端頁面過大**  
    `UsersPage.vue`、`NurseWorkspacePage.vue`、`AdminDashboardPage.vue` 各自承擔大量 API 與 Dialog。Phase 6 只拆確實重用的 API / composable / component，不應先做全面重構。

15. **日期儲存路徑未完全一致**  
    Booking 已用 Taipei utility；Availability 部分仍直接建 Date。未來排班與媒合前需先固定同一 contract。

---

# E. Recommended Phase 1 Change List

Phase 1 僅做 Booking Workflow Safety，不進入 Assignment、GPS session、Quote 或 UI 重構。

## E.1 最小實作範圍

1. 在現有 `booking-policy.ts` 補完整 `canTransitionBooking(current, next, actor, booking)`，沿用現有 status，不新增 Canonical enum 到資料庫。
2. 新增單一 `booking-workflow.service.ts`，集中：
   - actor / ownership 檢查
   - current → next guard
   - 條件式原子更新
   - 對應時間戳與 GPS 清除
   - Booking Audit
   - Notification 與 Socket 觸發
3. 將以下 route 的狀態寫入改走 Service：
   - accept
   - depart / en-route
   - arrive
   - start service
   - request completion
   - confirm completion
   - cancel
4. 同步將 injury decision、abandon、reschedule 納入 guard，避免留下可繞過的 sibling route；API path 與既有 response shape 保持相容。
5. 保留現有 `auditLogs` collection，向後相容擴充 `actorUserId?`、`actorRole?`、`entityType?`、`entityId?`、`before?`、`after?`、`requestId?`；既有 ADMIN 欄位先保留 optional，避免舊資料失效。
6. 限制 ADMIN 通用 PATCH 不得修改 `status`、流程時間戳、GPS、caregiverId；合法狀態異動改走 Workflow Service。
7. 修正 cancel ownership：ADMIN、requester、Recipient 本人，或 `ACTIVE` 且具 `canCancelBooking` 且未過期的 relation 才能取消。

## E.2 預計修改檔案

```text
back/src/services/booking-workflow.service.ts       新增；唯一 workflow 寫入入口
back/src/utils/booking-policy.ts                    擴充 transition guard
back/src/models/audit-log.ts                        向後相容擴充 actor/entity 欄位
back/src/utils/audit.ts                             支援所有角色的 domain audit
back/src/routes/booking-routes.ts                   將狀態寫入改呼叫 service
back/src/utils/booking-workflow.check.ts            新增最小 transition 自我檢查
back/tests/e2e/mvp-flow.spec.ts                      補非法跳狀態、權限、Audit、競爭更新
back/package.json                                   只新增 check script，不加 dependency
```

視實作結果才可能小改：

```text
back/src/realtime.ts                                若 Service 需直接送既有事件
back/src/configs/app.ts                             移除重複的 finish-hook emit 時才修改
back/src/utils/http.ts                              若新增 422 BUSINESS_RULE_VIOLATION 格式
```

Phase 1 不修改：

```text
front/**
Booking collection 名稱
Booking 現有 status enum
gpsSessions / gpsLocations
bookingAssignments
serviceCatalog / quote
payment / finance
```

## E.3 Phase 1 驗收

```text
✓ 舊 POST /bookings 與既有前端仍可使用
✓ PENDING → IN_SERVICE 被拒絕
✓ ARRIVED → COMPLETED 被拒絕
✓ COMPLETED → IN_SERVICE 被拒絕
✓ 無關 User / Caregiver 不可操作案件
✓ 關係人沒有 canCancelBooking 時不可取消
✓ 同一轉換的競爭請求只有一個成功
✓ 每次狀態改變都有 actor、before、after Audit
✓ API 對衝突回 409，業務規則可回 422，不回 500
✓ Backend TypeScript compile
✓ Frontend TypeScript check
✓ Quasar production build
✓ 現有 Booking E2E + 新增 workflow tests 全部通過
```

---

## Phase 0 決策

Phase 0 完成。建議下一步只執行 Phase 1，不跨入 Phase 2；在 Phase 1 驗收全部通過前，不建立 Assignment、GPS Session、Quote 或 Finance。
