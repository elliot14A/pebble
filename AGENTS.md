# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific
instructions as needed. *(Preface adapted from Andrej Karpathy's CLAUDE.md -
github.com/multica-ai/andrej-karpathy-skills.)*

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use
judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
```

---

# pebble

A private finance tracker for me and my brothers, deployed as a single Cloudflare Worker at
`pebble.elliot.work`. Not a SaaS - 5 to 20 trusted users, ever.

**The product constraint is laziness.** If logging an expense takes more than a few taps it
will not happen, and an app nobody opens is worthless. Every feature is measured against
"how much work for the common case".

**An amount and a name are the only required fields.** The name is required because a
ledger of bare category totals tells you nothing three months later - "Food ₹486" is not a
memory, "Swiggy" is. Category, account and date all default, so they cost nothing unless
you want to change them. A transfer is exempt: naming both accounts already says what it
was.

**Merchant memory is what keeps a required name from meaning required typing.** Every save
records the name in `merchants`, keyed on a normalized form so "Swiggy", "swiggy" and
" Swiggy " are one shop, and remembers the category it was filed under. The quick-add sheet
offers those as one-tap chips that fill the name and pick the category, narrowing as you
type. After the first week almost nothing needs the keyboard.

**The second constraint is currency independence.** I travel. A foreign amount and its
rupee equivalent must sit side by side without me doing arithmetic.

> Bun-first, functional, errors-as-values, **Hono + htmx SSR** on Cloudflare. Code style
> follows the `portfolio` repo and the `minitraycer` assignment; the file and directory
> naming follows `gaur-server`. Keep changes surgical, simple, and verified.

## Runtime ruling - Bun is the toolchain, Workers is the target

- **Bun** runs everything *around* the code: `bun install`, `bun test`, and the build
  scripts in `scripts/`. `Bun.file` / `Bun.Glob` / `Bun.$` are allowed **only there**.
- **The Worker runtime has no `Bun.*`** and no `node:*` beyond `nodejs_compat`. Request-path
  code uses Web-standard APIs (`fetch`, `Request`/`Response`, `URL`, `crypto`) and CF
  bindings only.

Never call `Bun.*` under `src/` - biome's `noRestrictedGlobals` fails the build if you do.
`scripts/` may import `src/core/` and `src/infra/d1/` freely; it must not import `src/infra/web/`.

## Architecture - action per file, grouped by resource

**Everything is named after what it actually is.** There are no ports, repositories,
adapters, stores or use-cases in this codebase - not the words and not the indirection.
The layout mirrors `gaur-server`: one action per file, grouped by resource.

| Dir | Owns |
|---|---|
| `core/` | Pure rules, no I/O and no imports from anywhere else. `money/` (minor units, currency table, formatting), `rates/` (frozen-rate maths), `transactions/` (the model, signed amounts, balance folds), `accounts/`, `categories/`, `users/`. Returns `Result`. |
| `infra/d1/` | `schema.ts`, `connection.ts`, and `actions/<resource>/<action>.ts` - one exported function per file, each taking the database as its first argument: `create(db, tx)`, `list(db, query)`, `fetch(db, userId, id)`. An `index.ts` per resource re-exports them. |
| `app/` | Multi-step operations that span more than one action, same naming: `transactions/create.ts` (parse, validate, freeze the rate, insert), `rates/set.ts`, `accounts/balances.ts`, `overview.ts`, `quickAdd.ts`. |
| `infra/web/` | `routes/<resource>/<action>.tsx` plus a `routes.ts` per resource that assembles them, `context.ts` (who is asking, the db, the clock), `errorMapper.ts`, and `views/`. |
| `infra/client/` | Browser bundle. `core/` is **pure** (the keypad reducer); `dom/` is the thin Alpine shell; `sw/` is the service worker. |
| `infra/web/app.tsx` | Builds and exports the Hono app with **no** `fetch` export, so `app.request()` works. |
| `worker.ts` | The entry point. |

**No dependency injection.** A handler calls an action directly and passes it the database,
exactly like gaur's `postgres::actions::collections::create(&pool, ...)`. There is no
container, no factory-of-factories, and no injected function types.

Everything that touches the outside world lives under `infra/` - the database and the HTTP
surface, plus the browser bundle - which is the ring the standards call `infra`. `core/` and
`app/` never reach past it, and nothing outside `infra/` imports Hono, Drizzle or a D1
binding.

Direction still only ever points one way: `infra/web -> app -> infra/d1 -> core`.
`core` imports nothing; `infra/d1` imports `core`; nothing outside `infra/web` imports Hono
or `hono/jsx`.

Views are pure `(props) => JSX` with no I/O; `core` never imports them.

## Money rules - non-negotiable

- **No float ever touches money.** Amounts are integers in the currency's minor unit.
  `core/money` owns the currency table and its exponents (INR 2, JPY 0, KWD 3).
- **Never add two amounts of different currencies.** `core/money` makes this a type error.
- **An account is denominated once.** A transaction inherits its account's currency, so the
  fast path never shows a currency control.
- **Rates freeze at save time.** A transaction stores `baseAmountMinor` and `fxRateE8`
  (rate x 10^8 as an integer). Editing a rate later never rewrites history.
- **A missing rate never blocks a save.** The row saves with `fxPending`, and the ledger
  offers a one-tap fix.

## Types & errors - errors as values

- **`neverthrow`.** `core`, `infra/d1` and `app` return `AppResult<T>` / `AppResultAsync<T>` and never
  throw for expected failure. `d1/connection.ts` is the single place a rejected query
  becomes an `AppError`; nothing above it sees an exception.
- **`AppError` taxonomy, minitraycer style.** Codes are grouped `const` objects of coded
  strings (`ResourceErrorCode.NOT_FOUND = "RES_ERR_01"`) unioned into `AppErrorCode`, and a
  single `appError(code, message, info?)` factory builds `{ code; message; cause?; meta? }`.
  A new failure is a new code in `core/error.ts` plus one line in the exhaustive
  `Record<AppErrorCode, ...>` mapper.
- **One central `errorToHttp(AppError)`** in `web/errorMapper.ts`. It is the only
  place the taxonomy meets HTTP.
- **Never leak a `Result` into a view.** Unwrap in the route handler; views receive plain
  props.
- **Exhaustiveness.** `switch` on a discriminant with a `never` `default`, or an exhaustive
  `Record` keyed by the union. String unions, no `enum`.
- **Immutability.** `readonly` fields, `Readonly<>` / `ReadonlyArray<>` on every signature.

## Reading the numbers

- **A refund reduces what you spent, it is not money earned.** Both readings leave savings
  identical, but only this one makes "out this month" agree with the category totals under
  it. `flowMinor` and `byCategory` must never disagree on screen.
- **Direction is not the same as good.** Spending more is worse; earning more is better. Any
  delta has to be told which way is up, so `Delta` takes `upIsGood` rather than guessing
  from the sign.
- **Growth from nothing is not a percentage.** `changeBps` returns null when the previous
  value was zero, and the view says "new" instead of inventing an infinity.
- **Every chart handles an empty month.** A month with no spending says so rather than
  drawing an empty axis or dividing by a zero maximum.

## Storage ruling - D1 for everything

**There is no KV.** Rate limits, quotas, caches and sessions all live in D1 tables. One
store means one mental model, one backup, one place to look, and transactional consistency
between a counter and the rows it guards. Reach for R2 only for receipt bytes, which are
not relational data.

## Authorization

Every query in `d1/actions/` is scoped by `userId` **in SQL**, not in a handler. A forgotten
filter therefore narrows the result instead of widening it past this user's rows.

`web/context.ts` resolves the user from an opaque session cookie. Only the SHA-256 of the
token is stored, so a leaked database row cannot be replayed as a login. Passwords are
PBKDF2-SHA256 with 210k iterations through WebCrypto; there is no password dependency.

Roles are checked in middleware (`adminOnly`), never in a view. Every non-GET request is
checked against `Origin` (`sameOrigin`), which is the other half of `SameSite=Lax`.

Accounts are made in `/admin/users` by an administrator, with a temporary password handed
over in person. There is no sign-up, no email, no reset link, and nothing to phish. A first
sign-in is forced through `/password` before anything else is reachable. Disabling an
account or resetting its password drops every live session for that user, because an
account that stays logged in after you revoke it is not revoked.

Sign-in refuses with one message for every kind of failure, and spends the hashing time
even when the username does not exist, so a stopwatch cannot tell a missing user from a
wrong password. Eight wrong tries lock the account for fifteen minutes.

## Budgets

A budget is a monthly limit that repeats: one row per category, plus at most one overall row
with a null `categoryId`. Setting the same target twice replaces the limit rather than
stacking a second row. Spending is measured with the same `spendMinor` the analytics use, so
a refund gives the budget back and a transfer never touches it.

Pace matters more than the total: `elapsedBps` says how much of the month has gone, and the
bar draws that as a marker so being at 60% on the 20th reads as behind, not fine.

## Sharing

Spending is private per person. There is no route anywhere that takes a `userId` from the
request, and being `super_admin` does not change that: the admin console manages accounts,
it never reads a ledger.

The one way out is a **share link**, created deliberately by the owner. `/s/:token` is the
only path outside `/login` that a request with no session may reach. A share is frozen to a
date window, carries an unguessable 24-byte token, and is revocable and expiring; `view()`
refuses a token that is unknown, revoked, expired, or whose owner has been disabled. Entries
inside the window stay live, so a "this month" link keeps filling as the month runs.

Share tokens are stored as-is rather than hashed, unlike session tokens, because the owner
has to be able to copy the link again later. They are capability URLs: treat a leaked row as
a leaked link and revoke it.

## Receipts

Photos live in R2 under `u/<userId>/<receiptId>` and the row in D1 carries the key. Removing
a receipt deletes the object **and** the row - a bucket full of orphans is a leak, not a
cache. `/receipts/:id` reads the row scoped by `userId` before it touches the bucket, so the
key alone is not enough to fetch someone else's photo.

Reading a receipt is the only place a model runs. It goes out through OpenRouter with the
OpenAI SDK - `infra/openrouter/receipt.ts` - so the model is a string in
`PEBBLE_RECEIPT_MODEL` and swapping it needs no code change. Without `OPENROUTER_API_KEY`
the scan endpoint answers 503 and says so; everything else keeps working. It is best-effort by construction: if the
model errors or returns rubbish, the photo is still stored and the fields are simply left for
the person to type. Never let a failed reading fail the upload.

The model's reply is untrusted text. `core/receipts/reading.ts` carves the JSON out of
whatever chatter comes back and validates every field: an amount must be a positive number,
a merchant must contain two letters, a date must be a real date that is not in the future.
Anything else becomes null. Fields are always presented for the person to check, never saved
behind their back.

Never trust the frontend. Never trust the route either.

## Wiring

There is none to speak of, and that is the point. `web/context.ts` builds one `Context`
per request - `{ db, user, baseCurrency, now, today }` - and a handler passes what it needs
straight into an action or a service. The clock is read **once** per request, so a single
request cannot straddle two days.

## SSR & htmx rules

- **The server owns what is displayed; the client owns the sheet.** Keypad digits, chip
  selection and sheet open/close resolve client-side with no round-trip. Saving is an htmx
  POST that returns the new ledger row plus `hx-swap-oob` balance and budget fragments.
- **Every route branches on `HX-Request`**: fragment for htmx, full page otherwise. The
  no-JS path must render a usable app - every nav affordance is a real `<a href>`.
- **A save must never block on the network.** The client writes to an IndexedDB outbox with
  a `clientId`, renders optimistically, and replays. `transactions.clientId` is uniquely
  indexed so replay is idempotent.
- **A save answers with a trigger, not markup.** `POST /transactions` returns 204 plus
  `HX-Trigger: pebble:saved`, and the ledger re-fetches its own list fragment. Hand-assembling
  a partial swap in the write route got the day grouping, the running total and any active
  filter wrong in three different ways; one owner of the list is the fix.
- **Paging is by whole day, never by row.** A day split across two pages would render its
  header twice with half its rows under each, so `/ledger` fetches one row more than a page,
  drops the last (possibly partial) day, and uses its date as the `before` cursor.
- **Row limits belong to the view, not the query.** `list()` applies a limit only when asked.
  Aggregates - balances, net worth, counts - must never inherit a page size, or they go
  quietly wrong the moment the ledger outgrows one page.

## Styling

**Tailwind v4 only**, one stylesheet at `styles/app.css`, compiled by `@tailwindcss/cli`.

- Every colour, radius, shadow and easing comes from the `@theme` block. **Never write a raw
  hex in a template.** No default Tailwind palette - the green ramp and warm-paper neutrals
  are hand-tuned, which is what stops it looking like a generic dashboard.
- Green is the only brand hue. Clay / ochre / indigo are **state** (overspend, bills,
  transfers), never decoration.
- `@layer components` holds only the primitives that repeat everywhere (`.ledger-row`,
  `.amt`, `.sheet`, `.chip`, `.key`). Everything else is utilities inline in the JSX.
- **Geist Mono is the only family**, self-hosted from `public/fonts` in four weights.
  Hierarchy comes from weight and size, not from a second typeface. Amounts are Medium (500)
  rather than Bold: at 34px and up, bold mono closes its own counters and reads as a blob.
  Mono means figures are tabular for free, so ledger columns align with no effort - that
  alignment is the detail that makes it read as a finance app.
- **Labels are sentence case**, 12px / 600 / -0.01em, never uppercase with wide tracking.
  Monospace already carries generous side bearings, so letter-spacing meant for a condensed
  sans just smears a label into an unreadable string.
- Light is the default; dark redefines the same tokens. Both are tuned, never inverted.

**Motion budget.** Two easings (`--ease-pebble`, `--ease-spring`) and three durations.
Something animates only when it is **arriving** (`.rise` with a `--i` stagger, `.pop`),
**leaving**, or **responding to a finger** (`.press`). Ambient animation is what makes an
app feel cheap, so there is none. Every rule sits behind the global
`prefers-reduced-motion` block.

**Loading.** Navigation is a real page load, so `#progress` is the honest signal. htmx puts
`.htmx-request` on the submitting form for the whole flight, which is what swaps `.idle` for
`.busy` on the Save button. Never show a spinner for something that is already on screen.

