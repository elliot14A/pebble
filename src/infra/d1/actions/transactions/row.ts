import { isTransactionType, type Transaction } from "@/core/transactions";
import type { transactions } from "@/infra/d1/schema";

export type TransactionRow = typeof transactions.$inferSelect;

export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  userId: row.userId,
  walletId: row.walletId,
  accountId: row.accountId,
  counterAccountId: row.counterAccountId,
  categoryId: row.categoryId,
  merchantId: row.merchantId,

  type: isTransactionType(row.type) ? row.type : "adjustment",
  amountMinor: row.amountMinor,
  currency: row.currency,
  baseAmountMinor: row.baseAmountMinor,
  fxRateE8: row.fxRateE8,
  fxPending: row.fxPending,
  occurredOn: row.occurredOn,
  note: row.note,
  clientId: row.clientId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
});

export const toRow = (transaction: Transaction): TransactionRow => ({
  ...transaction,
  receiptId: null,
  recurringRuleId: null,
  billId: null,
});
