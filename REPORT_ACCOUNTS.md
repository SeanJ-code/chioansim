# 展示帳號

所有帳號密碼：`123456789`

- 一般使用者：`user1`～`user30`
- 居服員：`nurse01`～`nurse20`
- 管理員：`aaaa`

推薦展示：

- `user17`：本月高消費
- `user30`：完整展示帳號
- `nurse06`：三次一星與品質警示
- `nurse07`、`nurse08`：請假資料
- `nurse09`～`nurse12`：安全與客訴情境
- `nurse14`、`nurse15`：即將到期／已到期證照
- `nurse20`：最大任務量
- `aaaa`：Admin 統計、客訴、安全通報、QualityAlert、AuditLog

User 模型沒有頭像欄位，因此 30 張 User 圖片保留於 `back/uploads/demo/users`，未擅自新增 Schema 欄位；Recipient 與 Nurse 圖片已寫入現有照片欄位。
