import { Hono } from "hono";
import type { Env } from "@/infra/web/context";
import { show } from "@/infra/web/routes/home/show";

export const routes = (): Hono<Env> => new Hono<Env>().get("/", show);
