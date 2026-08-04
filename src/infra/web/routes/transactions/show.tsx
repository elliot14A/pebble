import type { Context } from "hono";
import { forTransaction } from "@/infra/d1/actions/receipts";
import { fetch as fetchTransaction } from "@/infra/d1/actions/transactions";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { lookups } from "@/infra/web/lookups";
import { TransactionPage } from "@/infra/web/views/pages/transaction";

export async function show(c: Context<Env>) {
  const ctx = c.get("ctx");
  const id = c.req.param("id") ?? "";

  const data = await fetchTransaction(ctx.db, ctx.user.id, id).andThen((tx) =>
    lookups(ctx).andThen((maps) =>
      forTransaction(ctx.db, ctx.user.id, id).map((receipts) => ({
        tx,
        maps,
        receipts,
      })),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  const { tx, maps, receipts } = data.value;

  return c.html(
    <TransactionPage
      transaction={tx}
      category={
        tx.categoryId === null
          ? null
          : (maps.categories.get(tx.categoryId) ?? null)
      }
      account={maps.accounts.get(tx.accountId) ?? null}
      counterAccount={
        tx.counterAccountId === null
          ? null
          : (maps.accounts.get(tx.counterAccountId) ?? null)
      }
      baseCurrency={ctx.baseCurrency}
      today={ctx.today}
      receipts={receipts}
    />,
  );
}
