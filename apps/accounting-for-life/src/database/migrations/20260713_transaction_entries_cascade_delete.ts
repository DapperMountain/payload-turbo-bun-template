import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * transaction_entries.transaction_id is NOT NULL but Payload generated ON DELETE SET NULL,
 * which blocks parent deletes. Cascade removes legs when a transaction is deleted.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries"
    DROP CONSTRAINT IF EXISTS "transaction_entries_transaction_id_transactions_id_fk";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries"
    ADD CONSTRAINT "transaction_entries_transaction_id_transactions_id_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries"
    DROP CONSTRAINT IF EXISTS "transaction_entries_transaction_id_transactions_id_fk";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries"
    ADD CONSTRAINT "transaction_entries_transaction_id_transactions_id_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;
  `)
}
