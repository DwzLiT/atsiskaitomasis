# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Backend (Supabase + API)

1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.example` to `.env` and fill `SUPABASE_PROJECT_ID` and `SUPABASE_KEY` (service_role key; server-side only, `.env` is git-ignored).
3. `npm run seed` loads sample instruments, traders and tickets.
4. `npm run server` (API on :3001) and `npm run dev` (Vite proxies `/api`).

Model: `traders` 1—N `tickets` (BUY/SELL order tickets); `positions` hold current shares; `instruments` hold prices. Tickets execute atomically via the `place_ticket` SQL function.

API: `GET /api/traders`, `GET /api/traders/:id`, `GET /api/traders/:id/tickets`, `GET /api/traders/:id/positions`, `GET /api/quotes/:symbol`, `POST /api/tickets` `{trader_id, symbol, side, quantity}`.
