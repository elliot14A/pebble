import { Hono } from "hono";
import type { Env } from "@/interfaces/web/context";
import {
  list,
  remove,
  save,
  unarchive,
} from "@/interfaces/web/routes/accounts/list";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/accounts", list)
    .post("/accounts", save)
    .post("/accounts/remove", remove)
    .post("/accounts/restore", unarchive)
    .get("/settings/accounts", (c) => c.redirect("/accounts", 301));
