import { makeApp } from "@/infra/web/app";

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
};
