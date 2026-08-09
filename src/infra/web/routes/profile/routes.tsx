import { Hono } from "hono";
import { rename } from "@/app/users";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { count as countTransactions } from "@/infra/d1/actions/transactions";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { ProfilePage } from "@/infra/web/views/pages/profile";

const joined = (millis: number): string =>
  new Date(millis).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/profile", async (c) => {
      const ctx = c.get("ctx");

      const data = await countTransactions(ctx.db, {
        userId: ctx.user.id,
      }).andThen((transactions) =>
        listAccounts(ctx.db, ctx.user.id).map((accounts) => ({
          transactions,
          accounts,
        })),
      );

      if (data.isErr()) {
        const { status, message } = errorToHttp(data.error);
        return c.text(message, status);
      }

      return c.html(
        <ProfilePage
          user={ctx.user}
          baseCurrency={ctx.baseCurrency}
          transactionCount={data.value.transactions}
          accountCount={data.value.accounts.length}
          joinedLabel={joined(ctx.user.createdAt)}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/profile", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const value = form.get("displayName");

      const renamed = await rename(
        ctx.db,
        ctx.user.id,
        typeof value === "string" ? value : "",
      );

      const query = renamed.isErr()
        ? `error=${encodeURIComponent(errorToHttp(renamed.error).message)}`
        : `saved=${encodeURIComponent("Name updated.")}`;

      return c.redirect(`/profile?${query}`, 303);
    });
