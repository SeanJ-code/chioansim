# Controllers

目前 MVP 的控制器邏輯仍直接寫在 `routes` 的短函式中，方便初學時從網址一路閱讀到資料庫操作。

當單一 route 的商業邏輯持續變長，才把處理函式移到此資料夾；`routes` 屆時只保留網址、中介軟體與 controller 綁定。

