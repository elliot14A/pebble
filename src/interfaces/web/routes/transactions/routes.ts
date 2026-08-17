import { Hono } from "hono";
import type { Env } from "@/interfaces/web/context";
import { create } from "@/interfaces/web/routes/transactions/create";
import { list } from "@/interfaces/web/routes/transactions/list";
import { refund } from "@/interfaces/web/routes/transactions/refund";
import { remove, undo } from "@/interfaces/web/routes/transactions/remove";
import { repeat } from "@/interfaces/web/routes/transactions/repeat";
import { show } from "@/interfaces/web/routes/transactions/show";
import { tag } from "@/interfaces/web/routes/transactions/tag";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/ledger", list)
    .post("/transactions", create)
    .get("/transactions/:id", show)
    .delete("/transactions/:id", remove)

    .post("/transactions/:id/delete", remove)
    .post("/transactions/:id/repeat", repeat)
    .post("/transactions/:id/refund", refund)
    .post("/transactions/:id/tags", tag)
    .post("/transactions/:id/undo", undo);
