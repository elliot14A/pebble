import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  COOKIE_NAME,
  expiryFrom,
  hashToken,
  isExpired,
  shouldExtend,
} from "@/core/auth/session";
import type { User } from "@/core/users/user";
import { fetchByToken, remove, touch } from "@/infra/d1/actions/sessions";
import { connect, type DrizzleD1Database } from "@/infra/d1/connection";
import { readConfig } from "@/infra/web/config";

export type Context = Readonly<{
  db: DrizzleD1Database;
  user: User;
  baseCurrency: string;
  now: number;
  today: string;
}>;

export type Env = {
  Bindings: {
    DB: D1Database;
    RECEIPTS: R2Bucket;
    OPENROUTER_API_KEY?: string;
    PEBBLE_BASE_CURRENCY?: string;
    PEBBLE_RECEIPT_MODEL?: string;
  };
  Variables: {
    ctx: Context;
    db: DrizzleD1Database;
    now: number;
  };
};

const OPEN = new Set(["/login", "/logout", "/manifest.webmanifest"]);

const isOpen = (path: string): boolean =>
  OPEN.has(path) || path.startsWith("/s/");

export const isoDate = (millis: number): string =>
  new Date(millis).toISOString().slice(0, 10);

export const withContext = createMiddleware<Env>(async (c, next) => {
  const db = connect(c.env.DB);
  const now = Date.now();
  c.set("db", db);
  c.set("now", now);

  const path = new URL(c.req.url).pathname;
  const open = isOpen(path);
  const token = getCookie(c, COOKIE_NAME);

  if (token === undefined || token === "") {
    return open ? next() : c.redirect("/login", 302);
  }

  const hashed = await hashToken(token);
  const found = await fetchByToken(db, hashed);
  if (found.isErr()) return c.text("Could not reach the database.", 503);

  const session = found.value;
  if (session === null || isExpired(session.expiresAt, now)) {
    if (session !== null) await remove(db, hashed);
    return open ? next() : c.redirect("/login", 302);
  }

  if (session.user.status === "disabled") {
    await remove(db, hashed);
    return c.redirect("/login?disabled=1", 302);
  }

  if (shouldExtend(session.lastSeenAt, now)) {
    await touch(db, hashed, expiryFrom(now), now);
  }

  c.set("ctx", {
    db,
    user: session.user,
    baseCurrency: readConfig(c.env).baseCurrency,
    now,
    today: isoDate(now),
  });

  if (session.user.mustChangePassword && path !== "/password" && !open) {
    return c.redirect("/password", 302);
  }

  return next();
});

export const sameOrigin = createMiddleware<Env>(async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") return next();

  const origin = c.req.header("Origin");
  if (origin === undefined) return next();

  if (origin !== new URL(c.req.url).origin) {
    return c.text("That request did not come from pebble.", 403);
  }
  return next();
});

export const adminOnly = createMiddleware<Env>(async (c, next) => {
  if (c.get("ctx").user.role !== "super_admin") {
    return c.text("That area is for administrators.", 403);
  }
  return next();
});
