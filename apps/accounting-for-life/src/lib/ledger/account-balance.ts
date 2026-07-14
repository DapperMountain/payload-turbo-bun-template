/**
 * Account balance helpers derived from posted transaction-entry amounts.
 *
 * Signed convention: positive = debit, negative = credit. Under this model's
 * UI posting rules, Σ amounts is the account balance for both assets and liabilities.
 */

export type BalanceAmountRow = {
  amount: number
  status: string
}

/** Sum signed entry amounts (caller filters to posted). */
export function sumSignedAmounts(amounts: Iterable<number>): number {
  let total = 0
  for (const amount of amounts) {
    total += amount
  }
  return total
}

/**
 * Attach running balances for a newest-first register.
 * Top row (newest posted) shows the ending balance; older posted rows walk down.
 * Pending rows leave `runningBalance` undefined (do not move the running total).
 */
export function attachNewestFirstRunningBalances<T extends BalanceAmountRow>(
  rowsNewestFirst: T[],
  endingBalance: number,
): Array<T & { runningBalance?: number }> {
  let running = endingBalance

  return rowsNewestFirst.map((row) => {
    if (row.status !== 'posted') {
      return { ...row, runningBalance: undefined }
    }

    const withBalance = { ...row, runningBalance: running }
    running -= row.amount
    return withBalance
  })
}

/**
 * Chronological (oldest-first) running balances after each amount.
 * Useful for tests and API views ordered by date ascending.
 */
export function runningBalancesOldestFirst(amountsOldestFirst: number[]): number[] {
  let running = 0
  return amountsOldestFirst.map((amount) => {
    running += amount
    return running
  })
}
