import type { ComponentType } from 'react';
/**
 * Tamagui `tamagui-build` types can be too strict for token props (`$background`, etc.) in app code.
 * Wrap primitives once here instead of casting in each app.
 */
export type StyledComponent = ComponentType<Record<string, unknown>>;
export declare function asStyled<T>(component: T): StyledComponent;
//# sourceMappingURL=types.d.ts.map