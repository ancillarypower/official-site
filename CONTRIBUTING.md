# Contributing

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your WordPress URL and WooCommerce credentials
pnpm dev
```

## Branch Conventions

We use **trunk-based development**:

- `main` is always deployable
- Create short-lived feature branches: `feat/content-search`, `fix/cart-total`
- Squash-merge PRs into `main`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix a bug
chore(scope): maintenance task
docs(scope): documentation update
refactor(scope): code restructuring
test(scope): add or update tests
```

**Scopes:** `content`, `models`, `store`, `layout`, `ui`, `lib`, `i18n`, `ci`

## Code Quality

```bash
pnpm lint          # ESLint (includes jsx-a11y)
pnpm type-check    # TypeScript strict mode
pnpm format        # Prettier
```

All checks run in CI on every PR.

## Three.js Notes

- three.js is pinned to `^0.160` for stability
- Draco decoder is loaded from CDN; no local WASM files needed
