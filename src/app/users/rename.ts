import { errAsync } from "neverthrow";
import {
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { rename as renameUser } from "@/infra/d1/actions/users/rename";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const MAX_LENGTH = 40;

export const rename = (
  db: DrizzleD1Database,
  userId: string,
  displayName: string,
): AppResultAsync<string> => {
  const name = displayName.trim().replace(/\s+/g, " ");

  if (name === "") {
    return errAsync(
      appError(ValidationErrorCode.INVALID_INPUT, "Your name cannot be empty."),
    );
  }

  if (name.length > MAX_LENGTH) {
    return errAsync(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        `Keep your name under ${MAX_LENGTH} characters.`,
      ),
    );
  }

  return renameUser(db, userId, name).map(() => name);
};
