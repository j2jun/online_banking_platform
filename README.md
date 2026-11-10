# Horizon (banking_app)

A banking dashboard built with Next.js 14 (App Router), Tailwind CSS, shadcn/ui, and Chart.js.

## Status

- **Built:** home page with a greeting, total balance (animated), and a doughnut chart of account balances.
- **Mock data:** the home page uses sample accounts in `app/(root)/page.tsx` until a bank data source is connected.
- **Placeholders:** `/sign-in` and `/sign-up`.
- **Planned:** Plaid (sandbox) for bank data, Appwrite for auth and storage, Sentry for monitoring.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # typecheck + lint + production build
```

## Layout

- `app/`: routes. `(root)` is the signed-in area, `(auth)` holds sign-in and sign-up.
- `components/`: UI components (`components/ui` is managed by shadcn).
- `lib/utils.ts`: formatting and helper functions.
- `constants/`: sidebar links and category styles.
- `types/index.d.ts`: global types.

The `@/` import alias points at the project root, so `@/components/HeaderBox` is `components/HeaderBox.tsx`.
