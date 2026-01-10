import express from "express";
import multer from "multer";
import path from "path";
import { BankProof, baiProvider, createConsoleLogger } from "../src";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const app = express();
const port = 3001;
const logger = createConsoleLogger("info");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Manual validation (chave + pin)
app.post("/api/validate", async (req, res) => {
  const { chave, pin } = req.body || {};
  if (!chave || !pin) {
    return res.status(400).json({ error: "chave and pin are required" });
  }

  try {
    const result = await BankProof.validate({ chave, pin }, baiProvider, { logger });
    res.json(result);
  } catch (err) {
    logger.error("demo_validate_error", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Unexpected error", detail: err instanceof Error ? err.message : String(err) });
  }
});

// File upload validation (PDF/Image)
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "file is required" });
  }

  try {
    const result = await BankProof.extractAndValidate(req.file.buffer, baiProvider, { logger });
    res.json(result);
  } catch (err) {
    logger.error("demo_upload_error", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Unexpected error", detail: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(port, () => {
  logger.info(`BankProof demo running at http://localhost:${port}`);
});
