[English](./README.md) | **繁體中文**

---

# ⚡ 安瑟樂威官方網站

[![CI](https://github.com/ancillarypower/official-site/actions/workflows/ci.yml/badge.svg)](https://github.com/ancillarypower/official-site/actions/workflows/ci.yml)
![Coverage](https://raw.githubusercontent.com/ancillarypower/official-site/badges/coverage.svg)

多功能平台：WordPress 內容瀏覽、3D 模型檢視器、WooCommerce 商店。

技術：**React 18** + **TypeScript** + **Vite** + **Tailwind CSS v4** + **three.js**。

## 功能

- **內容瀏覽（Content Section）** — 透過 WP REST API 瀏覽 WordPress 文章、頁面、分類、標籤與媒體。完整文章閱讀器，支援搜尋、排序與分頁。
- **3D 模型（3D Models）** — 上傳並檢視 `.glb`、`.gltf`、`.obj`、`.stl` 模型，支援自動旋轉、環境光照與網格。模型儲存於瀏覽器 IndexedDB。
- **商店（Store）** — 連接 WooCommerce 商店以瀏覽商品、管理購物車與建立訂單。未連接 WooCommerce 時顯示範例商品。
- **國際化（i18n）** — 完整繁體中文與英文支援，一鍵切換。
- **字體縮放（Font Scaling）** — 透過導覽列控制項調整字體大小（70%-150%）。
- **跨域資源共享（CORS）代理** — 選用代理輪替機制處理跨域 WP/Woo API 請求。

## 快速開始

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## 技術棧（Tech Stack）

| 層級 | 技術 |
|------|------|
| 框架（Framework） | React 18 + TypeScript |
| 建置工具（Build Tool） | Vite 6 |
| 路由（Routing） | React Router v7 |
| 狀態管理（State） | Zustand（購物車、設定）+ React Context（i18n） |
| 3D 渲染（3D Rendering） | three.js 0.160 |
| 資料層（Data Fetching） | TanStack Query v5 |
| 樣式（Styling） | Tailwind CSS v4 |
| 資料驗證（Validation） | Zod |
| 通知（Notifications） | Sonner |
| 本機資料庫（IndexedDB） | idb |

## 專案結構

```
src/
├── components/
│   ├── layout/     → Navbar、Footer、Sidebar、HeroBanner、ErrorBoundary
│   ├── content/    → PostGrid、PostCard、ArticleView
│   ├── models/     → ModelUpload、ModelCard、ModelViewer
│   ├── store/      → ProductGrid、ProductCard、CartPanel
│   └── ui/         → FontSizeControl、Pagination、ContentToolbar 等
├── hooks/          → useWordPress、useWooCommerce、useModelDB、useStorageQuota
├── stores/         → cartStore (Zustand)、settingsStore (Zustand)
├── context/        → I18nContext
├── i18n/           → zh.ts、en.ts
├── lib/            → api.ts、types.ts（Zod schemas）、constants.ts
└── pages/          → ContentPage、ModelsPage、StorePage
```

## 指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 型別檢查 + 正式建置 |
| `pnpm preview` | 預覽正式建置結果 |
| `pnpm lint` | ESLint（含 jsx-a11y） |
| `pnpm format` | Prettier 格式化 |
| `pnpm type-check` | TypeScript 嚴格模式檢查 |
| `pnpm test` | 執行測試 |
| `pnpm test:coverage` | 執行測試並產生覆蓋率報告 |

## 環境變數

請參閱 `.env.example`。以 `VITE_` 為前綴的變數會在建置時嵌入客戶端 JavaScript 打包產物中。

| 變數 | 用途 |
|------|------|
| `VITE_WP_URL` | WordPress 網站網址（不含結尾斜線） |
| `VITE_CSP_CONNECT_EXTRA` | 選用。額外允許 CSP `connect-src` 連線的 `https://` origin，以空白分隔 |

> **⚠️ WooCommerce 憑證**（`consumer_key` / `consumer_secret`）**不可**透過 `VITE_` 環境變數設定，否則將暴露於客戶端 JavaScript 打包產物中。請改由應用程式內的**設定面板**在執行時輸入。

### CSP connect-src 白名單（Allowlist）

`index.html` 的內容安全政策（Content Security Policy，CSP）限制應用程式能用 `fetch()` 連到哪些主機（Issue #583）。白名單由 `src/lib/csp.ts` 的 `buildConnectSrc()` 在 dev／build 時，依 `src/lib/constants.ts` 與環境變數產生，再注入 `__CSP_CONNECT_SRC__` 佔位符（Placeholder）。請勿手動修改佔位符。

預設白名單：

| 來源 | 用途 |
|------|------|
| `'self'` | 同源請求、開發伺服器熱更新（HMR） |
| `https://www.ancillarypower.com` | WordPress／WooCommerce REST API（即 `VITE_WP_URL` 的 origin，此為預設值） |
| `https://corsproxy.io` | 跨域代理（CORS Proxy，代理模式） |
| `https://api.allorigins.win` | 備援跨域代理（代理模式） |
| `https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/` | 3D 檢視器的 Draco 解碼器 WASM（`DRACO_CDN`） |
| `https://cdn.jsdelivr.net/npm/web-ifc@0.0.77/` | IFC 模型的 web-ifc WASM（`IFC_WASM_CDN`） |

修改 `VITE_WP_URL` 時，它的 origin 會自動取代 `https://www.ancillarypower.com`。在 `constants.ts` 升級 three.js 或 web-ifc 的 CDN 版本時，白名單會自動跟著變；但 `tests/lib/csp.test.ts` 會失敗，直到這張表也更新為止。

> **⚠️ 直連模式（Direct Mode）：** 如果在設定面板填入的 WordPress 或 WooCommerce 網址不在白名單內，瀏覽器會擋下請求，畫面上只會看到一般的網路錯誤。解法是把該 origin 加進 `VITE_CSP_CONNECT_EXTRA` 後重新 build，或改用代理模式（請求會改送到上表的代理主機）。

`VITE_CSP_CONNECT_EXTRA` 格式：

```bash
VITE_CSP_CONNECT_EXTRA="https://staging.ancillarypower.com https://shop.example.com"
```

- 以空白分隔，只接受 `https://` origin
- 不可包含路徑、查詢字串或 `*` 萬用字元
- 有不合法的值時，`pnpm dev`／`pnpm build` 會直接失敗，不會默默放寬政策

## 授權

私有 — 安瑟樂威股份有限公司（Ancillary Power Co., Ltd.）

本專案使用開源軟體。完整的第三方依賴、授權與歸屬資訊，請參閱 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
