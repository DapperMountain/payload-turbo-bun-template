import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Rename transactions.memo → payee (register title / merchant name).
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" RENAME COLUMN "memo" TO "payee";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" RENAME COLUMN "version_memo" TO "version_payee";
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" RENAME COLUMN "payee" TO "memo";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" RENAME COLUMN "version_payee" TO "version_memo";
  `)
}
