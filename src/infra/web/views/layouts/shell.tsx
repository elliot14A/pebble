import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { IconSprite } from "@/infra/web/views/components/icons";
import { TabBar } from "@/infra/web/views/partials/tabBar";

export type ShellProps = Readonly<{
  title: string;
  tab: "home" | "ledger" | "stats" | "money" | "none";
  children: Child;
  undoId?: string | null;
  notice?: string | null;

  sheet?: Child;
}>;

export function Shell(props: ShellProps) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
          />
          <title>{props.title}</title>
          <meta name="description" content="Private finance tracking." />
          <meta name="color-scheme" content="light dark" />
          <meta name="theme-color" content="#0a5c3e" />
          <meta name="robots" content="noindex" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/icons/icon-180.png" />
          <link rel="stylesheet" href="/css/app.css" />
          <script src="/js/htmx.js" defer />
          <script type="module" src="/js/client.js" defer />
        </head>
        <body class="bg-paper text-ink">
          <IconSprite />
          <div
            class="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col"
            x-data
          >
            <div id="progress" class="progress" aria-hidden="true" />
            <main class="flex-1 pb-24">{props.children}</main>
            <TabBar active={props.tab} />
            {props.sheet}

            {props.notice == null || props.notice === "" ? null : (
              <p
                class="toast-undo fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-[488px] items-center gap-3 rounded-tile bg-ink px-4 py-3 text-xs text-paper shadow-lift"
                role="status"
              >
                {props.notice}
              </p>
            )}

            {props.undoId == null || props.undoId === "" ? null : (
              <form
                method="post"
                action={`/transactions/${props.undoId}/undo`}
                class="toast-undo fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-[488px] items-center gap-3 rounded-tile bg-ink px-4 py-3 text-xs text-paper shadow-lift"
                role="status"
              >
                Deleted
                <button
                  type="submit"
                  class="press ml-auto text-[12px] font-semibold tracking-[-0.01em] text-money-lift"
                >
                  Undo
                </button>
              </form>
            )}
          </div>
        </body>
      </html>
    </>
  );
}
