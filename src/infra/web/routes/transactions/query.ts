import { isTransactionType } from "@/core/transactions/transaction";
import type { TransactionQuery } from "@/infra/d1/actions/transactions";

export type Filter = Readonly<{ label: string; href: string }>;

export type ParsedQuery = Readonly<{
  query: TransactionQuery;
  filters: ReadonlyArray<Filter>;
  search: string;
  before: string | null;
}>;

export const parseQuery = (url: URL, userId: string): ParsedQuery => {
  const params = url.searchParams;
  const query: Record<string, unknown> = { userId };
  const filters: Filter[] = [];

  const without = (key: string): string => {
    const next = new URLSearchParams(params);
    next.delete(key);
    next.delete("before");
    const rest = next.toString();
    return rest === "" ? "/ledger" : `/ledger?${rest}`;
  };

  const account = params.get("account");
  if (account !== null && account !== "") {
    query.accountId = account;
    filters.push({ label: "Account", href: without("account") });
  }

  const category = params.get("category");
  if (category !== null && category !== "") {
    query.categoryId = category;
    filters.push({ label: "Category", href: without("category") });
  }

  const type = params.get("type");
  if (type !== null && isTransactionType(type)) {
    query.type = type;
    filters.push({ label: type, href: without("type") });
  }

  const from = params.get("from");
  if (from !== null && from !== "") {
    query.from = from;
    filters.push({ label: `From ${from}`, href: without("from") });
  }

  const to = params.get("to");
  if (to !== null && to !== "") {
    query.to = to;
    filters.push({ label: `To ${to}`, href: without("to") });
  }

  const search = params.get("q") ?? "";
  if (search !== "") query.search = search;

  const before = params.get("before");
  if (before !== null && before !== "") query.before = before;

  return { query: query as TransactionQuery, filters, search, before };
};

/** The same filters, minus paging, so "load more" and refresh stay in step. */
export const filterHref = (url: URL, extra: Record<string, string>): string => {
  const params = new URLSearchParams(url.searchParams);
  params.delete("before");
  params.delete("fragment");
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return query === "" ? "/ledger" : `/ledger?${query}`;
};
