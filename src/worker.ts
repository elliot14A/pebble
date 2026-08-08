import { runDue } from "@/app/recurring/run";
import { connect } from "@/infra/d1/connection";
import { makeApp } from "@/infra/web/app";
import { readConfig } from "@/infra/web/config";

type Bindings = { DB: D1Database; PEBBLE_BASE_CURRENCY?: string };

let app: ReturnType<typeof makeApp> | undefined;

export default {
  fetch(
    request: Request,
    env: unknown,
    ctx: ExecutionContext,
  ): Response | Promise<Response> {
    app ??= makeApp();
    return app.fetch(request, env as never, ctx);
  },

  async scheduled(
    event: { scheduledTime: number },
    env: Bindings,
  ): Promise<void> {
    const now = event.scheduledTime;
    const today = new Date(now).toISOString().slice(0, 10);

    const done = await runDue(
      connect(env.DB),
      readConfig(env).baseCurrency,
      today,
      now,
    );

    if (done.isErr()) throw new Error(done.error.message);
  },
};
