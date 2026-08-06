import { raw } from "hono/html";
import { Icon, IconSprite } from "@/infra/web/views/components/icons";

export type LoginPageProps = Readonly<{
  username: string;
  error: string | null;
  notice: string | null;
}>;

export function LoginPage(props: LoginPageProps) {
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
          <title>pebble</title>
          <meta name="color-scheme" content="light dark" />
          <meta name="theme-color" content="#0a5c3e" />
          <meta name="robots" content="noindex" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
          <link rel="stylesheet" href="/css/app.css" />
        </head>
        <body class="bg-paper text-ink">
          <IconSprite />
          <main class="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-10">
            <div class="rise text-center">
              <span class="mx-auto grid h-14 w-14 place-items-center rounded-[19px] bg-money-deep text-on-money">
                <Icon name="wallet" size={26} />
              </span>
              <h1 class="mt-4 text-[26px] font-bold tracking-[-0.045em]">
                pebble
              </h1>
            </div>

            {props.error === null ? null : (
              <p class="pop mt-6 rounded-tile bg-over-wash px-4 py-3 text-[12.5px] text-over">
                {props.error}
              </p>
            )}
            {props.notice === null ? null : (
              <p class="pop mt-6 rounded-tile bg-money-wash px-4 py-3 text-[12.5px] text-money-deep">
                {props.notice}
              </p>
            )}

            <form
              method="post"
              action="/login"
              class="card rise mt-6 grid gap-3 p-5"
              style="--i:1"
            >
              <label class="grid gap-1.5">
                <span class="label">Username</span>
                <input
                  type="text"
                  name="username"
                  value={props.username}
                  required
                  autocomplete="username"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck={false}
                  class="rounded-tile bg-sunk px-3 py-2.5 text-[14px] font-semibold text-ink outline-none"
                />
              </label>

              <label class="grid gap-1.5">
                <span class="label">Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  autocomplete="current-password"
                  class="rounded-tile bg-sunk px-3 py-2.5 text-[14px] font-semibold text-ink outline-none"
                />
              </label>

              <button
                type="submit"
                class="press mt-1 flex h-12 items-center justify-center gap-2 rounded-[15px] bg-money-deep text-[13px] font-bold text-on-money shadow-lift"
              >
                Sign in
                <Icon name="arrow" size={16} />
              </button>
            </form>
          </main>
        </body>
      </html>
    </>
  );
}
