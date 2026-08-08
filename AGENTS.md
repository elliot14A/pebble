# pebble

Private expense tracking. Invite-only, no sign-up.

## Stack

Bun for tooling, Cloudflare Workers for the runtime, Hono with `hono/jsx`, htmx
for swaps, Alpine for local state, Tailwind v4, Drizzle over D1. `Bun.*` is
banned inside `src/`; platform code belongs in `scripts/`.

## Layout

| Dir | Owns |
|---|---|
| `core/` | Pure rules. No I/O, no imports from anywhere else. Returns `Result`. |
| `app/` | Operations spanning more than one action. |
| `infra/d1/` | `schema.ts`, `connection.ts`, `actions/<resource>/<action>.ts` — one exported function per file, database as the first argument. |
| `infra/r2/`, `infra/openai/` | The bucket and the model. |
| `infra/web/` | `routes/`, `views/`, `context.ts`, `errorMapper.ts`, `app.tsx`. |
| `infra/client/` | Browser bundle: pure `core/`, thin `dom/`, `sw/`. |
| `worker.ts` | Entry point, including the scheduled handler. |

Dependencies point one way: `infra/web -> app -> infra/d1 -> core`. Nothing
outside `infra/` imports Hono, Drizzle or a binding.

No dependency injection. No ports, repositories, adapters, stores or use-cases —
not the words and not the indirection.

## Money

Integer minor units with the currency beside them. No floats. Conversion goes
through BigInt and rounds half away from zero.

A rate is frozen onto the row when it is written. A row with no rate available
is saved and flagged `fxPending`, never blocked or guessed at.

A refund reduces spending; it is not income. Transfers stay out of both sides.

## Errors

`neverthrow` throughout. `core`, `infra/d1` and `app` return `AppResult<T>` and
never throw. `connection.ts` turns a rejected query into an `AppError`.
`errorMapper.ts` turns an `AppError` into a status.

## Privacy

Every query in `infra/d1/` is scoped by `userId` in SQL. No route takes a
`userId` from the request. `super_admin` grants the People console, not a ledger.

`/s/:token` is the only path reachable without a session. A share is frozen to a
date window, unguessable, revocable and expiring.

## Auth

PBKDF2-SHA256 through WebCrypto at 100,000 iterations, which is the Workers
ceiling. Session tokens are random and stored only as their SHA-256.

Sign-in returns one refusal for every kind of failure and spends the hashing
time even when the username is unknown. Eight wrong tries lock the account for
fifteen minutes.

Accounts are made by an administrator with a temporary password. Disabling an
account or resetting its password drops every live session.

## Receipts

Photos go to R2 keyed by owner. Removing one deletes the object and the row.

Reading a receipt speaks plain OpenAI chat-completions; the provider, model and
extra body are config. The reply is untrusted: every field is validated and
anything invalid becomes null. A failed reading never fails the upload.

## Scheduled work

The cron runs for every user. It catches up missed runs in order, and each entry
carries a deterministic `clientId` so a re-fire cannot double-charge. A bill
stays standing until marked paid; a recurring transaction writes itself.

## Views

`(props) => JSX`, no I/O. `core` never imports them. htmx swaps fragments;
Alpine holds only what is local to a sheet. Anything that must work without
JavaScript is a plain form.

## Style

Sentence case, never Title Case. Labels 12px, 600 weight. Money in tabular
numerals. Destructive actions are red and go through a confirm dialog. Motion
respects `prefers-reduced-motion`.

No comments in the code.

## Testing

Against a real local D1 through `getPlatformProxy`, never a double.
`wrangler.test.jsonc` keeps tests off the network. Under 100 tests.
