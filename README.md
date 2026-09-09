# ⚡ Ancillary Power Official Site

Multi-tool platform: WordPress content viewer, 3D model inspector, and WooCommerce store.

Built with **React 18** + **TypeScript** + **Vite** + **Tailwind CSS v4** + **React Three Fiber**.

## Features

- **Content Section** — Browse WordPress posts, pages, categories, tags, and media via WP REST API. Full article reader with search, sort, and pagination.
- **3D Models** — Upload and view `.glb`, `.gltf`, `.obj`, `.stl` models with auto-rotate, environment lighting, and grid. Models persist in browser IndexedDB.
- **Store** — Connect a WooCommerce store to browse products, manage a shopping cart, and create orders. Includes sample products when WooCommerce is not connected.
- **i18n** — Full Chinese (Traditional) and English support with one-click toggle.
- **Font Scaling** — Adjustable font size (70%-150%) via navbar control.
- **CORS Proxy** — Optional proxy rotation for cross-origin WP/Woo API requests.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Routing | React Router v7 |
| State | Zustand (cart, settings) + React Context (i18n) |
| 3D | React Three Fiber + drei + three.js 0.160 |
| Data | TanStack Query v5 |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Notifications | Sonner |
| IndexedDB | idb |

## Project Structure

```
src/
├── components/
│   ├── layout/     → Navbar, Footer, Sidebar, HeroBanner, ErrorBoundary
│   ├── content/    → PostGrid, PostCard, ArticleView
│   ├── models/     → ModelUpload, ModelCard, ModelViewer
│   ├── store/      → ProductGrid, ProductCard, CartPanel
│   └── ui/         → FontSizeControl, Pagination, ContentToolbar, etc.
├── hooks/          → useWordPress, useWooCommerce, useModelDB, useStorageQuota
├── stores/         → cartStore (Zustand), settingsStore (Zustand)
├── context/        → I18nContext
├── i18n/           → zh.ts, en.ts
├── lib/            → api.ts, types.ts (Zod schemas), constants.ts
└── pages/          → ContentPage, ModelsPage, StorePage
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check + production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | ESLint with jsx-a11y |
| `pnpm format` | Prettier |
| `pnpm type-check` | TypeScript strict check |

## Environment Variables

See `.env.example`. All prefixed with `VITE_` for client-side access.

## License

Private — Ancillary Power Co., Ltd.
