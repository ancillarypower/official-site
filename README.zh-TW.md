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

> **⚠️ WooCommerce 憑證**（`consumer_key` / `consumer_secret`）**不可**透過 `VITE_` 環境變數設定，否則將暴露於客戶端 JavaScript 打包產物中。請改由應用程式內的**設定面板**在執行時輸入。

## 授權

私有 — 安瑟樂威股份有限公司（Ancillary Power Co., Ltd.）

本專案使用開源軟體。完整的第三方依賴、授權與歸屬資訊，請參閱 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
