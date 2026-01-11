# BankProof

Node.js/TypeScript library to extract and validate bank proof data (chave + PIN) from manual input or PDF/Image with OCR fallback. Extensible via providers, stateless, and ready for backend use.

## Features
- Manual validation and PDF/Image extraction with OCR fallback
- Provider-based parsing and validation (`validate(chave, pin)`)
- Normalized result: `{ status: "CONFIRMED" | "INVALID" | "ERROR", provider, message? }`
- Timeout/error handling; no sensitive data persisted

## Install

```bash
npm install bankproof
```

Requires Node.js >= 18. OCR needs Tesseract runtime (`tesseract.js` expects eng.traineddata available on the host).

## Quick start

```ts
import { BankProof, baiProvider, createConsoleLogger } from "bankproof";
import { readFileSync } from "fs";

const logger = createConsoleLogger("info");

// Manual input
const result = await BankProof.validate({ chave: "414979709", pin: "86612413" }, baiProvider, { logger });

// PDF / Image
const file = readFileSync("receipt.pdf");
const pdfResult = await BankProof.extractAndValidate(file, baiProvider, { logger });
```

## API surface

- `BankProof.validate({ chave, pin }, provider, options?)`
- `BankProof.extractAndValidate(file, provider, options?)`

`options`:
- `timeoutMs?: number`
- `signal?: AbortSignal`
- `language?: string` (OCR)
- `logger?: Logger`
- `extract?: { pdfText?: (buf: Buffer) => Promise<string>; ocrText?: (buf: Buffer, language?: string) => Promise<string>; }`

### Provider contract

```ts
interface Provider {
	name: string;
	patterns: { chave?: RegExp; pin?: RegExp; [key: string]: RegExp | undefined };
	validate(
		chave: string,
		pin: string,
		context?: { timeoutMs?: number; signal?: AbortSignal; logger?: Logger }
	): Promise<{
		status: "CONFIRMED" | "INVALID" | "ERROR";
		provider: string;
		message?: string;
		raw?: unknown;
	}>;
}
```

Included: `baiProvider` (encodes inputs, posts to the official endpoint with timeout/error handling).

### Add a provider

```ts
import { Provider } from "bankproof";
import { request } from "undici";

export const myBank: Provider = {
	name: "MYBANK",
	patterns: {
		chave: /\b\d{10}\b/,
		pin: /\b\d{6}\b/
	},
	async validate(chave, pin, ctx) {
		const payload = { chave, pin };
		try {
			const { body } = await request("https://mybank/validate", {
				method: "POST",
				body: JSON.stringify(payload),
				headers: { "Content-Type": "application/json" },
				bodyTimeout: ctx?.timeoutMs
			});
			const res = await body.json();
			const ok = res?.status === "ok";
			return { status: ok ? "CONFIRMED" : "INVALID", provider: "MYBANK", raw: res };
		} catch (error) {
			return { status: "ERROR", provider: "MYBANK", message: "TEMPORARY_FAILURE", raw: error };
		}
	}
};
```

Register the provider and pass it to `BankProof.validate` or `BankProof.extractAndValidate`.

## Examples / demo

- Server: `examples/server.ts` (Express + Multer). Choose provider via request (defaults to BAI).
- Frontend: `examples/public/index.html` — simple page (English) to test manual input and PDF/Image upload.

Run locally:

```bash
npx ts-node examples/server.ts
# open http://localhost:3001
```

## Contributing

- Keep core stateless and provider-agnostic.
- Add providers by implementing the contract; register in the demo only if you want it available there.
- Use the logger interface; avoid raw console logs in core/providers.
- Add tests (Vitest) for parsing and provider behaviors; mock external calls.

## Security notes
- In-memory only; nothing persisted.
- Configure `timeoutMs` to avoid hanging calls.
- Mask sensitive values in logs; use logger levels appropriately.
