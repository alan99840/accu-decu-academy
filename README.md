# Accu/Decu_Intro

一個公開開源的結構型商品入門課堂。用客戶視角解釋股票型 Accumulator 與 Decumulator，包含“每天買／賣多少股？”互動模擬器。

## 線上閱讀

[開啟教學網頁](https://alan99840.github.io/accu-decu-academy/)

頁面無需登入。全部價格、條款和保證金比例都是教學假設，不是即時行情或商品報價。

## 教學內容

- Accu 買股和 Decu 賣股的每日義務、執行價和數量倍數。
- KO、KI、保證期、觀察方式及合約變體。
- 實物交割與現金差額結算、累計義務與交割批次。
- 保證金、最大購股價款、備兌與不足額 Decu、提前平倉。
- Note 法律形式與 OTC 交易方式的區別。
- 八步 Term Sheet 閱讀清單、術語表、課堂小測及原始資料連結。

## 互動模擬器

六條股價路徑；Accu / Decu；1x / 不利時 2x；實物 / 按觀察日定價的現金差額。可以檢視每日股數、現金、交割批次，並下載 CSV。

重要口徑：

- 期初價 100 港元；Accu 執行價 90、KO 105；Decu 執行價 110、KO 95；基礎數量每日 100 股。
- 10 個觀察日，第 5、10 日結算；KO 不加速原定結算。
- 收盤觀察；KO 當日及其後不計量；執行價等值時按 1x。
- 無 KI、無保證期，不計融資、費用、稅費、股利和信用風險。
- 實物 Accu 結果：累計股數 × 第 10 日股價 − 購股價款，假設全部股票持有至第 10 日。
- 實物 Decu 結果：賣股收入 − 已賣股數 × 第 10 日股價，是相對期末賣股的差額，不是原持股實際利潤。
- 現金差額：分別按每個觀察日的價和股數計算後彙總；正數為客戶收款，負數為客戶付款。它與持股至期末的實物結果可能不同。

## 本地執行與修改

釋出版 `index.html` 是完整可編輯的單一檔案網頁，CSS、JavaScript 與 SVG 圖表均在其中，無第三方執行依賴。完整模組化開發包見 [source.zip](source.zip)，其中包含 `src/`、`tests/` 和構建指令碼。可直接開啟發布版；也可啟動本地伺服器：

```sh
python3 -m http.server 8000
```

然後瀏覽 `http://localhost:8000/`。如需模組化開發，先解壓 `source.zip`，修改其中的 `src/index.html` 和 `src/assets/` 後執行 `python3 build.py`，重新生成釋出版。可以執行 `node tests/model.test.cjs` 檢查 24 組商品／股價路徑／數量倍數組合。搜尋原始碼中的 `THE BASIC IDEA`、`INTERACTIVE LAB`、`Pure teaching model` 等段落可找到教學與計算程式碼。

清單和模擬器選擇使用瀏覽器 localStorage 儲存，沒有分析追蹤或伺服器資料介面。不支援 localStorage 時仍可使用網頁。

## GitHub Pages

本專案使用 GitHub Pages，從 `main` 分支的根目錄釋出。配置位置：Settings → Pages → Deploy from a branch → main → / (root)。

部署機制說明：[GitHub 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

## 許可證與資料

原創網頁程式碼、教學文字和圖表採用 [MIT License](LICENSE)。外部資料的權利屬於各自作者。可自由複用原創部分，並保留許可證。歡迎提交 Issue 或 Pull Request 改進說明和計算。

視覺採用紅／綠配色、白色背景與金融研究報告式排版；本站為獨立教學專案，與所連結機構無關聯。

字型參考 Apple 的系統排版，Apple 裝置優先使用系統字型與蘋方；正文採用 Medium 字重，標題採用 Semibold / Bold，其他裝置使用相應系統字型。無需下載額外字型。

僅用於一般商品機制教學，不構成投資建議、產品銷售材料、報價或投資人適合度評估。實際義務須核對具體合約。
