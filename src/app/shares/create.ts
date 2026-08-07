import { err, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import {
  cleanLabel,
  expiryFor,
  newShareToken,
  type Share,
  type Span,
  windowFor,
} from "@/core/shares/share";
import { create as insert } from "@/infra/d1/actions/shares";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type NewShareInput = Readonly<{
  userId: string;
  span: Span;
  from?: string;
  to?: string;
  label: string;
  expiresInDays: number;
  today: string;
  now: number;
}>;

export const create = (
  db: DrizzleD1Database,
  input: NewShareInput,
): AppResultAsync<Share> => {
  const run = async (): Promise<AppResult<Share>> => {
    const window = windowFor(input.span, input.today, input.from, input.to);
    if (window.isErr()) return err(window.error);

    const label = cleanLabel(input.label);
    if (label.isErr()) return err(label.error);

    return insert(db, {
      id: newId(input.now),
      userId: input.userId,
      token: newShareToken(),
      label: label.value,
      span: input.span,
      fromDate: window.value.fromDate,
      toDate: window.value.toDate,
      createdAt: input.now,
      expiresAt: expiryFor(input.expiresInDays, input.now),
      revokedAt: null,
      viewCount: 0,
      lastViewedAt: null,
    });
  };

  return new ResultAsync(run());
};
