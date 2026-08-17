import { Hono } from "hono";
import type { Env } from "@/interfaces/web/context";
import {
  list as listCurrencies,
  remove as removeCurrency,
  save as saveCurrency,
} from "@/interfaces/web/routes/settings/currencies";
import { show } from "@/interfaces/web/routes/settings/show";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings", show)
    .get("/settings/currencies", listCurrencies)
    .post("/settings/currencies", saveCurrency)
    .post("/settings/currencies/remove", removeCurrency)
    .get("/settings/rates", (c) => c.redirect("/settings/currencies", 301));
