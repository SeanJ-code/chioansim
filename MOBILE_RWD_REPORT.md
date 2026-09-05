# 照安心手機首頁 RWD 修改報告

## 設計目標

將原本以 1920×1080 桌面畫面呈現的首頁，整理成適合手機瀏覽器閱讀與操作的直向版面。桌面版的排版、視覺樣式與互動維持原狀；手機版沿用既有的暖白、柿橘、栗棕色彩與照護插畫。

## 完成內容

- 手機首頁改成「標題與說明 → 情境圖片 → 功能操作」的直向閱讀順序。
- 首頁故事整理成 8 個章節，加入可點擊的章節圓點，方便直接前往各個照護情境。
- 手機圖片使用 4:3 比例，依每張原圖設定人物焦點，避免主要人物被錯誤裁切。
- 手機頁首保留選單、品牌與快速服務入口，並縮減佔用空間。
- 第 2 章保留備餐、陪伴、家務、外出以及服務特色；第 7 章保留服務進度；第 8 章保留找居服員及 LINE 協助。
- 手機故事停用桌面專用的捲動縮放和水平換幕動畫，避免瀏覽時圖片晃動。
- 手機互動區保留至少 44px 的觸控範圍，支援安全區域、減少動態效果與放大文字。

## 保留的功能與連結

- 居服員資料仍由原本的 `/nurses` API 取得。
- 「找居服員」與居服員卡片仍前往 `/caregivers`。
- 「第一次使用」仍捲動至原本的預約流程。
- LINE 協助仍開啟原本的對話框與 `https://line.me/R/ti/p/@690hzupc`。
- 登入、選單、快速服務及費用試算功能均保留。

## 影響檔案

- `front/src/components/home/HomeHero.vue`
- `front/src/components/home/HomeMobileChapters.vue`
- `front/src/components/home/story/CareStoryScene.vue`
- `front/src/components/home/story/HomeCareDayStory.vue`
- `front/src/layouts/MainLayout.vue`
- `front/src/pages/IndexPage.vue`
- `front/scripts/check-mobile-home.cjs`

## 驗證結果

- TypeScript 型別檢查通過。
- Quasar SSR 正式建置通過。
- 已檢查 320、375、390、599、768、1440px 與手機橫向尺寸，沒有水平溢出。
- 已驗證 8 個章節、預約捲動、居服員路由、LINE 對話框、快速服務、減少動態效果與放大文字。
- 桌面首頁在修改前後的主要場景尺寸與計算樣式一致。

在前端開發伺服器運行於 `http://localhost:9000` 時，可於專案的 `front` 目錄執行：

```sh
npm run check:mobile-home
```
