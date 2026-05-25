# Collections

Payload collections use a **folder per collection** (not a single `Users.ts` at this level). See [Code conventions](../../docs/CODE_CONVENTIONS.md#collections-folder-per-collection).

- Add `collections/<Name>/index.ts` with the `CollectionConfig`.
- Register in [`index.ts`](./index.ts).
- Put hooks in `hooks/index.ts`; access maps in `@/access/collections` (one file per slug).

## Integration tests

Optional CRUD smoke tests live next to the collection:

```text
collections/Tenants/tenants.integration.spec.ts
```

- Naming: `<slug>.integration.spec.ts`
- Run: `bun test ./src/collections` (Postgres + `DATABASE_URL_TEST` required; see `docs/TESTING.md` (integration section))
- Policy / access: unit tests in `src/access/collections/<slug>.access.spec.ts` — not duplicated here

See [Testing](../../docs/TESTING.md#integration-tests) for when to add a spec, helpers, and `overrideAccess`.
