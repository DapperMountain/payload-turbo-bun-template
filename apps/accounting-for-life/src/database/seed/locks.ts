const chains = new Map<string, Promise<unknown>>()

/**
 * Serializes seed work per key (e.g. budget id or `workspaceId:budgetName`).
 */
export async function withSeedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve()
  const run = previous.then(fn, fn)
  chains.set(
    key,
    run.finally(() => {
      if (chains.get(key) === run) {
        chains.delete(key)
      }
    }),
  )
  return run
}
