import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Rename transaction status values: draft → pending; void → pending (void status removed).
 * Push-based DBs may already lack draft/void enum labels — no-op when absent.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_transactions_status'
          AND e.enumlabel = 'draft'
      ) THEN
        UPDATE "transactions"
        SET "status" = 'pending'::"enum_transactions_status"
        WHERE "status"::text = 'draft';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_transactions_status'
          AND e.enumlabel = 'void'
      ) THEN
        UPDATE "transactions"
        SET "status" = 'pending'::"enum_transactions_status"
        WHERE "status"::text = 'void';
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
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_transactions_status'
          AND e.enumlabel = 'draft'
      ) THEN
        UPDATE "transactions"
        SET "status" = 'draft'::"enum_transactions_status"
        WHERE "status"::text = 'pending';
      END IF;
    END $$;
  `)
}
