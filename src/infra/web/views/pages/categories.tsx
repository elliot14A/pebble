import type { CategoryBoard, CategoryLine } from "@/app/categories/list";
import { CATEGORY_KINDS, GLYPHS, TINTS } from "@/core/categories/category";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type CategoriesPageProps = Readonly<{
  board: CategoryBoard;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

const KIND_LABEL: Readonly<Record<string, string>> = {
  expense: "Spending",
  income: "Earning",
  both: "Both",
};

export function CategoriesPage(props: CategoriesPageProps) {
  return (
    <Shell title="Categories" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Categories</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Categories</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      <div class="grid gap-2.5 px-5">
        {props.board.shown.map((line, index) => (
          <Row line={line} index={index} />
        ))}
      </div>

      <div class="px-5 pt-6 pb-2">
        <p class="label mb-2">Add one</p>
        <Editor />
      </div>

      {props.board.hidden.length === 0 ? null : (
        <div class="px-5 pt-5">
          <p class="label mb-2">Hidden</p>
          <div class="grid gap-2.5">
            {props.board.hidden.map((line) => (
              <div class="card flex items-center gap-3 p-3.5 opacity-70">
                <span class="glyph h-9 w-9 flex-none rounded-[12px]">
                  <Icon name={line.category.glyph} size={16} />
                </span>
                <span class="min-w-0 flex-1 truncate text-[13px] font-bold tracking-[-0.015em]">
                  {line.category.name}
                </span>
                <form method="post" action="/categories/show">
                  <input type="hidden" name="id" value={line.category.id} />
                  <button
                    type="submit"
                    class="press rounded-[11px] bg-sunk px-3 py-1.5 text-[11.5px] font-semibold text-ink-2"
                  >
                    Show
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Row(props: { line: CategoryLine; index: number }) {
  const { category, own } = props.line;

  return (
    <div
      class="card rise p-3.5"
      style={`--i:${props.index}`}
      x-data="{ open: false }"
    >
      <div class="flex items-center gap-3">
        <span class="glyph h-9 w-9 flex-none rounded-[12px]">
          <Icon name={category.glyph} size={16} />
        </span>
        <span class="min-w-0 flex-1">
          <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
            {category.name}
          </b>
          <span class="text-[10.5px] text-ink-3">
            {KIND_LABEL[category.kind] ?? category.kind}
            {own ? "" : " · built in"}
          </span>
        </span>

        {own ? (
          <button
            type="button"
            x-on:click="open = !open"
            class="press grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-sunk text-ink-2"
            aria-label={`Edit ${category.name}`}
          >
            <Icon name="pencil" size={14} />
          </button>
        ) : null}

        <Confirm
          action="/categories/remove"
          fields={{ id: category.id }}
          title={`Remove ${category.name}?`}
          body={
            own
              ? "If anything already uses it, it is hidden instead of deleted so your history keeps its label."
              : "Built-in categories are shared, so this hides it for you only."
          }
          confirmLabel="Remove"
          triggerLabel={`Remove ${category.name}`}
          triggerClass="press grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-over-wash text-over"
        />
      </div>

      {own ? (
        <div x-show="open" x-cloak class="pt-3">
          <Editor line={props.line} />
        </div>
      ) : null}
    </div>
  );
}

function Editor(props: { line?: CategoryLine }) {
  const category = props.line?.category;

  return (
    <form
      method="post"
      action="/categories"
      class={category === undefined ? "card grid gap-2.5 p-4" : "grid gap-2.5"}
      autocomplete="off"
    >
      {category === undefined ? null : (
        <input type="hidden" name="id" value={category.id} />
      )}

      <div class="grid grid-cols-2 gap-2">
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={category?.name ?? ""}
          maxlength={24}
          required
          class={field}
        />
        <select name="kind" class={field}>
          {CATEGORY_KINDS.map((kind) => (
            <option
              value={kind}
              selected={kind === (category?.kind ?? "expense")}
            >
              {KIND_LABEL[kind] ?? kind}
            </option>
          ))}
        </select>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <select name="glyph" class={field}>
          {GLYPHS.map((glyph) => (
            <option
              value={glyph}
              selected={glyph === (category?.glyph ?? "dots")}
            >
              {glyph}
            </option>
          ))}
        </select>
        <select name="tint" class={field}>
          {TINTS.map((tint) => (
            <option
              value={tint}
              selected={tint === (category?.tint ?? "money")}
            >
              {tint}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        class="press flex h-10 items-center justify-center gap-2 rounded-[13px] bg-money-deep text-[12.5px] font-bold text-on-money"
      >
        <Icon name={category === undefined ? "plus" : "check"} size={15} />
        {category === undefined ? "Add category" : "Save"}
      </button>
    </form>
  );
}
