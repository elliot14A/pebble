import { Hono } from "hono";
import type { Env } from "@/infra/web/context";
import { category } from "@/infra/web/routes/analytics/category";
import { show } from "@/infra/web/routes/analytics/show";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/analytics", show)
    .get("/analytics/category/:id", category);
