import { Hono } from "hono";
import { createUser, resetPassword, setUserStatus } from "@/app/admin";
import { activity, list as listUsers } from "@/infra/d1/actions/users";
import { adminOnly, type Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { backTo, field } from "@/infra/web/form";
import { AdminPage } from "@/infra/web/views/pages/admin";

const back = (params: Record<string, string>): string =>
  backTo("/admin/users", params);

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .use("/admin/*", adminOnly)

    .get("/admin/users", async (c) => {
      const ctx = c.get("ctx");
      const data = await listUsers(ctx.db).andThen((users) =>
        activity(ctx.db).map((seen) => ({ users, seen })),
      );

      if (data.isErr()) {
        const { status, message } = errorToHttp(data.error);
        return c.text(message, status);
      }

      return c.html(
        <AdminPage
          actor={ctx.user}
          users={data.value.users}
          activity={data.value.seen}
          today={ctx.today}
          baseCurrency={ctx.baseCurrency}
          message={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/admin/users", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const role =
        field(form, "role") === "super_admin" ? "super_admin" : "user";

      const created = await createUser(
        ctx.db,
        {
          username: field(form, "username"),
          displayName: field(form, "displayName"),
          role,
          temporaryPassword: field(form, "temporaryPassword"),
          baseCurrency: ctx.baseCurrency,
        },
        ctx.now,
      );

      return c.redirect(
        created.isErr()
          ? back({ error: errorToHttp(created.error).message })
          : back({
              saved: `${created.value.displayName} can sign in as ${created.value.username}. They will be asked to pick their own password.`,
            }),
        303,
      );
    })

    .post("/admin/users/reset", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await resetPassword(
        ctx.db,
        field(form, "id"),
        field(form, "temporaryPassword"),
        ctx.now,
      );

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({
              saved:
                "Password reset. They are signed out everywhere and will pick a new one.",
            }),
        303,
      );
    })

    .post("/admin/users/status", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const status =
        field(form, "status") === "disabled" ? "disabled" : "active";

      const done = await setUserStatus(
        ctx.db,
        ctx.user,
        field(form, "id"),
        status,
        ctx.now,
      );

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({
              saved:
                status === "disabled"
                  ? "Account disabled and signed out everywhere."
                  : "Account enabled.",
            }),
        303,
      );
    });
