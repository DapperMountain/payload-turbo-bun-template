import type { NextConfig } from 'next';
export type WithDesignSystemOptions = {
    /** Override auto-detected built config (absolute or app-root-relative). */
    configPath?: string;
    excludeReactNativeWebExports?: string[];
    disableExtraction?: boolean;
    componentsExtra?: string[];
    /**
     * Emit theme/token CSS during `next build` (app-root-relative path).
     * Import the file in your App Router layout; pair with `disableInjectCSS` in production.
     * @see https://tamagui.dev/docs/guides/next-js#static-css-output
     */
    outputCSS?: string | null | false;
};
export declare function withDesignSystem(nextConfig?: NextConfig, options?: WithDesignSystemOptions): NextConfig;
export default withDesignSystem;
//# sourceMappingURL=next-plugin.d.ts.map