import { TransactionDetailRoute } from '@/app/(frontend)/_components/transaction-detail-route'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { loadTransactionDetailPageData } from '@/lib/frontend/transaction-detail.server'

export default async function TransactionDetailPage(props: {
  params: Promise<{ transactionId: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { transactionId } = await props.params
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser(`/transactions/${transactionId}`)
  const data = await loadTransactionDetailPageData({
    transactionId,
    user,
    headers,
    viewParam: searchParams.view,
  })

  return <TransactionDetailRoute {...data} />
}
