import { request } from "undici";
import { Provider, ProviderContext, ValidationResult } from "../types";
import { noopLogger } from "../logger";

const BAI_ENDPOINT = "https://validador.bancobai.ao/api/validate";
const DEFAULT_TIMEOUT_MS = 5000;

async function baiValidate(chave: string, pin: string, context?: ProviderContext): Promise<ValidationResult> {
  const logger = context?.logger ?? noopLogger;
  const normalizedChave = chave.trim();
  const normalizedPin = pin.trim();

  const digitsChave = normalizedChave.replace(/\D+/g, "");
  const digitsPin = normalizedPin.replace(/\D+/g, "");

  const chaveValid = /^\d{1,9}$/.test(digitsChave);
  const pinValid = /^\d{1,9}$/.test(digitsPin);

  if (!chaveValid || !pinValid) {
    logger.warn("INVALID_INPUT_FORMAT", {
      provider: "BAI",
      chaveLength: digitsChave.length,
      pinLength: digitsPin.length
    });
    return {
      status: "INVALID",
      provider: "BAI",
      message: "INVALID_INPUT_FORMAT"
    };
  }

  const chave9 = digitsChave.padStart(9, "0");
  const pin9 = digitsPin.padStart(9, "0");

  const pinB64 = Buffer.from(pin9, "utf8").toString("base64");
  const chaveB64 = Buffer.from(chave9, "utf8").toString("base64");

  // Double-encode (base64 of the base64 string) as required by BAI
  const vr0001 = Buffer.from(pinB64, "utf8").toString("base64");
  const vk0001 = Buffer.from(chaveB64, "utf8").toString("base64");

  const payload = {
    VR0001: vr0001,
    VK0001: vk0001
  };

  logger.debug("BAI_REQUEST", {
    endpoint: BAI_ENDPOINT,
    payloadKeys: Object.keys(payload),
    base64Lengths: {
      VR0001: payload.VR0001.length,
      VK0001: payload.VK0001.length
    },
    payload,
    timeoutMs: context?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  });

  const controller = context?.signal ? undefined : new AbortController();
  const signal = context?.signal ?? controller?.signal;
  const timeout = controller
    ? setTimeout(() => controller.abort(), context?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    : undefined;

  try {
    const { statusCode, body } = await request(BAI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      bodyTimeout: context?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      signal
    });

    const response: unknown = await body.json().catch(() => undefined);

    const message = typeof response === "object" && response !== null && "message" in response
      ? String((response as Record<string, unknown>).message)
      : undefined;
    const errorFlag = typeof response === "object" && response !== null && "error" in response
      ? Boolean((response as Record<string, unknown>).error)
      : false;

    logger.debug("BAI_RESPONSE", {
      statusCode,
      hasErrorFlag: errorFlag,
      message
    });

    // Treat server errors as ERROR, not CONFIRMED
    if (statusCode >= 500) {
      const result: ValidationResult = {
        status: "ERROR",
        provider: "BAI",
        message: message || "SERVER_ERROR",
        raw: response ?? { statusCode }
      };
      logger.error("BAI_SERVER_ERROR", { statusCode, message });
      return result;
    }

    // For client errors, consider INVALID
    if (statusCode >= 400) {
      const result: ValidationResult = {
        status: "INVALID",
        provider: "BAI",
        message: message || "INVALID_REQUEST",
        raw: response ?? { statusCode }
      };
      logger.warn("BAI_CLIENT_ERROR", { statusCode, message });
      return result;
    }

    // Heuristic: confirmed only if no error flag and 2xx
    const confirmed = !errorFlag;

    logger.debug("BAI_DECISION", { confirmed, statusCode, errorFlag });

    return {
      status: confirmed ? "CONFIRMED" : "INVALID",
      provider: "BAI",
      raw: response,
      message: confirmed ? undefined : "UNCONFIRMED_RESPONSE"
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    logger.error("BAI_REQUEST_FAILED", {
      timedOut,
      error: error instanceof Error ? error.message : String(error)
    });
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
    // Match 9 digits for chave with optional label/separator
    chave: /(?:chave|key|codigo|code)[:\s]*([0-9\s]{9,})|\b([0-9]{9})\b/i,
    // Match 8+ digits for PIN with optional label/separator
    pin: /(?:pin|senha|password|codigo)[:\s]*([0-9\s]{8,})|\b([0-9]{8,10})\b/i
  },
  validate: baiValidate
};
