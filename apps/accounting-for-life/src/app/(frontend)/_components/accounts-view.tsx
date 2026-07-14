import Link from 'next/link'
import { getAppPayload } from '@/lib/frontend/payload.server'
import { Suspense } from 'react'

import { AccountFormDialog } from '@/app/(frontend)/_components/account-form-dialog'
import { PayloadFilterBar } from '@/app/(frontend)/_components/payload-filter-bar'
import { accountFilterFields } from '@/lib/filters/fields'
import { parseFiltersParam } from '@/lib/filters/parse'
import { sumPostedBalancesByAccount } from '@/lib/frontend/account-transactions.server'
import { findFilteredAccounts } from '@/lib/frontend/transaction-query.server'
import type { Account, User } from '@/types'
import { getRequestI18n } from '@/utils/i18n.server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dappermountain/ui/components/table'
import { ChevronRight } from '@dappermountain/ui/icons'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

export type AccountsViewProps = {
  accounts: Account[]
  balancesByAccountId: Record<string, number>
  budgets: { id: string; name: string }[]
  units: { id: string; label: string }[]
}

export async function AccountsViewLoader(props: {
  user: User
  workspaceId: string
  filtersRaw?: string
}) {
  const payload = await getAppPayload()
  const clauses = parseFiltersParam(props.filtersRaw)
  const result = await findFilteredAccounts(payload, {
    user: props.user,
    workspaceId: props.workspaceId,
    clauses,
  })

  const [budgets, units, balances] = await Promise.all([
    payload.find({
      collection: 'budgets',
      where: { workspace: { equals: props.workspaceId } },
      limit: 50,
      depth: 0,
      user: props.user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'units',
      where: { workspace: { equals: props.workspaceId } },
      limit: 50,
      depth: 0,
      user: props.user,
      overrideAccess: false,
    }),
    sumPostedBalancesByAccount(payload, {
      user: props.user,
      workspaceId: props.workspaceId,
      accountIds: result.docs.map((account) => account.id),
    }),
  ])

  return (
    <AccountsView
      accounts={result.docs}
      balancesByAccountId={Object.fromEntries(balances)}
      budgets={budgets.docs.map((b) => ({ id: b.id, name: b.name }))}
      units={units.docs.map((u) => ({ id: u.id, label: `${u.code} — ${u.name}` }))}
    />
  )
}

export async function AccountsView(props: AccountsViewProps) {
  const { accounts, balancesByAccountId, budgets, units } = props
  const { t } = await getRequestI18n()

  const relationshipOptions = {
    budget: budgets.map((b) => ({ id: b.id, label: b.name })),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('custom:collections:accounts:plural')}</h1>
          <p className="text-sm text-muted-foreground">{t('custom:collections:accounts:description')}</p>
        </div>
        <AccountFormDialog budgets={budgets} units={units} />
      </div>

      <Suspense fallback={null}>
        <PayloadFilterBar fields={accountFilterFields} relationshipOptions={relationshipOptions} />
      </Suspense>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('custom:frontend:filters:fields:name')}</TableHead>
              <TableHead>{t('custom:frontend:filters:fields:classification')}</TableHead>
              <TableHead>{t('custom:frontend:filters:fields:subtype')}</TableHead>
              <TableHead>{t('custom:frontend:filters:fields:budget')}</TableHead>
              <TableHead className="text-right">{t('custom:frontend:accounts:balance')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  {t('custom:frontend:accounts:empty')}
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow className="hover:bg-muted/40" key={account.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/accounts/${account.id}`}>
                      {account.name}
                    </Link>
                  </TableCell>
                  <TableCell>{t(`custom:fields:accounts:classification:${account.classification}`)}</TableCell>
                  <TableCell>{t(`custom:fields:accounts:subtype:${account.subtype}`)}</TableCell>
                  <TableCell>
                    {typeof account.budget === 'object' && account.budget ? account.budget.name : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(balancesByAccountId[account.id] ?? 0)}
                  </TableCell>
                  <TableCell className="w-10">
                    <Link
                      aria-label={t('custom:frontend:accounts:viewTransactions')}
                      className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
                      href={`/accounts/${account.id}`}
                    >
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
