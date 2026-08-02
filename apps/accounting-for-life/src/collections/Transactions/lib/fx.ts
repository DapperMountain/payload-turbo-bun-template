/**
 * Resolve FX snapshot for a ledger leg at post time.
 *
 * - Effective quote = `quoteUnitId ?? reportingUnitId`
 * - Persisted `fxRate` on the entry is **quote units per 1 account unit**
 * - When quote ≠ reporting, `quoteToReportingRate` is **reporting per 1 quote**
 * - `reportingAmount = amount * rateToQuote * quoteToReportingRate` when that
 *   chain is known; otherwise `reportingAmount` is left null (valuation deferred —
 *   e.g. crypto swap logged without a USD price yet)
 *
 * Same-unit-as-quote legs use rate `1`. Same-quote-as-reporting leaves
 * `quoteToReportingRate` as identity `1`.
 */
export function effectiveQuoteUnitId(options: {
  quoteUnitId?: string | null
  reportingUnitId: string | null | undefined
}): string | null {
  return options.quoteUnitId ?? options.reportingUnitId ?? null
}

export function resolveEntryFx(options: {
  amount: number
  unitId: string
  reportingUnitId: string | null | undefined
  /** Transaction quote unit; defaults to workspace reporting currency. */
  quoteUnitId?: string | null
  /** Quote units per 1 account unit when unit ≠ quote. */
  fxRate?: number | null
  /** Reporting units per 1 quote when quote ≠ reporting. */
  quoteToReportingRate?: number | null
}): { reportingAmount: number | null; fxRate: number | null } {
  const { amount, unitId, reportingUnitId, fxRate, quoteToReportingRate } = options
  const quoteUnitId = effectiveQuoteUnitId({
    quoteUnitId: options.quoteUnitId,
    reportingUnitId,
  })

  if (!quoteUnitId) {
    return { reportingAmount: amount, fxRate: 1 }
  }

  let rateToQuote: number
  if (unitId === quoteUnitId) {
    rateToQuote = 1
  } else {
    if (fxRate == null || !Number.isFinite(fxRate) || fxRate === 0) {
      throw new Error(
        'fxRate is required on entries when the account unit differs from the transaction quote unit',
      )
    }
    rateToQuote = fxRate
  }

  if (!reportingUnitId || quoteUnitId === reportingUnitId) {
    return {
      fxRate: rateToQuote,
      reportingAmount: amount * rateToQuote,
    }
  }

  if (
    quoteToReportingRate == null ||
    !Number.isFinite(quoteToReportingRate) ||
    quoteToReportingRate === 0
  ) {
    // Quote balance is still enforced; USD (reporting) snapshot waits for a feed or override.
    return {
      fxRate: rateToQuote,
      reportingAmount: null,
    }
  }

  return {
    fxRate: rateToQuote,
    reportingAmount: amount * rateToQuote * quoteToReportingRate,
  }
}

/** Amount in quote space for balance checks (`amount * rateToQuote`). */
export function quoteAmountForEntry(options: {
  amount: number
  unitId: string
  quoteUnitId: string
  fxRate?: number | null
}): number {
  const { amount, unitId, quoteUnitId, fxRate } = options

  if (unitId === quoteUnitId) {
    return amount
  }

  if (fxRate == null || !Number.isFinite(fxRate) || fxRate === 0) {
    throw new Error(
      'fxRate is required on entries when the account unit differs from the transaction quote unit',
    )
  }

  return amount * fxRate
}
