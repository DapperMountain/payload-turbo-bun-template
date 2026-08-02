import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Move notes from transaction headers onto transaction-entries (per-leg notes).
 * Legacy header notes land on the first entry for each transaction (by sort_order).
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries" ADD COLUMN IF NOT EXISTS "notes" varchar;
  `)

  // Push-based DBs may already lack header `transactions.notes` — only copy when present.
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'notes'
      ) THEN
        UPDATE "transaction_entries" AS entry
        SET "notes" = tx."notes"
        FROM "transactions" AS tx
        WHERE entry."transaction_id" = tx."id"
          AND tx."notes" IS NOT NULL
          AND TRIM(tx."notes") <> ''
          AND entry."id" = (
            SELECT e2."id"
            FROM "transaction_entries" AS e2
            WHERE e2."transaction_id" = tx."id"
            ORDER BY e2."sort_order" ASC NULLS LAST, e2."id" ASC
            LIMIT 1
          );

        ALTER TABLE "transactions" DROP COLUMN IF EXISTS "notes";
      END IF;
    END $$;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_notes";
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "notes" varchar;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" ADD COLUMN IF NOT EXISTS "version_notes" varchar;
  `)

  await payload.db.drizzle.execute(sql`
    UPDATE "transactions" AS tx
    SET "notes" = entry."notes"
    FROM "transaction_entries" AS entry
    WHERE entry."transaction_id" = tx."id"
      AND entry."notes" IS NOT NULL
      AND TRIM(entry."notes") <> ''
      AND entry."id" = (
        SELECT e2."id"
        FROM "transaction_entries" AS e2
        WHERE e2."transaction_id" = tx."id"
          AND e2."notes" IS NOT NULL
          AND TRIM(e2."notes") <> ''
        ORDER BY e2."sort_order" ASC NULLS LAST, e2."id" ASC
        LIMIT 1
      );
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries" DROP COLUMN IF EXISTS "notes";
  `)
}
