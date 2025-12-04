import { OpenRouter } from "@openrouter/sdk";
import { db } from "./db";

export const OPENROUTER_API_KEY_SETTING = "openrouter.apiKey";

let cachedClient: OpenRouter | null = null;
let cachedKey: string | null = null;

export async function getOpenRouterClient(): Promise<OpenRouter> {
  const record = await db.appSettings.get(OPENROUTER_API_KEY_SETTING);
  const apiKey = record?.value?.trim();

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is missing. Add it from the settings menu before chatting."
    );
  }

  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }

  cachedClient = new OpenRouter({ apiKey });
  cachedKey = apiKey;
  return cachedClient;
}

export function invalidateOpenRouterClient() {
  cachedClient = null;
  cachedKey = null;
}
