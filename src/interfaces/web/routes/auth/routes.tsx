import { type Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { changePassword, login, signOut, startSession } from "@/app/auth";
import { COOKIE_NAME, SESSION_DAYS } from "@/core/auth";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { field } from "@/interfaces/web/form";
import { LoginPage } from "@/interfaces/web/views/pages/login";
import { PasswordPage } from "@/interfaces/web/views/pages/password";

const DAY_SECONDS = 24 * 60 * 60;

const setSession = (c: Context<Env>, token: string) => {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * DAY_SECONDS,
  });
};

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/login", (c) =>
      c.html(
        <LoginPage
          username={c.req.query("username") ?? ""}
          error={c.req.query("error") ?? null}
          notice={
            c.req.query("disabled") === "1"
              ? "That account has been disabled."
              : c.req.query("out") === "1"
                ? "Signed out."
                : null
          }
        />,
      ),
    )

    .post("/login", async (c) => {
      const form = await c.req.formData();
      const username = field(form, "username");

      const result = await login(
        c.get("db"),
        username,
        field(form, "password"),
        Date.now(),
      );

      if (result.isErr()) {
        const { message } = errorToHttp(result.error);
        const query = new URLSearchParams({ error: message, username });
        return c.redirect(`/login?${query.toString()}`, 303);
      }

      setSession(c, result.value.token);
      return c.redirect(
        result.value.user.mustChangePassword ? "/password" : "/",
        303,
      );
    })

    .post("/logout", async (c) => {
      const token = getCookie(c, COOKIE_NAME);
      if (token !== undefined && token !== "") {
        await signOut(c.get("db"), token);
      }
      deleteCookie(c, COOKIE_NAME, { path: "/" });
      return c.redirect("/login?out=1", 303);
    })

    .get("/password", (c) => {
      const ctx = c.get("ctx");
      return c.html(
        <PasswordPage
          error={c.req.query("error") ?? null}
          forced={ctx.user.mustChangePassword}
        />,
      );
    })

    .post("/password", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const changed = await changePassword(
        ctx.db,
        ctx.user,
        field(form, "current"),
        field(form, "next"),
        field(form, "confirm"),
        ctx.now,
      );

      if (changed.isErr()) {
        const { message } = errorToHttp(changed.error);
        return c.redirect(
          `/password?error=${encodeURIComponent(message)}`,
          303,
        );
      }

      const started = await startSession(ctx.db, ctx.user.id, ctx.now);
      if (started.isErr()) {
        deleteCookie(c, COOKIE_NAME, { path: "/" });
        return c.redirect("/login?out=1", 303);
      }

      setSession(c, started.value);
      return c.redirect(
        `/settings?saved=${encodeURIComponent("Password changed.")}`,
        303,
      );
    });