## Code style

Match the `portfolio` repo and the `minitraycer` assignment exactly.

- Bun + TypeScript, ESM. Extensionless aliased imports (`@/core/error`); `import type`
  separated (`verbatimModuleSyntax`).
- **Biome**: 2-space indent, 80 columns, double quotes, semicolons, recommended rules,
  imports organized. No Prettier/ESLint. `check` runs `biome check` then `tsc --noEmit`.
- **Functional, zero classes.**
- Arrow-const for exported helpers; `function` declarations for route handlers, view
  components, and the `appError` factory.
- Types are `Readonly<{...}>`; `type` over `interface` (except cohesive multi-method ports).
  `as const` for stable literals.
- **No comments.** Not on the why, not on the what. If a piece of code needs explaining,
  rename it or pull it into a function whose name says what the comment would have. The only
  exception is a `biome-ignore` directive, which is machine-readable instruction rather than
  prose. No em dashes anywhere, in code or content; use a plain hyphen.
- **camelCase** file names (no dashes); one primary exported function per file with an
  explicit return type.

## Adding things

- **A transaction type:** extend the union in `core/transactions/transaction.ts` and add its arm
  to the signed-amount fold. The compiler will point at every site that must handle it.
- **A currency:** one row in the table in `core/money/currency.ts`. Nothing else.
- **A route:** add `web/routes/<resource>/<action>.tsx` (validate input -> call an action or
  a service -> map `Result` to a fragment or a full page), then one line in that resource's
  `routes.ts`.
- **A query:** add `d1/actions/<resource>/<action>.ts` - one exported function taking the
  database first - and export it from that resource's `index.ts`.

## Testing

`bun test`. **There are no fakes and no mocking.** Anything that touches the database is
tested against a real local D1: `test/d1.ts` boots the same miniflare instance
`wrangler dev` uses via `getPlatformProxy`, applies `migrations/0000_init.sql`, and hands
back a `DrizzleD1Database`. Nothing has to be kept in sync with anything.

- **Pure `core`** is the densest-tested part of the codebase - `money`, `rates` and
  `transactions` are where a bug costs real money, so they carry the most cases.
- **Actions and app operations** run against the real D1 from `test/d1.ts`, with `reset()` in a
  `beforeEach`. This is also where row scoping is proven: a user's query must never return
  another user's rows.
- **Assert on error codes, never messages.** Test **both** branches of anything fallible.
- **Layout & naming:** colocate `foo.ts` + `foo.test.ts`. Names are behaviour statements
  ("saves anyway when no rate exists, flagging the row instead of blocking").
