# 照安心後端 API

主要 Base URL：`http://localhost:3000`

舊版相容 Base URL：`http://localhost:3000/api`

## 啟動

1. 啟動本機 MongoDB（預設 `mongodb://127.0.0.1:27017/chioansim`）。
2. 在 `back` 執行 `npm run dev`。
3. 瀏覽器開啟 `http://localhost:3000`，即可看到 API 分類與主要網址。
4. 在 Postman 直接按 New HTTP Request，輸入網址、選擇 Method 與 Body，不需要匯入 JSON。
5. 先執行 `GET http://localhost:3000/health` 確認服務正常。

原有 Postman Collection 仍保留為選用範本，但不是執行 API 的必要條件。

## 直接網址範例

```text
GET    http://localhost:3000/health
POST   ㄇ
POST   http://localhost:3000/auth/login
POST   http://localhost:3000/auth/refresh
DELETE http://localhost:3000/auth/logout
GET    http://localhost:3000/patients
POST   http://localhost:3000/patients
PATCH  http://localhost:3000/patients/:id
DELETE http://localhost:3000/patients/:id
```

登入回傳的 Access Token 有效 15 分鐘。Postman 會自動保存 `refresh` Cookie；AT 到期後呼叫
`POST /auth/refresh` 即可取得新 AT。Refresh Token 有效 7 天，而且每次更新後舊 RT 立即失效。

## 身分與規則

- `USER`：即使沒有受照護者資料，也能用自己的資料提出預約需求。
- `PATIENT`：同時具有登入帳號及受照護者資料，只能查看自己的資料／預約／GPS、評價、申訴及求救；不能下單、修改照護資料或直接取消預約。
- `NURSE`：必須以 multipart 上傳政府證照，經 ADMIN 核准後才可登入接案；核准後可繼續新增多張證照與技能證明。
- `ADMIN`：管理帳號、核准居服員與證明、處理申訴／求救／傷況判斷、查看統計與稽核紀錄。

## API 一覽

| 功能                      | Method                | Path                                                                 |
| ------------------------- | --------------------- | -------------------------------------------------------------------- |
| 註冊／登入／我的資料      | POST/POST/GET         | `/auth/register`, `/auth/login`, `/auth/me`                          |
| 居服員申請（certificate） | POST multipart        | `/auth/register-nurse`                                               |
| 受照護者 CRUD             | POST/GET/PATCH/DELETE | `/patients`, `/patients/:id`                                         |
| 家屬授權                  | POST                  | `/patients/:id/relations`                                            |
| 同意文件                  | POST/GET/PATCH        | `/patients/:id/consents`, `/patients/:id/consents/:consentId/revoke` |
| 居服員資料及時段          | GET/PATCH/POST        | `/nurses`, `/nurses/me/profile`, `/nurses/me/availability`           |
| 核准居服員                | PATCH                 | `/nurses/:id/verification`                                           |
| 多證照／技能證明          | POST/GET              | `/nurses/me/credentials`, `/nurses/:id/credentials`                  |
| 核准單張證明              | PATCH                 | `/nurses/:id/credentials/:credentialId/verification`                 |
| 服務類型 CRUD             | GET/POST/PATCH/DELETE | `/services/types`                                                    |
| 需求 CRUD／接案           | CRUD/POST             | `/services/requests`, `/services/requests/:id/accept`                |
| 預約 CRUD                 | GET/PATCH/DELETE      | `/bookings`, `/bookings/:id`                                         |
| 出發／GPS／抵達           | POST/PATCH/POST       | `/bookings/:id/depart`, `/location`, `/arrive`                       |
| 傷況照片／是否繼續        | POST multipart/PATCH  | `/bookings/:id/injuries`, `/injuries/:reportId/decision`             |
| 開始／完成／棄單／取消    | POST                  | `/bookings/:id/start`, `/complete`, `/abandon`, `/cancel`            |
| 雙向評價 CRUD             | POST/GET/PATCH/DELETE | `/feedback/reviews`                                                  |
| 正式申訴                  | POST/GET/PATCH        | `/feedback/complaints`, `/feedback/complaints/:id`                   |
| 求救 CRUD／管理處理       | POST/GET/PATCH/DELETE | `/feedback/emergencies`                                              |
| 帳號管理／統計            | CRUD/GET              | `/admin/users`, `/admin/statistics`                                  |
| 管理操作稽核              | GET                   | `/admin/audit-logs`                                                  |

## PATIENT 權限邊界

PATIENT 可使用：

```text
GET  /auth/me
GET  /patients
GET  /patients/:id
GET  /patients/:id/injuries
GET  /patients/:id/consents
GET  /bookings
GET  /bookings/:id
POST /feedback/reviews
POST /feedback/complaints
GET  /feedback/complaints
POST /feedback/emergencies
```

PATIENT 呼叫建立需求、修改／刪除受照護者、直接取消預約時會收到 `403`。

## 資料保留原則

所有業務資料都採用軟刪除：DELETE API 路徑與呼叫方法維持不變，但後端只會設定 `DELETED` 狀態或 `hidden=true`，並保存操作時間與執行者。一般查詢會自動遮蔽這些資料，MongoDB 原始文件仍保留，可由既有 PATCH API 恢復。只有登出用的短期 Refresh Token 會實體清除，避免已登出的憑證繼續使用。ADMIN 的重要操作會寫入 `auditlogs`，此 Collection 不提供修改或刪除 API。

GPS 是 MVP 的「居服員 App 定期上傳座標」模式；USER/PATIENT 查詢預約即可取得最新位置、更新時間與 ETA。正式環境可再接 WebSocket 推播及地圖路線服務。
