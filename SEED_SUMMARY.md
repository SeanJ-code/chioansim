# CHIOANSIM 展示資料摘要

- Database：`chioansim`
- User：30；CareRecipient：20；Nurse：20；Admin：1
- Booking：220（Completed 143、Cancelled 22、Abandoned 15、Pending 18、Accepted 17、In Service 3、Departed 1、Arrived 1）
- Review：140（5★ 77、4★ 35、3★ 14、2★ 7、1★ 7）
- Complaint：6；Safety：6；InjuryReport：4；QualityAlert：1
- Leave：7；Notification：360；AuditLog：1006
- WorkJournal：48；ServiceRecord：143；Consent：30；Favorite：10
- `nurse06` 的三筆一星皆由既有評價 API 建立，`THREE_ONE_STAR_REVIEWS` 已自然觸發。
- 已核准請假可由既有衝突檢查函式命中。
- `user17` 本月 5 筆完成服務，合計 NT$910；`nurse20` 任務量 20 筆。
- 圖片：30 張 User、20 張 CareRecipient、20 張 Nurse、1 張非血腥照護事件圖，皆為 AI 生成點陣相片。
- Backend build、Frontend typecheck、Frontend SSR build：通過。

正式 source 未修改；新增一支資料 seed 與三份展示說明。
