import { byCategory, spendMinor } from "@/core/analytics/summary";
import {
  type Budget,
  dailyLeftMinor,
  elapsedBps,
  isOnPace,
  type Progress,
  progress,
  projectedMinor,
} from "@/core/budgets/budget";
import type { Category } from "@/core/categories/category";
import type { AppResultAsync } from "@/core/error";
import { isLive } from "@/core/transactions/transaction";
import { list as listBudgets } from "@/infra/d1/actions/budgets";
import { list as listCategories } from "@/infra/d1/actions/categories";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type BudgetLine = Readonly<{
  budget: Budget;
  category: Category | null;
  progress: Progress;
  onPace: boolean;
  dailyLeftMinor: number | null;
  projectedMinor: number;
}>;

export type BudgetOverview = Readonly<{
  month: string;
  today: string;
  elapsedBps: number;
  overall: BudgetLine | null;
  lines: ReadonlyArray<BudgetLine>;
  spentMinor: number;
  budgetedMinor: number;
  categories: ReadonlyArray<Category>;
}>;

export const overview = (
  db: DrizzleD1Database,
  userId: string,
  month: string,
  today: string,
): AppResultAsync<BudgetOverview> =>
  listBudgets(db, userId).andThen((budgets) =>
    listCategories(db, userId).andThen((categories) =>
      listTransactions(db, {
        userId,
        from: `${month}-01`,
        to: `${month}-31`,
      }).map((entries) => {
        const byId = new Map(categories.map((c) => [c.id, c]));
        const perCategory = new Map(
          byCategory(entries).map((bucket) => [bucket.key, bucket.minor]),
        );
        const spentMinorTotal = entries
          .filter(isLive)
          .reduce((total, tx) => total + spendMinor(tx), 0);

        const lineFor = (budget: Budget): BudgetLine => {
          const spent =
            budget.categoryId === null
              ? spentMinorTotal
              : (perCategory.get(budget.categoryId) ?? 0);
          const bar = progress(budget.limitMinor, spent);

          return {
            budget,
            category:
              budget.categoryId === null
                ? null
                : (byId.get(budget.categoryId) ?? null),
            progress: bar,
            onPace: isOnPace(bar.usedBps, month, today),
            dailyLeftMinor: dailyLeftMinor(bar.leftMinor, month, today),
            projectedMinor: projectedMinor(spent, month, today),
          };
        };

        const overallBudget =
          budgets.find((budget) => budget.categoryId === null) ?? null;
        const lines = budgets
          .filter((budget) => budget.categoryId !== null)
          .map(lineFor)
          .sort((a, b) => b.progress.usedBps - a.progress.usedBps);

        return {
          month,
          today,
          elapsedBps: elapsedBps(month, today),
          overall: overallBudget === null ? null : lineFor(overallBudget),
          lines,
          spentMinor: spentMinorTotal,
          budgetedMinor: lines.reduce(
            (total, line) => total + line.progress.limitMinor,
            0,
          ),
          categories,
        };
      }),
    ),
  );
