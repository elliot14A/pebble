import { raw } from "hono/html";
import { Icon, IconSprite } from "@/infra/web/views/components/icons";

export type PasswordPageProps = Readonly<{
  error: string | null;
  forced: boolean;
}>;

export function PasswordPage(props: PasswordPageProps) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <title>Change your password</title>
          <meta name="color-scheme" content="light dark" />
          <meta name="robots" content="noindex" />
          <link rel="stylesheet" href="/css/app.css" />
        </head>
        <body class="bg-paper text-ink">
          <IconSprite />
          <main class="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-10">
            <div class="rise">
              {props.forced ? null : (
                <a
                  href="/settings"
                  class="press mb-5 inline-grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
                  aria-label="Back to settings"
                >
                  <Icon name="back" size={17} />
                </a>
              )}
              <h1 class="text-[22px] font-bold tracking-[-0.04em]">
                {props.forced ? "Pick a password" : "Change your password"}
              </h1>
            </div>

            {props.error === null ? null : (
              <p class="pop mt-5 rounded-tile bg-over-wash px-4 py-3 text-[12.5px] text-over">
                {props.error}
              </p>
            )}

            <form
              method="post"
              action="/password"
              class="card rise mt-5 grid gap-3 p-5"
              style="--i:1"
            >
              <label class="grid gap-1.5">
                <span class="label">
                  {props.forced ? "Temporary password" : "Current password"}
                </span>
                <input
                  type="password"
                  name="current"
                  required
                  autocomplete="current-password"
                  class="rounded-tile bg-sunk px-3 py-2.5 text-[14px] font-semibold text-ink outline-none"
                />
              </label>

              <label class="grid gap-1.5">
                <span class="label">New password</span>
                <input
                  type="password"
                  name="next"
                  required
                  minlength={8}
                  autocomplete="new-password"
                  class="rounded-tile bg-sunk px-3 py-2.5 text-[14px] font-semibold text-ink outline-none"
                />
              </label>

              <label class="grid gap-1.5">
                <span class="label">New password again</span>
                <input
                  type="password"
                  name="confirm"
                  required
                  minlength={8}
                  autocomplete="new-password"
                  class="rounded-tile bg-sunk px-3 py-2.5 text-[14px] font-semibold text-ink outline-none"
                />
              </label>

              <button
                type="submit"
                class="press mt-1 flex h-12 items-center justify-center gap-2 rounded-[15px] bg-money-deep text-[13px] font-bold text-on-money shadow-lift"
              >
                Save password
                <Icon name="check" size={16} />
              </button>
            </form>

            <p class="mt-4 text-center text-[11px] text-ink-3">
              At least 8 characters.
            </p>
          </main>
        </body>
      </html>
    </>
  );
}
