/**
 * Type guard: value is a Promise (access functions may return sync or async results).
 *
 * @param value - Result of invoking an access function.
 */
export const isPromise = (value: unknown): value is Promise<boolean | import('payload').Where> =>
  typeof value === 'object' && value !== null && 'then' in value
