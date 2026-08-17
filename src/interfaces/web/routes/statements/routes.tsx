import { Hono } from "hono";
import { visible } from "@/app/categories";
import { bring, history, preview, undo } from "@/app/statements";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { getReceipt, putReceipt, removeReceipt } from "@/infra/r2/receipts";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { backTo, field } from "@/interfaces/web/form";
import { StatementPage } from "@/interfaces/web/views/pages/statement";

const MAX_BYTES = 2 * 1024 * 1024;

const parked = (userId: string): string => `statements/${userId}.csv`;

const back = (params: Record<string, string>): string =>
  backTo("/settings/import", params);

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings/import", async (c) => {
      const ctx = c.get("ctx");
      const accounts = await listAccounts(ctx.db, ctx.user.id);

      if (accounts.isErr()) {
        const { status, message } = errorToHttp(accounts.error);
        return c.text(message, status);
      }

      await removeReceipt(c.env.RECEIPTS, parked(ctx.user.id));

      const categories = await visible(ctx.db, ctx.user.id);
      const imports = await history(ctx.db, ctx.user.id);

      return c.html(
        <StatementPage
          accounts={accounts.value}
          categories={
            categories.isOk() ? categories.value.map((one) => one.name) : []
          }
          imports={imports.isOk() ? imports.value : []}
          preview={null}
          fileName={null}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/settings/import", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const file = form.get("statement");
      const accountId = field(form, "accountId");

      if (!(file instanceof File) || file.size === 0) {
        return c.redirect(back({ error: "Pick a file first." }), 303);
      }
      if (file.size > MAX_BYTES) {
        return c.redirect(
          back({ error: "That file is bigger than two megabytes." }),
          303,
        );
      }

      const bytes = await file.arrayBuffer();
      const stored = await putReceipt(
        c.env.RECEIPTS,
        parked(ctx.user.id),
        bytes,
        "text/csv",
      );
      if (stored.isErr()) {
        const { message } = errorToHttp(stored.error);
        return c.redirect(back({ error: message }), 303);
      }

      const text = new TextDecoder().decode(bytes);
      const seen = await preview(ctx.db, ctx.user.id, accountId, text);
      const accounts = await listAccounts(ctx.db, ctx.user.id);

      if (accounts.isErr()) {
        const { status, message } = errorToHttp(accounts.error);
        return c.text(message, status);
      }
      if (seen.isErr()) {
        return c.redirect(
          back({ error: errorToHttp(seen.error).message }),
          303,
        );
      }

      return c.html(
        <StatementPage
          accounts={accounts.value}
          categories={[]}
          imports={[]}
          preview={seen.value}
          fileName={file.name}
          notice={null}
          error={null}
        />,
      );
    })

    .post("/settings/import/confirm", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const accountId = field(form, "accountId");

      const held = await getReceipt(c.env.RECEIPTS, parked(ctx.user.id));
      if (held.isErr() || held.value === null) {
        return c.redirect(
          back({ error: "That upload has gone. Choose the file again." }),
          303,
        );
      }

      const text = await held.value.text();
      const done = await bring(
        ctx.db,
        ctx.user.id,
        accountId,
        text,
        ctx.now,
        ctx.baseCurrency,
      );

      await removeReceipt(c.env.RECEIPTS, parked(ctx.user.id));

      if (done.isErr()) {
        return c.redirect(
          back({ error: errorToHttp(done.error).message }),
          303,
        );
      }

      return c.redirect(
        backTo("/ledger", {
          saved: `${done.value.added} added from the statement.`,
        }),
        303,
      );
    })

    .post("/settings/import/undo", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const accountId = field(form, "accountId");
      const broughtAt = Number(field(form, "broughtAt"));

      const gone = await undo(ctx.db, ctx.user.id, accountId, broughtAt);
      if (gone.isErr()) {
        return c.redirect(
          back({ error: errorToHttp(gone.error).message }),
          303,
        );
      }

      return c.redirect(
        back({
          saved:
            gone.value === 1
              ? "1 imported entry removed."
              : `${gone.value} imported entries removed.`,
        }),
        303,
      );
    });
