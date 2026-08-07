import OpenAI from "openai";
import type { LlmConfig } from "@/infra/web/config";

export const makeClient = (config: LlmConfig): OpenAI =>
  new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
