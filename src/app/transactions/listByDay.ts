import type { AppResultAsync } from "@/core/error";
import { type DayGroup, groupByDay } from "@/core/transactions/balance";
import { list, type TransactionQuery } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const listByDay = (
  db: DrizzleD1Database,
  query: TransactionQuery,
): AppResultAsync<ReadonlyArray<DayGroup>> => list(db, query).map(groupByDay);
