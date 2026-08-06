import { Hono } from "hono";
import type { Env } from "@/infra/web/context";
import {
  list as listCurrencies,
  remove as removeCurrency,
  save as saveCurrency,
} from "@/infra/web/routes/settings/currencies";
import { show } from "@/infra/web/routes/settings/show";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings", show)
    .get("/settings/currencies", listCurrencies)
    .post("/settings/currencies", saveCurrency)
    .post("/settings/currencies/remove", removeCurrency)
    .get("/settings/rates", (c) => c.redirect("/settings/currencies", 301));
