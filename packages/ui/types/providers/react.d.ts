import React from 'react';
/** `Theme` is re-exported from the umbrella `tamagui` package; importing it from `@tamagui/core` fails under tamagui-build's TS pass. */
import { Theme } from 'tamagui';
import { type Config, type ThemeName } from '../tamagui.config';
/**
 * Design-system shell (Expo, Vite, Storybook, etc.).
 *
 * For **Next.js App Router**, import `DesignSystemProvider` from `@dappermountain/design-system/next`
 * so SSR styles are flushed via `useServerInsertedHTML`.
 *
 * - `themeName` must be a known `ThemeName` or `null` to skip the extra `Theme` wrapper.
 * - Uses the package default config when `config` is omitted.
 */
export declare function DesignSystemProvider(props: {
    children: React.ReactNode;
    themeName?: ThemeName | null;
    config?: Config;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Escape hatch for dynamic / runtime-merged theme names when keys are not known to the type system.
 */
export declare function DesignSystemThemeUnsafe(props: {
    name: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
/** Advanced: use `Theme` from the design-system package for custom composition. Prefer `DesignSystemProvider` when possible. */
export declare const DesignSystemTheme: typeof Theme;
//# sourceMappingURL=react.d.ts.map