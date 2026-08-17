import { Hono } from "hono";
import type { Env } from "@/interfaces/web/context";
import { category } from "@/interfaces/web/routes/analytics/category";
import { show } from "@/interfaces/web/routes/analytics/show";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/analytics", show)
    .get("/analytics/category/:id", category);
