export function toBuffer(input: Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
  return Buffer.from(input);
}

export function isPdfBuffer(buffer: Buffer): boolean {
  const signature = buffer.subarray(0, 5).toString("utf8");
  return signature === "%PDF-";
}
