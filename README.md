# Horizon (banking_app)

A banking dashboard built with Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, and Chart.js.

## Status

- **Built:** home page with a greeting, total balance (animated), and a doughnut chart of account balances.
- **Mock data:** the home page uses sample accounts in `app/(root)/page.tsx` until a bank data source is connected.
- **Placeholders:** `/sign-in` and `/sign-up`.
- **Planned:** Plaid (sandbox) for bank data, Appwrite for auth and storage, Sentry for monitoring.

## Run

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev         # http://localhost:3000
npm run build       # production build (includes a typecheck)
npm run lint        # ESLint (flat config in eslint.config.mjs)
npm run typecheck   # tsc --noEmit
npm test            # unit tests for lib/ (node:test, no extra deps)
```

## Layout

- `app/`: routes. `(root)` is the signed-in area, `(auth)` holds sign-in and sign-up.
- `components/`: UI components. Add shadcn/ui components with `npx shadcn@latest add <name>`.
- `lib/utils.ts`: formatting and helper functions, tested in `lib/utils.test.ts`.
- `app/globals.css`: Tailwind 4 config lives here (`@theme` for colors and fonts, `@utility` for custom classes); there is no `tailwind.config` file.
- `constants/`: sidebar links and category styles.
- `types/index.d.ts`: global types.

The `@/` import alias points at the project root, so `@/components/HeaderBox` is `components/HeaderBox.tsx`.
