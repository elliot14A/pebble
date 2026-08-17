import { Hono } from "hono";
import { type Env, sameOrigin, withContext } from "@/interfaces/web/context";
import { routes as accountRoutes } from "@/interfaces/web/routes/accounts/routes";
import { routes as adminRoutes } from "@/interfaces/web/routes/admin/routes";
import { routes as analyticsRoutes } from "@/interfaces/web/routes/analytics/routes";
import { routes as authRoutes } from "@/interfaces/web/routes/auth/routes";
import { routes as budgetRoutes } from "@/interfaces/web/routes/budgets/routes";
import { routes as categoryRoutes } from "@/interfaces/web/routes/categories/routes";
import { routes as exportRoutes } from "@/interfaces/web/routes/exports/routes";
import { routes as goalRoutes } from "@/interfaces/web/routes/goals/routes";
import { routes as homeRoutes } from "@/interfaces/web/routes/home/routes";
import { routes as profileRoutes } from "@/interfaces/web/routes/profile/routes";
import { routes as pushRoutes } from "@/interfaces/web/routes/push/routes";
import { routes as receiptRoutes } from "@/interfaces/web/routes/receipts/routes";
import { routes as recurringRoutes } from "@/interfaces/web/routes/recurring/routes";
import { routes as settingsRoutes } from "@/interfaces/web/routes/settings/routes";
import { routes as shareRoutes } from "@/interfaces/web/routes/shares/routes";
import { routes as statementRoutes } from "@/interfaces/web/routes/statements/routes";
import { routes as transactionRoutes } from "@/interfaces/web/routes/transactions/routes";
import { Shell } from "@/interfaces/web/views/layouts/shell";

export const makeApp = (): Hono<Env> => {
  const app = new Hono<Env>();

  app.use("*", sameOrigin);
  app.use("*", withContext);

  app.route("/", authRoutes());

  app.route("/", homeRoutes());
  app.route("/", transactionRoutes());
  app.route("/", accountRoutes());
  app.route("/", analyticsRoutes());
  app.route("/", budgetRoutes());
  app.route("/", categoryRoutes());
  app.route("/", exportRoutes());
  app.route("/", goalRoutes());
  app.route("/", adminRoutes());
  app.route("/", profileRoutes());
  app.route("/", pushRoutes());
  app.route("/", receiptRoutes());
  app.route("/", recurringRoutes());
  app.route("/", shareRoutes());
  app.route("/", statementRoutes());
  app.route("/", settingsRoutes());

  app.notFound((c) =>
    c.html(
      <Shell title="Not found" tab="none">
        <div class="card mx-5 mt-16 p-8 text-center">
          <p class="text-[13px] font-bold">Nothing here</p>
          <p class="mt-1.5 text-[11.5px] text-ink-3">
            That page does not exist.
          </p>
          <a
            href="/"
            class="mt-4 inline-block text-[12px] text-money no-underline"
          >
            Back home
          </a>
        </div>
      </Shell>,
      404,
    ),
  );

  app.onError((error, c) => {
    console.error("unhandled", error);
    return c.text("Something broke. Try again.", 500);
  });

  return app;
};
