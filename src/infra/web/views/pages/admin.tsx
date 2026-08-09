import type { User } from "@/core/users";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";

export type AdminPageProps = Readonly<{
  actor: User;
  users: ReadonlyArray<User>;
  baseCurrency: string;
  message: string | null;
  error: string | null;
}>;

const input =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

export function AdminPage(props: AdminPageProps) {
  return (
    <Shell title="People" tab="none">
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">People</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">People</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}
      {props.message === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-money-wash px-4 py-3 text-[12px] text-money-deep">
          {props.message}
        </p>
      )}

      <div class="grid gap-3 px-5">
        {props.users.map((user, index) => (
          <div class="card rise p-4" style={`--i:${index}`}>
            <div class="flex items-center gap-3">
              <span class="glyph h-10 w-10 flex-none rounded-[13px] text-[13px]">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span class="min-w-0 flex-1">
                <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
                  {user.displayName}
                  {user.id === props.actor.id ? " (you)" : ""}
                </b>
                <span class="text-[10.5px] text-ink-3">
                  {user.username}
                  {user.role === "super_admin" ? " · admin" : ""}
                  {user.status === "disabled" ? " · disabled" : ""}
                  {user.mustChangePassword ? " · must set a password" : ""}
                </span>
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <form
                method="post"
                action="/admin/users/reset"
                class="flex gap-2"
              >
                <input type="hidden" name="id" value={user.id} />
                <input
                  type="text"
                  name="temporaryPassword"
                  placeholder="New temporary password"
                  minlength={8}
                  required
                  class={`${input} min-w-0 flex-1`}
                />
                <button
                  type="submit"
                  class="press rounded-[13px] bg-sunk px-3 text-[12px] font-semibold text-ink-2"
                >
                  Reset
                </button>
              </form>

              {user.id === props.actor.id ? null : (
                <form
                  method="post"
                  action="/admin/users/status"
                  class="flex gap-2"
                >
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={user.status === "disabled" ? "active" : "disabled"}
                  />
                  <button
                    type="submit"
                    class={`press rounded-[13px] px-3 py-2 text-[12px] font-semibold ${
                      user.status === "disabled"
                        ? "bg-sunk text-ink-2"
                        : "bg-over-wash text-over"
                    }`}
                  >
                    {user.status === "disabled" ? "Enable" : "Disable"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <div class="px-5 pt-6 pb-2">
        <p class="label mb-2">Add someone</p>
        <form
          method="post"
          action="/admin/users"
          class="card grid gap-2.5 p-4"
          autocomplete="off"
        >
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="displayName"
              placeholder="Name"
              required
              class={input}
            />
            <input
              type="text"
              name="username"
              placeholder="username"
              required
              autocapitalize="none"
              spellcheck={false}
              class={input}
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="temporaryPassword"
              placeholder="Temporary password"
              minlength={8}
              required
              class={input}
            />
            <select name="role" class={input}>
              <option value="user">Can use pebble</option>
              <option value="super_admin">Administrator</option>
            </select>
          </div>
          <button
            type="submit"
            class="press mt-1 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-money-deep text-[12.5px] font-bold text-on-money"
          >
            <Icon name="plus" size={15} />
            Create account
          </button>
        </form>
      </div>
    </Shell>
  );
}
