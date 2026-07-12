/** ---- Tokens (single source) ----
 * IMPORTANT: Tamagui requires size.true and space.true to mirror your default.
 */
export declare const tokens: {
    readonly size: {
        readonly 1: 24;
        readonly 2: 28;
        readonly 3: 32;
        readonly 4: 36;
        readonly 5: 40;
        readonly 6: 48;
        readonly 7: 56;
        readonly 8: 64;
        readonly true: 36;
    };
    readonly space: {
        readonly 0: 0;
        readonly 0.5: 2;
        readonly 1: 4;
        readonly 1.5: 6;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 8: 32;
        readonly 10: 40;
        readonly 12: 48;
        readonly 16: 64;
        readonly true: 8;
    };
    readonly radius: {
        readonly 0: 0;
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly round: 9999;
    };
    readonly zIndex: {
        readonly 0: 0;
        readonly 1: 1;
        readonly 10: 10;
        readonly 100: 100;
        readonly 1000: 1000;
    };
    readonly color: {};
};
/** Sans for body + heading; mono for code-style text (`fontFamily="$mono"`). */
export declare const fonts: {
    readonly body: {
        readonly family: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"";
        readonly size: {
            readonly 1: 12;
            readonly 2: 14;
            readonly 3: 16;
            readonly 4: 18;
            readonly 5: 20;
            readonly 6: 24;
            readonly 7: 28;
            readonly 8: 32;
        };
        readonly lineHeight: {
            readonly 1: 16;
            readonly 2: 20;
            readonly 3: 24;
            readonly 4: 28;
            readonly 5: 28;
            readonly 6: 32;
            readonly 7: 36;
            readonly 8: 40;
        };
        readonly weight: {
            readonly 1: "400";
            readonly 2: "500";
            readonly 3: "600";
            readonly 4: "700";
        };
        readonly letterSpacing: {
            readonly 1: 0;
            readonly 2: 0;
            readonly 3: 0;
            readonly 4: 0;
        };
    };
    readonly heading: {
        readonly family: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"";
        readonly size: {
            readonly 1: 12;
            readonly 2: 14;
            readonly 3: 16;
            readonly 4: 18;
            readonly 5: 20;
            readonly 6: 24;
            readonly 7: 28;
            readonly 8: 32;
            readonly 9: 36;
            readonly 10: 44;
            readonly 11: 52;
            readonly 12: 60;
        };
        readonly lineHeight: {
            readonly 1: 16;
            readonly 2: 20;
            readonly 3: 24;
            readonly 4: 28;
            readonly 5: 28;
            readonly 6: 32;
            readonly 7: 36;
            readonly 8: 40;
            readonly 9: 44;
            readonly 10: 48;
            readonly 11: 56;
            readonly 12: 64;
        };
        readonly weight: {
            readonly 1: "400";
            readonly 2: "500";
            readonly 3: "600";
            readonly 4: "700";
        };
        readonly letterSpacing: {
            readonly 1: 0;
            readonly 2: 0;
            readonly 3: 0;
            readonly 4: 0;
        };
    };
};
export declare const themes: Record<"dark" | "light" | "light_accent" | "dark_accent" | "dark_warning" | "dark_error" | "dark_success" | "light_warning" | "light_error" | "light_success", {
    shadowColor: string;
    yellow1: string;
    yellow2: string;
    yellow3: string;
    yellow4: string;
    yellow5: string;
    yellow6: string;
    yellow7: string;
    yellow8: string;
    yellow9: string;
    yellow10: string;
    yellow11: string;
    yellow12: string;
    red1: string;
    red2: string;
    red3: string;
    red4: string;
    red5: string;
    red6: string;
    red7: string;
    red8: string;
    red9: string;
    red10: string;
    red11: string;
    red12: string;
    green1: string;
    green2: string;
    green3: string;
    green4: string;
    green5: string;
    green6: string;
    green7: string;
    green8: string;
    green9: string;
    green10: string;
    green11: string;
    green12: string;
    shadow1: string;
    shadow2: string;
    shadow3: string;
    shadow4: string;
    shadow5: string;
    shadow6: string;
    colorTransparent: string;
    color: string;
    colorHover: string;
    colorPress: string;
    colorFocus: string;
    placeholderColor: string;
    outlineColor: string;
    accentBackground: string;
    accentColor: string;
    background0: string;
    background02: string;
    background04: string;
    background06: string;
    background08: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
    color6: string;
    color7: string;
    color8: string;
    color9: string;
    color10: string;
    color11: string;
    color12: string;
    color0: string;
    color02: string;
    color04: string;
    color06: string;
    color08: string;
    background: string;
    backgroundHover: string;
    backgroundPress: string;
    backgroundFocus: string;
    borderColor: string;
    borderColorHover: string;
    borderColorPress: string;
    borderColorFocus: string;
    accent0: string;
    accent1: string;
    accent2: string;
    accent4: string;
    accent6: string;
    accent8: string;
    accent12: string;
    accent10: string;
    accent11: string;
    accent3: string;
    accent5: string;
    accent7: string;
    accent9: string;
} & Record<string, string>>;
export type ThemeName = keyof typeof themes;
export declare const DEFAULT_THEME: ThemeName;
export declare const config: import("tamagui").TamaguiInternalConfig<{
    readonly size: {
        readonly 1: 24;
        readonly 2: 28;
        readonly 3: 32;
        readonly 4: 36;
        readonly 5: 40;
        readonly 6: 48;
        readonly 7: 56;
        readonly 8: 64;
        readonly true: 36;
    };
    readonly space: {
        readonly 0: 0;
        readonly 0.5: 2;
        readonly 1: 4;
        readonly 1.5: 6;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 8: 32;
        readonly 10: 40;
        readonly 12: 48;
        readonly 16: 64;
        readonly true: 8;
    };
    readonly radius: {
        readonly 0: 0;
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly round: 9999;
    };
    readonly zIndex: {
        readonly 0: 0;
        readonly 1: 1;
        readonly 10: 10;
        readonly 100: 100;
        readonly 1000: 1000;
    };
    readonly color: {};
}, Record<"dark" | "light" | "light_accent" | "dark_accent" | "dark_warning" | "dark_error" | "dark_success" | "light_warning" | "light_error" | "light_success", {
    shadowColor: string;
    yellow1: string;
    yellow2: string;
    yellow3: string;
    yellow4: string;
    yellow5: string;
    yellow6: string;
    yellow7: string;
    yellow8: string;
    yellow9: string;
    yellow10: string;
    yellow11: string;
    yellow12: string;
    red1: string;
    red2: string;
    red3: string;
    red4: string;
    red5: string;
    red6: string;
    red7: string;
    red8: string;
    red9: string;
    red10: string;
    red11: string;
    red12: string;
    green1: string;
    green2: string;
    green3: string;
    green4: string;
    green5: string;
    green6: string;
    green7: string;
    green8: string;
    green9: string;
    green10: string;
    green11: string;
    green12: string;
    shadow1: string;
    shadow2: string;
    shadow3: string;
    shadow4: string;
    shadow5: string;
    shadow6: string;
    colorTransparent: string;
    color: string;
    colorHover: string;
    colorPress: string;
    colorFocus: string;
    placeholderColor: string;
    outlineColor: string;
    accentBackground: string;
    accentColor: string;
    background0: string;
    background02: string;
    background04: string;
    background06: string;
    background08: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
    color6: string;
    color7: string;
    color8: string;
    color9: string;
    color10: string;
    color11: string;
    color12: string;
    color0: string;
    color02: string;
    color04: string;
    color06: string;
    color08: string;
    background: string;
    backgroundHover: string;
    backgroundPress: string;
    backgroundFocus: string;
    borderColor: string;
    borderColorHover: string;
    borderColorPress: string;
    borderColorFocus: string;
    accent0: string;
    accent1: string;
    accent2: string;
    accent4: string;
    accent6: string;
    accent8: string;
    accent12: string;
    accent10: string;
    accent11: string;
    accent3: string;
    accent5: string;
    accent7: string;
    accent9: string;
} & Record<string, string>>, {
    bg: string;
    br: string;
    text: "textAlign";
    b: "bottom";
    content: "alignContent";
    grow: "flexGrow";
    items: "alignItems";
    justify: "justifyContent";
    l: "left";
    m: "margin";
    maxH: "maxHeight";
    maxW: "maxWidth";
    mb: "marginBottom";
    minH: "minHeight";
    minW: "minWidth";
    ml: "marginLeft";
    mr: "marginRight";
    mt: "marginTop";
    mx: "marginHorizontal";
    my: "marginVertical";
    p: "padding";
    pb: "paddingBottom";
    pl: "paddingLeft";
    pr: "paddingRight";
    pt: "paddingTop";
    px: "paddingHorizontal";
    py: "paddingVertical";
    r: "right";
    rounded: "borderRadius";
    select: "userSelect";
    self: "alignSelf";
    shrink: "flexShrink";
    t: "top";
    z: "zIndex";
}, {
    readonly touchable: {
        pointer: string;
    };
    readonly hoverable: {
        hover: string;
    };
    readonly 'max-xxl': {
        readonly maxWidth: number;
    };
    readonly 'max-xl': {
        readonly maxWidth: number;
    };
    readonly 'max-lg': {
        readonly maxWidth: number;
    };
    readonly 'max-md': {
        readonly maxWidth: number;
    };
    readonly 'max-sm': {
        readonly maxWidth: number;
    };
    readonly 'max-xs': {
        readonly maxWidth: number;
    };
    readonly 'max-xxs': {
        readonly maxWidth: number;
    };
    readonly 'max-xxxs': {
        readonly maxWidth: number;
    };
    readonly 'max-200': {
        readonly maxWidth: number;
    };
    readonly 'max-100': {
        readonly maxWidth: number;
    };
    readonly xxxs: {
        readonly minWidth: number;
    };
    readonly xxs: {
        readonly minWidth: number;
    };
    readonly xs: {
        readonly minWidth: number;
    };
    readonly sm: {
        readonly minWidth: number;
    };
    readonly md: {
        readonly minWidth: number;
    };
    readonly lg: {
        readonly minWidth: number;
    };
    readonly xl: {
        readonly minWidth: number;
    };
    readonly xxl: {
        readonly minWidth: number;
    };
    readonly 'max-height-lg': {
        readonly maxHeight: number;
    };
    readonly 'max-height-md': {
        readonly maxHeight: number;
    };
    readonly 'max-height-sm': {
        readonly maxHeight: number;
    };
    readonly 'max-height-xs': {
        readonly maxHeight: number;
    };
    readonly 'max-height-xxs': {
        readonly maxHeight: number;
    };
    readonly 'max-height-xxxs': {
        readonly maxHeight: number;
    };
    readonly 'max-height-200': {
        readonly maxHeight: number;
    };
    readonly 'max-height-100': {
        readonly maxHeight: number;
    };
    readonly 'height-sm': {
        readonly minHeight: number;
    };
    readonly 'height-md': {
        readonly minHeight: number;
    };
    readonly 'height-lg': {
        readonly minHeight: number;
    };
}, {
    '0ms': string;
    '50ms': string;
    '75ms': string;
    '100ms': string;
    '200ms': string;
    '250ms': string;
    '300ms': string;
    '400ms': string;
    '500ms': string;
    superBouncy: string;
    bouncy: string;
    superLazy: string;
    lazy: string;
    medium: string;
    slowest: string;
    slow: string;
    quick: string;
    quickLessBouncy: string;
    quicker: string;
    quickerLessBouncy: string;
    quickest: string;
    quickestLessBouncy: string;
}, {
    body: {
        readonly family: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"";
        readonly size: {
            readonly 1: 12;
            readonly 2: 14;
            readonly 3: 16;
            readonly 4: 18;
            readonly 5: 20;
            readonly 6: 24;
            readonly 7: 28;
            readonly 8: 32;
        };
        readonly lineHeight: {
            readonly 1: 16;
            readonly 2: 20;
            readonly 3: 24;
            readonly 4: 28;
            readonly 5: 28;
            readonly 6: 32;
            readonly 7: 36;
            readonly 8: 40;
        };
        readonly weight: {
            readonly 1: "400";
            readonly 2: "500";
            readonly 3: "600";
            readonly 4: "700";
        };
        readonly letterSpacing: {
            readonly 1: 0;
            readonly 2: 0;
            readonly 3: 0;
            readonly 4: 0;
        };
    };
    heading: {
        readonly family: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"";
        readonly size: {
            readonly 1: 12;
            readonly 2: 14;
            readonly 3: 16;
            readonly 4: 18;
            readonly 5: 20;
            readonly 6: 24;
            readonly 7: 28;
            readonly 8: 32;
            readonly 9: 36;
            readonly 10: 44;
            readonly 11: 52;
            readonly 12: 60;
        };
        readonly lineHeight: {
            readonly 1: 16;
            readonly 2: 20;
            readonly 3: 24;
            readonly 4: 28;
            readonly 5: 28;
            readonly 6: 32;
            readonly 7: 36;
            readonly 8: 40;
            readonly 9: 44;
            readonly 10: 48;
            readonly 11: 56;
            readonly 12: 64;
        };
        readonly weight: {
            readonly 1: "400";
            readonly 2: "500";
            readonly 3: "600";
            readonly 4: "700";
        };
        readonly letterSpacing: {
            readonly 1: 0;
            readonly 2: 0;
            readonly 3: 0;
            readonly 4: 0;
        };
    };
    mono: {
        family: string;
        size: {
            1: number;
            2: number;
            3: number;
            4: number;
            true: number;
            5: number;
            6: number;
            7: number;
            8: number;
        };
        lineHeight: {
            1: number;
            2: number;
            3: number;
            4: number;
            true: number;
            5: number;
            6: number;
            7: number;
            8: number;
        };
        weight: {
            1: string;
            2: string;
            3: string;
            4: string;
        };
        letterSpacing: {
            1: number;
            2: number;
            3: number;
            4: number;
        };
    };
}, {
    styleCompat: "legacy";
    defaultPosition: "relative";
    mediaQueryDefaultActive: {
        touchable: boolean;
        hoverable: boolean;
        "max-xxl": boolean;
        "max-xl": boolean;
        "max-lg": boolean;
        "max-md": boolean;
        "max-sm": boolean;
        "max-xs": boolean;
        "max-xxs": boolean;
        "max-xxxs": boolean;
        xxxs: boolean;
        xxs: boolean;
        xs: boolean;
        sm: boolean;
        md: boolean;
        lg: boolean;
        xl: boolean;
        xxl: boolean;
        "max-height-sm": boolean;
        "max-height-md": boolean;
        "max-height-lg": boolean;
        "height-sm": boolean;
        "height-md": boolean;
        "height-lg": boolean;
    };
    defaultFont: string;
    fastSchemeChange: true;
    shouldAddPrefersColorThemes: true;
    allowedStyleValues: "somewhat-strict-web";
    addThemeClassName: "html";
    onlyAllowShorthands: true;
}, "default">;
export type AppConfig = typeof config;
declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {
    }
}
export type Config = typeof config;
export default config;
//# sourceMappingURL=tamagui.config.d.ts.map