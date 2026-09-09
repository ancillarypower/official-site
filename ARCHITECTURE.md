# Architecture Decision Records

## SPA vs SSR

**Decision:** SPA (Vite + React)

**Rationale:** This is an internal tool for content preview, 3D model viewing, and WooCommerce store management. SEO is not required. The component structure is designed to be portable to Next.js App Router if public-facing SEO becomes a requirement.

## Monorepo

**Decision:** Single-package

**Rationale:** The project is a single frontend application. If a backend proxy is added later (to hide WooCommerce secrets server-side), introduce Turborepo at that point.

## Code Splitting

**Decision:** `React.lazy()` for Models and Store pages

**Rationale:** React Three Fiber is ~500KB+ gzipped. Users who only use the Content tab should not pay that cost. The Store page is also lazy-loaded since its checkout flow pulls in additional logic.

## Git Branching

**Decision:** Trunk-based development

**Rationale:** `main` is always deployable. Short-lived feature branches with squash-merge PRs. Conventional Commits for auto-changelog via release-please.

## CORS Strategy

**Decision:** Client-side CORS proxy rotation (Phase 1) → self-hosted backend proxy (future)

**Rationale:** Public CORS proxies (corsproxy.io, allorigins) are free but unreliable. A backend proxy (Cloudflare Worker or Express) would also solve the WooCommerce secret exposure issue. This is documented as a known limitation.

## Cart Persistence

**Decision:** localStorage via Zustand `persist` middleware

**Rationale:** Simple and sufficient for single-device use. Cross-device cart sync requires a server-side cart, which is out of scope for the initial release.

## State Management

**Decision:** Zustand for cart and settings, React Context for i18n

**Rationale:** Zustand is ideal for global state with persistence. i18n has only 2 languages and a simple key-value map, React Context is lighter and avoids unnecessary dependencies. Both patterns coexist cleanly.

## Security: WooCommerce Credentials

**Status:** Risk accepted (Phase 1-4)

WooCommerce Consumer Key and Consumer Secret are configured via `import.meta.env` and exposed in the client-side JavaScript bundle. This is acceptable for an internal tool behind authentication.

**Mitigation:** Phase 5+ should introduce a backend proxy that holds the credentials server-side and proxies Woo API requests.
