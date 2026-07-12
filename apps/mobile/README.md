# @dappermountain/mobile

Expo app spike for **Uniwind** (Tailwind v4 on React Native) and **React Native Reusables**-style components.

## Commands

```bash
cd apps/mobile
bun run start    # Expo dev server
bun run ios
bun run android
```

## Stack

- **Expo 57** + React Native 0.86
- **Uniwind** — `className` on RN primitives via `metro.config.js`
- **Shared tokens** — `packages/ui/src/styles/tokens.css` imported from `src/global.css`
- **RNR-style Button** — `src/components/ui/button.tsx` (hand-ported spike; use RNR CLI for production components)

## Monorepo notes

Native components stay in this app (or move to `packages/ui/native` later). Web shadcn components live in `@dappermountain/ui`.
