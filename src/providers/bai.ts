import { request } from "undici";
import { Provider, ProviderContext, ValidationResult } from "../types";

const BAI_ENDPOINT = "https://validador.bancobai.ao/api/validate";
const DEFAULT_TIMEOUT_MS = 5000;

async function baiValidate(chave: string, pin: string, context?: ProviderContext): Promise<ValidationResult> {
  const payload = {
    VR0001: Buffer.from(pin, "utf8").toString("base64"),
    VK0001: Buffer.from(chave, "utf8").toString("base64")
  };

  const controller = context?.signal ? undefined : new AbortController();
  const signal = context?.signal ?? controller?.signal;
  const timeout = controller
    ? setTimeout(() => controller.abort(), context?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    : undefined;

  try {
    const { body } = await request(BAI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      bodyTimeout: context?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      signal
    });

    const response = await body.json();
    const confirmed = Boolean(response);

    return {
      status: confirmed ? "CONFIRMED" : "INVALID",
      provider: "BAI",
      raw: response,
      message: confirmed ? undefined : "UNCONFIRMED_RESPONSE"
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      status: "ERROR",
      provider: "BAI",
      message: timedOut ? "TIMEOUT" : "TEMPORARY_FAILURE"
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export const baiProvider: Provider = {
  name: "BAI",
  patterns: {
    chave: /\b\d{9}\b/,
    pin: /\b\d{8}\b/
  },
  validate: baiValidate
};
