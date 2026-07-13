import config from '@config'
import payloadConfig from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, beforeAll } from 'bun:test'
import { Payload, getPayload } from 'payload'

let payload: Payload

export function isTestEnv() {
  return config.isTest
}

export function throwIfNotTestEnv() {
  if (!isTestEnv()) throw Error('process.env.NODE_ENV needs to be set to `test`')
}

async function truncateAllTables(instance: Payload): Promise<void> {
  const result = await instance.db.drizzle.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `)

  const rows = (result as unknown as { rows: { tablename: string }[] }).rows

  for (const { tablename } of rows) {
    await instance.db.drizzle.execute(
      sql`TRUNCATE TABLE ${sql.raw(tablename)} RESTART IDENTITY CASCADE;`,
    )
  }
}

beforeAll(async () => {
  // Throw an error if we're not in the test environment so we don't reset the wrong database
  throwIfNotTestEnv()

  try {
    payload = await getPayload({ config: payloadConfig })
    await truncateAllTables(payload)
  } catch (error) {
    console.error('Error during setup:', error)
    throw error // Re-throw to fail the test if necessary
  }
})

afterAll(async () => {
  // Throw an error if we're not in the test environment so we don't reset the wrong database
  throwIfNotTestEnv()

  await truncateAllTables(payload)
})

export { payload }
