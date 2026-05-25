/** True when the Bun test runner (or `NODE_ENV=test`) is active. */
export function isTestRuntime(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true
  }

  const args = process.argv

  return args.includes('test') || args.some((arg) => arg.endsWith('bun test') || arg.includes('bun test'))
}
