import type { User } from '@/types'

/** Role on a `user.tenants[]` row (`TENANT_ADMIN`, `TENANT_USER`). */
export type TenantRole = NonNullable<User['tenants']>[number]['roles'][number]
