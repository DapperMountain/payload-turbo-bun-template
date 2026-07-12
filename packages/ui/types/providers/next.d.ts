import React from 'react';
import { type Config, type ThemeName } from '../tamagui.config';
export type { ThemeName, Config };
/**
 * Next.js App Router provider: {@link DesignSystemProviderBase} plus SSR style flush
 * (`useServerInsertedHTML` for react-native-web / Tamagui when supported).
 */
export declare function DesignSystemProvider(props: {
    children: React.ReactNode;
    themeName?: ThemeName | null;
    config?: Config;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=next.d.ts.map