# BankProof

Library for extracting and validating bank proof data (chave + PIN) with manual input or PDF/Imagem (OCR fallback). Extensible by providers, minimal and stateless.

## Features
- Manual validation and PDF/Imagem extraction with OCR fallback
- Providers per bank with regex-based parsing and `validate(chave, pin)`
- Normalized result: `{ status: "CONFIRMED" | "INVALID" | "ERROR", provider, message? }`
- Timeout and error handling on outbound requests
- No persistence of sensitive data

## Install

```bash
npm install bankproof
```

You need system dependencies for `tesseract.js` if running OCR (Tesseract runtime/eng.traineddata).

## Quick start

```ts
import { BankProof, baiProvider } from "bankproof";

// Manual input
const result = await BankProof.validate({ chave: "414979709", pin: "86612413" }, baiProvider);
// -> { status: "CONFIRMED" | "INVALID" | "ERROR", provider: "BAI", message?: string }

// PDF / Imagem
import { readFileSync } from "fs";
const file = readFileSync("comprovativo.pdf");
const pdfResult = await BankProof.extractAndValidate(file, baiProvider);
```

## API

- `BankProof.validate({ chave, pin }, provider, options?)` → calls provider.validate
- `BankProof.extractAndValidate(file, provider, options?)` → extract text (PDF parse → OCR fallback), parse via provider.patterns, then provider.validate

`options`: `{ timeoutMs?: number; signal?: AbortSignal; language?: string }`

## Providers

Provider contract:

```ts
interface Provider {
	name: string;
	patterns: { chave?: RegExp; pin?: RegExp; [key: string]: RegExp | undefined };
	validate(chave: string, pin: string, context?: { timeoutMs?: number; signal?: AbortSignal }): Promise<{
		status: "CONFIRMED" | "INVALID" | "ERROR";
		provider: string;
		message?: string;
		raw?: unknown;
	}>;
}
```

Included provider: `baiProvider` (Base64 encode inputs, POST to official endpoint with timeout handling).

## Add a new provider

```ts
import { Provider } from "bankproof";
import { request } from "undici";

export const myBank: Provider = {
	name: "MYBANK",
	patterns: {
		chave: /\b\d{10}\b/,
		pin: /\b\d{6}\b/
	},
	async validate(chave, pin) {
		const payload = { chave, pin };
		try {
			const { body } = await request("https://mybank/validate", { method: "POST", body: JSON.stringify(payload) });
			const res = await body.json();
			const ok = res?.status === "ok";
			return { status: ok ? "CONFIRMED" : "INVALID", provider: "MYBANK", raw: res };
		} catch {
			return { status: "ERROR", provider: "MYBANK", message: "TEMPORARY_FAILURE" };
		}
	}
};
```

Add the provider and pass it to the public methods; no other wiring needed.

## Security notes
- All operations are in-memory; no data is persisted.
- Set `timeoutMs` per provider call to avoid hanging requests.
- Ensure OCR assets are secured and strip logs of sensitive values.
