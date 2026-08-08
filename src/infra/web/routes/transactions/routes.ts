import { Hono } from "hono";
import type { Env } from "@/infra/web/context";
import { create } from "@/infra/web/routes/transactions/create";
import { list } from "@/infra/web/routes/transactions/list";
import { refund } from "@/infra/web/routes/transactions/refund";
import { remove, undo } from "@/infra/web/routes/transactions/remove";
import { repeat } from "@/infra/web/routes/transactions/repeat";
import { show } from "@/infra/web/routes/transactions/show";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/ledger", list)
    .post("/transactions", create)
    .get("/transactions/:id", show)
    .delete("/transactions/:id", remove)

    .post("/transactions/:id/delete", remove)
    .post("/transactions/:id/repeat", repeat)
    .post("/transactions/:id/refund", refund)
    .post("/transactions/:id/undo", undo);
