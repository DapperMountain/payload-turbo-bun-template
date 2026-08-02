import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Rename transactions.memo → payee (register title / merchant name).
 * Push-based DBs may already have `payee` — no-op when `memo` is absent.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'memo'
      ) THEN
        ALTER TABLE "transactions" RENAME COLUMN "memo" TO "payee";
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '_transactions_v'
          AND column_name = 'version_memo'
      ) THEN
        ALTER TABLE "_transactions_v" RENAME COLUMN "version_memo" TO "version_payee";
      END IF;
    END $$;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'payee'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'memo'
      ) THEN
        ALTER TABLE "transactions" RENAME COLUMN "payee" TO "memo";
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '_transactions_v'
          AND column_name = 'version_payee'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '_transactions_v'
          AND column_name = 'version_memo'
      ) THEN
        ALTER TABLE "_transactions_v" RENAME COLUMN "version_payee" TO "version_memo";
      END IF;
    END $$;
  `)
}
