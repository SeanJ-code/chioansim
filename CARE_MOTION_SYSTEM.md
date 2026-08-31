# 照安心 Care Motion System

## 目的

Motion 用來降低等待焦慮、說明狀態變化並回饋完成感；不負責改變 Booking、Leave 或任何後端資料。

```text
操作 → API／後端 workflow 成功 → Vue state 更新 → nextTick → GSAP 呈現
```

## 共用實作

- `front/src/composables/useGsap.ts`：集中註冊 GSAP、ScrollTrigger、Flip、CustomEase。
- `front/src/composables/useCareMotion.ts`：集中 duration、ease、stagger、reduced-motion 與三種 motion tone。
- `joy`：承接、完成、收藏等正向成果，使用短促 spring／pop。
- `calm`：頁面、班表、請假與一般資料更新，使用 fade／drift。
- `serious`：錯誤、安全與事故，只使用短 fade／slide，不使用 bounce。

## 已完成

- 首頁 ScrollTrigger 敘事、預約旅程與環境動效。
- Nurse 工作台標題、摘要卡與主要內容依序進場。
- Nurse 承接／完成 API 成功後的 joy feedback。
- Nurse 安全通報使用 serious feedback。
- Pending Leave 柔和呼吸、Approved Leave 安定底色與關懷文案。
- QCalendar event hover 回饋。
- Admin 請假審核重新載入資料後使用 Flip 重排。
- 全站支援 `prefers-reduced-motion: reduce`。

## 新增動畫前檢查

1. 動畫是否解釋狀態、方向或操作結果？若只是裝飾，不加入。
2. 資料是否已由 API 成功回傳？動畫不得先行改狀態。
3. 錯誤、衝突與安全事件不得使用彈跳或慶祝效果。
4. 優先只動畫 `transform` 與 `opacity`，微互動維持約 180–300ms。
5. 觸控目標至少 44×44px，動畫期間仍可操作。
6. reduced-motion 下內容必須立即可見且功能完整。

## 暫不加入

`Draggable`、`Observer` 與 `MotionPathPlugin` 尚無必要互動；等行程拖曳、手勢切換或真實地圖路徑需求成立後再加入，避免增加 bundle 與驗收面。
