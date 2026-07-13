import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/** Rename transaction status values: draft → pending; void → pending (void status removed). */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  for (const status of ['draft', 'void'] as const) {
    await payload.update({
      collection: 'transactions',
      where: { status: { equals: status } },
      data: { status: 'pending' },
      overrideAccess: true,
    })
  }
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.update({
    collection: 'transactions',
    where: { status: { equals: 'pending' } },
    data: { status: 'draft' },
    overrideAccess: true,
  })
}
