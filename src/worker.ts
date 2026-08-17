import { makeApp } from "@/app";
import { remind } from "@/app/push";
import { runDue } from "@/app/recurring";
import { connect } from "@/infra/d1/connection";
import { readConfig, readPushConfig } from "@/interfaces/web/config";

type Bindings = {
  DB: D1Database;
  PEBBLE_BASE_CURRENCY?: string;
  PEBBLE_VAPID_PUBLIC_KEY?: string;
  PEBBLE_VAPID_PRIVATE_KEY?: string;
  PEBBLE_VAPID_SUBJECT?: string;
};

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

    const keys = readPushConfig(env);
    if (keys.publicKey !== "" && keys.privateKey !== "") {
      await remind(connect(env.DB), keys, today, now);
    }
  },
};
