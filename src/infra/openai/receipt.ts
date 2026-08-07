import { errAsync, ResultAsync } from "neverthrow";
import type OpenAI from "openai";
import { type AppResultAsync, appError, SystemErrorCode } from "@/core/error";
import type { Reading } from "@/core/receipts/reading";
import { readReceipt as parseReply } from "@/core/receipts/reading";

export type ExtraBody = Readonly<Record<string, unknown>>;

export type Reader = Pick<OpenAI, "chat">;

const PROMPT = [
  "Read this shop receipt or bill.",
  "Reply with one JSON object and nothing else, no prose and no code fence.",
  'Use exactly these keys: {"total":string,"merchant":string,"date":string,"currency":string}.',
  "total is the final amount actually paid, after tax and discounts, digits and at most one dot, no thousands separators and no currency symbol.",
  "merchant is the shop or restaurant name as printed at the top, at most 40 characters.",
  "date is the date printed on the receipt as YYYY-MM-DD.",
  "currency is the three letter ISO code, taken from the symbol if it is not printed.",
  "Use an empty string for anything you cannot read. Never guess and never invent a value.",
].join(" ");

const unreadable = (cause: unknown) =>
  appError(SystemErrorCode.INTERNAL, "Could not read that receipt.", { cause });

const toDataUrl = (image: ArrayBuffer, contentType: string): string => {
  const bytes = new Uint8Array(image);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return `data:${contentType};base64,${btoa(binary)}`;
};

export const makeRead =
  (client: Reader, model: string, extraBody: ExtraBody) =>
  (
    image: ArrayBuffer,
    contentType: string,
    today: string,
  ): AppResultAsync<Reading> =>
    ResultAsync.fromPromise(
      client.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: toDataUrl(image, contentType) },
              },
            ],
          },
        ],
        ...extraBody,
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming),
      unreadable,
    ).map((reply) =>
      parseReply(reply.choices?.[0]?.message?.content ?? "", today),
    );

export type ReadReceipt = ReturnType<typeof makeRead>;

export const keepUnread: ReadReceipt = () =>
  errAsync(
    appError(SystemErrorCode.INTERNAL, "Nothing was asked of the model."),
  );
