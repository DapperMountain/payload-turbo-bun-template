# Design system (frontend)

Public UI under `src/app/(frontend)/` uses the monorepo package **`@dappermountain/design-system`**. App code should treat that package as the design system — not Tamagui directly.

Implementation (tokens, Tamagui config, Next plugin) lives in **`packages/design-system/`** at the repo root.

## Imports

```tsx
'use client'

import { Stack, Row, Button, PageTitle, Body } from '@dappermountain/design-system'
```

| Import from design-system | Use for |
|---------------------------|---------|
| `DesignSystemProvider` from `@dappermountain/design-system/next` | Next.js frontend shell (`_components/providers.tsx`) — includes SSR style flush |
| `DesignSystemProvider` from `@dappermountain/design-system` | Expo / non-Next apps (no `useServerInsertedHTML`) |
| `Stack`, `Row` | Vertical / horizontal layout (`YStack` / `XStack`) |
| `PageTitle`, `Body`, `Label`, `Divider` | Typography and separators |
| `Button` | Actions and links (`render={<a />}` for anchors) |
| `YStack`, `XStack`, `H1`, `Paragraph`, `Text`, `Separator` | Same primitives, explicit Tamagui names when clearer |

**Do not** import `tamagui` or `@tamagui/core` in this app — ESLint enforces `no-restricted-imports`.

## Next.js wiring

`next.config.ts` composes:

1. **`withPayload`** — Payload admin and API routes  
2. **`withDesignSystem`** from `@dappermountain/design-system/next-plugin` — resolves the built config inside the design-system package (no `configPath` in the app)

Production CSS (themes/tokens):

- **Static file**: `public/tamagui.generated.css` (imported in `(frontend)/layout.tsx`)
- **Generate** (from design-system package — Next 16 Turbopack does not emit this via the webpack plugin):

```bash
cd packages/design-system
bun run generate:css
```

- **App `prebuild`** runs `generate:css` automatically before `bun run build`
- **`withDesignSystem`**: `outputCSS` + `disableExtraction` in dev only (webpack builds; optional if you disable Turbopack for production)
- **`DesignSystemProvider`**: `disableInjectCSS` in production so theme CSS is not duplicated (static file + SSR runtime styles via `useServerInsertedHTML`)

Commit `public/tamagui.generated.css` after theme/token changes in `packages/design-system`.

`transpilePackages` includes `@dappermountain/design-system`.

Turbopack aliases `react-native` → `react-native-web` (see `next.config.ts`). The app also depends on **`react-native`** and **`react-native-web`** so the design-system Next provider can import RN-web during SSR.

Build the design-system package before production builds (root Turbo filter handles this):

```bash
cd packages/design-system && bun run build
```

## Adding UI

1. Prefer existing exports from `@dappermountain/design-system`.
2. Need a new primitive (e.g. `Input`)? Add it once in `packages/design-system/src/primitives.ts` and export from that package’s `index.ts`.
3. Need a shared branded component (e.g. `TenantCard`)? Add `packages/design-system/src/components/…` and export from the design-system package.
4. App-only layout? Keep it under `src/app/(frontend)/_components/` but still import primitives from the design-system package.

## App Router layout (`src/app/(frontend)/`)

```text
(frontend)/
├── layout.tsx              # Server — html/body, i18n, providers
├── page.tsx                # Server — data for the home route
├── globals.css
├── actions/
│   └── switch-language.ts  # Server Action (payload-lng cookie)
└── _components/            # Colocated UI (not routed)
    ├── providers.tsx       # FrontendProviders (client)
    ├── home-page.tsx       # HomePage (client)
    └── language-switcher.tsx
```

## Server vs client (Next.js)

| Layer | File | Role |
|-------|------|------|
| Server | `page.tsx` | Auth, CMS data (no copy) |
| Client | `_components/home-page.tsx` | `useAppTranslation()` → `t('custom:frontend:*')` |
| Client | `_components/providers.tsx` | `TranslationProvider` + `DesignSystemProvider` from `/next` |

Tamagui primitives stay in **client** modules but still **SSR** (HTML on first paint). They are not React Server Components.

**App-only UI** (Payload cookies, `router.refresh()`, locale config) lives in `_components/` — e.g. `language-switcher.tsx` — and composes design-system primitives (`Stack`, `Row`). Do not put those in `packages/design-system`.

## i18n

Copy lives in **`src/lang/`**. Client UI: **`useAppTranslation()`** and **`t('custom:…')`**. See [I18N.md](../.agents/skills/dapper-payload-app/reference/I18N.md).

## Related docs

- [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md) — project layout  
- [README.md](../README.md) — dev setup and structure  
- Root `packages/design-system/` — tokens, themes, `withDesignSystem`
