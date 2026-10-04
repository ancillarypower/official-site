[**English**](./README.md) | [繁體中文](./README.zh-TW.md)

---

# ⚡ Ancillary Power Official Site

[![CI](https://github.com/ancillarypower/official-site/actions/workflows/ci.yml/badge.svg)](https://github.com/ancillarypower/official-site/actions/workflows/ci.yml)
![Coverage](https://raw.githubusercontent.com/ancillarypower/official-site/badges/coverage.svg)

Multi-tool platform: WordPress content viewer, 3D model inspector, and WooCommerce store.

Built with **React 18** + **TypeScript** + **Vite** + **Tailwind CSS v4** + **three.js**.

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
| 3D | three.js 0.160 |
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
| `pnpm test` | Run tests |
| `pnpm test:coverage` | Run tests with coverage report |

## Environment Variables

See `.env.example`. Variables prefixed with `VITE_` are embedded in the client-side JavaScript bundle at build time.

| Variable | Purpose |
|----------|--------|
| `VITE_WP_URL` | WordPress site URL (no trailing slash) |
| `VITE_CSP_CONNECT_EXTRA` | Optional. Extra `https://` origins allowed by the CSP `connect-src` directive, space-separated |

> **⚠️ WooCommerce credentials** (`consumer_key` / `consumer_secret`) must **not** be set via `VITE_` environment variables — they would be exposed in the client-side JavaScript bundle. Enter them through the in-app **Settings panel** at runtime instead.

### CSP connect-src allowlist

The Content Security Policy in `index.html` limits which hosts the app may contact with `fetch()` (Issue #583). The list is generated at dev/build time by `buildConnectSrc()` in `src/lib/csp.ts` from `src/lib/constants.ts` and your env, then injected into the `__CSP_CONNECT_SRC__` placeholder. Do not edit the placeholder by hand.

Default allowlist:

| Source | Used for |
|--------|----------|
| `'self'` | Same-origin requests, dev server HMR, and the self-hosted Draco / web-ifc decoders (see below) |
| `https://www.ancillarypower.com` | WordPress / WooCommerce REST API (the origin of `VITE_WP_URL`; this is the default) |
| `https://corsproxy.io` | CORS proxy (proxy mode) |
| `https://api.allorigins.win` | CORS proxy fallback (proxy mode) |

If you change `VITE_WP_URL`, its origin replaces `https://www.ancillarypower.com` automatically. If you add a default origin in `constants.ts`, `tests/lib/csp.test.ts` fails until this table is updated too.

> **⚠️ Direct mode:** if you enter a WordPress or WooCommerce URL in the Settings panel whose origin is not on the allowlist, the browser blocks the request and you only see a generic network error. Either add the origin to `VITE_CSP_CONNECT_EXTRA` and rebuild, or switch to proxy mode (requests then go to the proxy hosts above).

`VITE_CSP_CONNECT_EXTRA` format:

```bash
VITE_CSP_CONNECT_EXTRA="https://staging.ancillarypower.com https://shop.example.com"
```

- Space-separated, `https://` origins only
- No path, query, or `*` wildcard
- An invalid entry fails `pnpm dev` / `pnpm build` instead of silently widening the policy

### Self-hosted 3D decoders

The Draco decoder (compressed GLB/GLTF) and the web-ifc WASM runtime (IFC) are served from this site, not from a public CDN (Issue #586), so a compromised CDN or npm mirror cannot inject code at runtime. The `self-host-decoders` plugin in `vite.config.ts` copies them from `node_modules`; the file list lives in `src/lib/decoderAssets.ts`.

| Output path (under Vite `base`) | Copied from |
|---------------------------------|-------------|
| `decoders/draco/gltf/` | `three/examples/jsm/libs/draco/gltf/` (`draco_decoder.wasm`, `draco_wasm_wrapper.js`, `draco_decoder.js`) |
| `decoders/web-ifc/` | `web-ifc/` (`web-ifc.wasm`, plus `web-ifc-mt.wasm` when present) |

- Versions follow the installed `three` / `web-ifc` packages and their integrity is pinned by `pnpm-lock.yaml`. To update, bump the package; there is nothing to copy by hand.
- `pnpm dev` serves the files through a middleware; `pnpm build` emits them into `dist/`. A missing required file fails the build.
- They are only downloaded when a Draco-compressed model or an `.ifc` file is opened, so the first page load is unchanged.

## License

Private — Ancillary Power Co., Ltd.

This project uses open source software. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for a complete list of third-party dependencies, their licenses, and attributions.
