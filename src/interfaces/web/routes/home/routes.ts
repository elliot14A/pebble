import { Hono } from "hono";
import type { Env } from "@/interfaces/web/context";
import { show } from "@/interfaces/web/routes/home/show";

export const routes = (): Hono<Env> => new Hono<Env>().get("/", show);
