/**
 * Resolve FX snapshot for a ledger leg at post time.
 *
 * `fxRate` is reporting-currency units per one unit of the leg amount
 * (`reportingAmount = amount * fxRate`). Same-unit legs use rate `1`.
 */
export function resolveEntryFx(options: {
  amount: number
  unitId: string
  reportingUnitId: string | null | undefined
  fxRate?: number | null
}): { reportingAmount: number | null; fxRate: number | null } {
  const { amount, unitId, reportingUnitId, fxRate } = options

  if (!reportingUnitId || unitId === reportingUnitId) {
    return { reportingAmount: amount, fxRate: 1 }
  }

  if (fxRate == null || !Number.isFinite(fxRate) || fxRate === 0) {
    throw new Error(
      'fxRate is required on entries when the account unit differs from the workspace reporting currency',
    )
  }

  return {
    fxRate,
    reportingAmount: amount * fxRate,
  }
}
