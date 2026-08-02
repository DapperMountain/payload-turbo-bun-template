import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Payee lives only on `transaction_entries.payee` (merchants); transfers use accounts.
 * Drops the transaction-level payee and its versions twin.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      ALTER TABLE "transactions" DROP COLUMN IF EXISTS "payee";

      IF to_regclass('public._transactions_v') IS NOT NULL THEN
        ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_payee";
      END IF;
    END $$;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "payee" varchar;

      IF to_regclass('public._transactions_v') IS NOT NULL THEN
        ALTER TABLE "_transactions_v" ADD COLUMN IF NOT EXISTS "version_payee" varchar;
      END IF;
    END $$;
  `)
}
