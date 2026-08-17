import { Hono } from "hono";
import { ledgerCsv } from "@/app/exports";
import { fileNameFor } from "@/core/exports";
import { windowFor } from "@/core/shares";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";

export const routes = (): Hono<Env> =>
  new Hono<Env>().get("/export.csv", async (c) => {
    const ctx = c.get("ctx");
    const span = c.req.query("span") ?? "month";

    const window = windowFor(
      span === "day" || span === "week" || span === "range" ? span : "month",
      ctx.today,
      c.req.query("from"),
      c.req.query("to"),
    );
    if (window.isErr()) {
      const { status, message } = errorToHttp(window.error);
      return c.text(message, status);
    }

    const { fromDate, toDate } = window.value;
    const body = await ledgerCsv(
      ctx.db,
      ctx.user.id,
      ctx.baseCurrency,
      fromDate,
      toDate,
    );

    if (body.isErr()) {
      const { status, message } = errorToHttp(body.error);
      return c.text(message, status);
    }

    return new Response(body.value, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${fileNameFor(fromDate, toDate, "csv")}"`,
        "cache-control": "no-store",
      },
    });
  });
