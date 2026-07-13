import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Remove void-of self-reference columns (void status removed from transactions). */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    DROP CONSTRAINT IF EXISTS "transactions_void_of_id_transactions_id_fk";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    DROP COLUMN IF EXISTS "void_of_id";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    DROP CONSTRAINT IF EXISTS "_transactions_v_version_void_of_id_transactions_id_fk";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    DROP COLUMN IF EXISTS "version_void_of_id";
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD COLUMN IF NOT EXISTS "void_of_id" uuid;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_void_of_id_transactions_id_fk"
    FOREIGN KEY ("void_of_id") REFERENCES "transactions"("id") ON DELETE SET NULL;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD COLUMN IF NOT EXISTS "version_void_of_id" uuid;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD CONSTRAINT "_transactions_v_version_void_of_id_transactions_id_fk"
    FOREIGN KEY ("version_void_of_id") REFERENCES "transactions"("id") ON DELETE SET NULL;
  `)
}
