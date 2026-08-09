import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().$type<"super_admin" | "user">(),
    baseCurrency: text("base_currency").notNull().default("INR"),

    passwordHash: text("password_hash"),
    status: text("status")
      .notNull()
      .default("active")
      .$type<"active" | "disabled">(),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: integer("locked_until"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    currency: text("currency").notNull(),
    openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: integer("archived_at"),
  },
  (table) => [index("accounts_user_idx").on(table.userId, table.sortOrder)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),

    ownerId: text("owner_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull(),
    glyph: text("glyph").notNull(),
    tint: text("tint").notNull().default("money"),
    parentId: text("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: integer("archived_at"),
  },
  (table) => [index("categories_owner_idx").on(table.ownerId, table.sortOrder)],
);

export const merchants = sqliteTable(
  "merchants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    normalizedName: text("normalized_name").notNull(),
    displayName: text("display_name").notNull(),
    defaultCategoryId: text("default_category_id"),
    seenCount: integer("seen_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("merchants_user_name_idx").on(
      table.userId,
      table.normalizedName,
    ),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    walletId: text("wallet_id"),
    accountId: text("account_id").notNull(),

    counterAccountId: text("counter_account_id"),
    categoryId: text("category_id"),
    merchantId: text("merchant_id"),
    type: text("type").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),

    baseAmountMinor: integer("base_amount_minor"),
    fxRateE8: integer("fx_rate_e8"),
    fxPending: integer("fx_pending", { mode: "boolean" })
      .notNull()
      .default(false),
    occurredOn: text("occurred_on").notNull(),
    note: text("note"),
    tags: text("tags"),
    receiptId: text("receipt_id"),
    recurringRuleId: text("recurring_rule_id"),
    billId: text("bill_id"),

    clientId: text("client_id").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    uniqueIndex("transactions_client_idx").on(table.userId, table.clientId),
    index("transactions_ledger_idx").on(
      table.userId,
      table.occurredOn,
      table.id,
    ),
    index("transactions_account_idx").on(table.userId, table.accountId),
    index("transactions_category_idx").on(table.userId, table.categoryId),
    index("transactions_pending_idx").on(table.userId, table.fxPending),
  ],
);

export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    currency: text("currency").notNull(),

    rateE8: integer("rate_e8").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("fx_rates_unique_idx").on(
      table.userId,
      table.currency,
      table.effectiveFrom,
    ),
    index("fx_rates_lookup_idx").on(
      table.userId,
      table.currency,
      table.effectiveFrom,
    ),
  ],
);

export const shares = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    label: text("label").notNull().default(""),
    span: text("span").notNull().$type<"day" | "week" | "month" | "range">(),
    fromDate: text("from_date").notNull(),
    toDate: text("to_date").notNull(),

    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at"),
    revokedAt: integer("revoked_at"),
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: integer("last_viewed_at"),
  },
  (table) => [
    uniqueIndex("shares_token_idx").on(table.token),
    index("shares_owner_idx").on(table.userId, table.createdAt),
  ],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    categoryId: text("category_id"),
    limitMinor: integer("limit_minor").notNull(),

    createdAt: integer("created_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [index("budgets_owner_idx").on(table.userId, table.archivedAt)],
);

export const receipts = sqliteTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    transactionId: text("transaction_id"),

    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),

    readAmountText: text("read_amount_text"),
    readName: text("read_name"),
    readOn: text("read_on"),
    readAt: integer("read_at"),

    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("receipts_owner_idx").on(table.userId, table.createdAt),
    index("receipts_transaction_idx").on(table.transactionId),
  ],
);

export const categoryPrefs = sqliteTable(
  "category_prefs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    categoryId: text("category_id").notNull(),
    hiddenAt: integer("hidden_at"),
  },
  (table) => [
    uniqueIndex("category_prefs_unique_idx").on(table.userId, table.categoryId),
  ],
);

export const recurring = sqliteTable(
  "recurring",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    kind: text("kind").notNull().$type<"transaction" | "bill">(),
    type: text("type").notNull().$type<"expense" | "income">(),
    name: text("name").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    accountId: text("account_id").notNull(),
    categoryId: text("category_id"),

    every: text("every").notNull().$type<"week" | "month" | "year">(),
    dayOfMonth: integer("day_of_month").notNull(),
    nextOn: text("next_on").notNull(),
    lastRunOn: text("last_run_on"),

    createdAt: integer("created_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    index("recurring_due_idx").on(table.nextOn, table.archivedAt),
    index("recurring_owner_idx").on(table.userId, table.archivedAt),
  ],
);

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    name: text("name").notNull(),
    targetMinor: integer("target_minor").notNull(),
    savedMinor: integer("saved_minor").notNull().default(0),
    currency: text("currency").notNull(),
    accountId: text("account_id"),
    targetOn: text("target_on"),

    createdAt: integer("created_at").notNull(),
    reachedAt: integer("reached_at"),
    archivedAt: integer("archived_at"),
  },
  (table) => [index("goals_owner_idx").on(table.userId, table.archivedAt)],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    createdAt: integer("created_at").notNull(),
    failedAt: integer("failed_at"),
  },
  (table) => [
    uniqueIndex("push_endpoint_idx").on(table.endpoint),
    index("push_owner_idx").on(table.userId),
  ],
);
