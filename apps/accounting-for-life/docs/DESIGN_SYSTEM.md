# Design system

Cross-platform UI for Accounting for Life: **Tailwind CSS v4** tokens, **shadcn/ui** on web, **Uniwind** + **React Native Reusables** patterns on native.

## Should we keep a separate package?

**Yes — keep `@dappermountain/ui` in `packages/ui`.** It is not overkill for this monorepo:

| Responsibility | `@dappermountain/ui` | App (`apps/accounting-for-life`) | Mobile (`apps/mobile`) |
|----------------|----------------------|----------------------------------|------------------------|
| Design tokens (`tokens.css`) | ✓ single source | imports | imports |
| shadcn web components | ✓ | imports | — |
| RNR-style native components | — (spike in mobile) | — | colocated for now |
| App-specific layout | — | `_components/` | screens |

Payload plugins later live in `packages/@dappermountain/plugin-*` — same workspace pattern.

**Do not** import `tamagui` or `@tamagui/core` in apps (ESLint enforced).

## Package layout

```text
packages/ui/
  components.json          # shadcn CLI target (web components)
  src/
    styles/
      globals.css          # Tailwind + base layer (web)
      tokens.css           # Shared CSS variables (@theme, :root)
    components/            # shadcn/ui (Button, Card, …)
    lib/utils.ts           # cn()
apps/accounting-for-life/
  components.json          # shadcn CLI routes adds to packages/ui
  src/app/(frontend)/      # imports @dappermountain/ui/*
apps/mobile/
  src/global.css           # Uniwind entry + @source + shared tokens
  src/components/ui/       # RNR-style native components (spike)
```

## Web (Next.js)

Import global styles once in the frontend layout chain:

```tsx
import '@dappermountain/ui/globals.css'
```

Use shadcn components from the shared package:

```tsx
import { Button } from '@dappermountain/ui/components/button'
import { Card, CardHeader, CardTitle } from '@dappermountain/ui/components/card'
import { cn } from '@dappermountain/ui/lib/utils'
```

Add components from the app directory (CLI installs into `packages/ui`):

```bash
cd apps/accounting-for-life
bunx shadcn@latest add input label
```

`next.config.ts` sets `transpilePackages: ['@dappermountain/ui']`. PostCSS uses `@tailwindcss/postcss`.

## Native (Expo + Uniwind)

`apps/mobile` uses Uniwind via `metro.config.js`. Shared tokens come from `@dappermountain/ui` through `tokens.css` and `@source` scanning.

Add RNR components with their CLI (copies into `apps/mobile/src/components/ui/`) or hand-port using the same Tailwind classes.

```bash
cd apps/mobile
bun run start
```

## Related docs

- [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md)
- [Root README](../../../README.md)
- [Roadmap — design direction](../../../docs/roadmap/DECISIONS.md)
