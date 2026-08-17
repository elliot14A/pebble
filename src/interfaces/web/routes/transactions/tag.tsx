import type { Context } from "hono";
import { tag as applyTags } from "@/app/transactions";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";

export async function tag(c: Context<Env>) {
  const ctx = c.get("ctx");
  const id = c.req.param("id") ?? "";
  const form = await c.req.formData();
  const raw = form.get("tags");

  const done = await applyTags(
    ctx.db,
    ctx.user.id,
    id,
    typeof raw === "string" ? raw : "",
    ctx.now,
  );

  if (done.isErr()) {
    const { message } = errorToHttp(done.error);
    return c.redirect(
      `/transactions/${id}?error=${encodeURIComponent(message)}`,
      303,
    );
  }

  return c.redirect(`/transactions/${id}`, 303);
}
