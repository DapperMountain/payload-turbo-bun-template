import { budgetContentScope, budgetContentWriterScope, budgetDocumentScope } from './budgetContentScope'
import { BUDGET_WRITER_ROLES } from '@/utils'

/** Read any budget the user belongs to. */
export const isBudgetMember = budgetDocumentScope()

/** Update/delete budget documents as budget admin. */
export const isBudgetAdmin = budgetDocumentScope('BUDGET_ADMIN')

/** Read budget-owned content for any membership role. */
export const isBudgetContent = budgetContentScope()

/** Create/update budget-owned content (not readonly). */
export const isBudgetContentWriter = budgetContentWriterScope()

/** Budget admins only on content rows. */
export const isBudgetContentAdmin = budgetContentScope('BUDGET_ADMIN')

/** Explicit writer-role document filter (admin + member). */
export const isBudgetContentMemberOrAdmin = budgetContentScope(BUDGET_WRITER_ROLES)
