# WORLDWIRE｜全球新聞工作台

為每天大量閱讀外文新聞的國際新聞記者製作的繁體中文介面，保留英語、日語、韓文原標題、RSS 摘錄與原文連結。

## 功能

- 64 個媒體及智庫 RSS 來源（含 8 個日語頻道、7 個韓文頻道與 20 個智庫來源），涵蓋亞洲、中東、歐洲、北美洲、拉丁美洲、非洲及大洋洲。
- 新增日語來源：NHK（綜合／國際／經濟）、朝日新聞、每日新聞、共同通信社、時事通信、ITmedia NEWS。
- 新增韓文來源：聯合新聞、韓民族日報、京鄉新聞、東亞日報、朝鮮日報、SBS 政治、ZDNet Korea。
- 新增智庫：Global Taiwan Institute、Pacific Forum、ISEAS Fulcrum、MERICS、SWP、Atlantic Council、Stimson、ISDP、East-West Center、AEI、Hudson。RUSI 已更新為官方出版品 RSS。
- 經濟、科技、軍事、政治、醫藥、健康、藝術與娛樂圖示分類。
- **付費報導**獨立圖示與專區：訂閱來源或 RSS 標示受限的文章集中展示。
- **智庫報告**獨立圖示與專區：依 Taiwan、China、Chinese、Asia-Pacific、Indo-Pacific、East Asia、South China Sea、cross-strait 等字詞篩選標題及摘錄。
- 英／日／韓語言篩選、多語分類、搜尋、來源所在地區篩選、來源篩選、24 小時／7 天篩選、依時間排序、分批顯示、網址去重。
- 收藏保存在目前瀏覽器的 localStorage，沒有帳號同步。
- 頁面可見時每五分鐘更新，顯示來源成功／失敗狀態。

## 本機執行

需要 Node.js 22 或以上。基本預覽與檢查不需要安裝套件。

```sh
npm run check
npm start
```

開啟 http://127.0.0.1:4173 。可用 PORT 環境變數更換埠號。RSS 需要可連線的網路。

## 部署成公開網站

這個網站有 `/api/feed` 伺服器端 RSS 代理，不能單靠 GitHub Pages 靜態託管提供完整功能。GitHub 儲存庫用於公開程式碼；網站服務可部署至 Cloudflare Workers。

安裝官方 Wrangler，登入自己的 Cloudflare 帳號，再部署：

```sh
npm install --save-dev wrangler
npx wrangler login
npm run deploy
```

Wrangler 會顯示部署網址。第一次 npx 或 npm 安裝需要網路；Cloudflare 帳號的方案與流量限制適用。若供團隊長期使用，建議鎖定 Wrangler 版本並提交產生的 lockfile。

官方說明：[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)。

## 檔案

| 路徑 | 用途 |
| --- | --- |
| `worker/index.js` | Cloudflare Worker、允許的 RSS 來源、嵌入式前端 |
| `wrangler.jsonc` | Worker 部署設定 |
| `scripts/preview.mjs` | Node 本機預覽 |
| `scripts/check.mjs` | 無網路驗證 |

新增來源時，編輯 `worker/index.js` 開頭的 `feeds` 陣列。格式為 `[名稱, 國家或地區, 區域, RSS網址, 選填分類, 是否付費來源, 語言代碼 en/ja/ko]`；分類 `智庫` 會啟用相關關鍵字篩選。

## 已知限制

- RSS 是盡力取得，不能保證涵蓋每個國家、媒體或所有文章，也不是逐秒推播。每次每個來源最多讀取 70 篇；沒有歷史資料庫。關閉頁面後不會背景蒐集。
- 初期測試中，Brookings、RAND、Chatham House 的設定端點未成功回應；狀態頁會顯示失敗，需後續維護端點。其他來源也可能隨時變更。
- 主題採英文、日文與韓文關鍵字規則；未命中其他類別的報導歸入綜合，並非人工核實分類。
- 付費區按來源預設與 RSS 字詞判斷，可能包含可免費閱讀文章，也可能漏掉個別付費文章；不會登入、破解或繞過付費牆。
- 智庫區依標題／摘錄文字判斷，不下載全文，也包含政策評論；無法保證是正式研究報告，或找出僅在全文提到相關地區的內容。
- 專案只代理預設來源，沒有任意網址抓取介面。來源資料作為純文字顯示；原文連結限定 HTTP(S)。

## 內容權利

本專案不包含新聞全文資料庫。文章、標題、摘錄及媒體名稱的權利屬於各原始權利人。公開部署與商業使用前，應依各來源的 RSS 使用條款取得必要授權。程式碼目前未指定開源授權。
