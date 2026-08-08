# pebble

Private expense tracking. One Cloudflare Worker, one D1 database,
no sign-up.

Live at [pebble.elliot14a.work](https://pebble.elliot14a.work).

## Run it

```bash
bun install
bun run db:migrate:local
bun run seed
bun run dev
```

Sign in as `akshith` with the password the seed prints.

## Commands

```bash
bun run dev      # local server on :3000
bun run check    # lint, format and types
bun test         # against a real local D1
bun run build    # icons, client bundle, css
bun run deploy   # migrate remote, then deploy
```

## Config

Copy `.dev.vars.example` to `.dev.vars`. Reading receipts needs an
OpenAI-compatible key; everything else works without one.

In production these are Worker vars, and the key is a secret:

```bash
bunx wrangler secret put PEBBLE_OPENAI_API_KEY
```

## Layout

```
src/core     pure rules, no I/O
src/app      operations that span more than one action
src/infra    d1, r2, openai, web, client
```

Conventions live in [AGENTS.md](AGENTS.md).
