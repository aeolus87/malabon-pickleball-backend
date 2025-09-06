import crypto from "crypto";

// Password hashing using scrypt with random salt
// Stored format: scrypt:params:saltHex:hashHex

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1, keylen = 64;
  const hash = await new Promise<Buffer>((resolve, reject) => {
    (crypto as any).scrypt(password, salt, keylen, { N, r, p }, (err: any, derivedKey: Buffer) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `scrypt:N=${N},r=${r},p=${p}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, params, saltHex, hashHex] = stored.split(":");
    if (scheme !== "scrypt") return false;
    const parsed: Record<string, number> = Object.fromEntries(params.split(",").map(kv => kv.split("=")).map(([k, v]) => [k, Number(v)]));
    const salt = Buffer.from(saltHex, "hex");
    const keylen = Buffer.from(hashHex, "hex").length;
    const derived = await new Promise<Buffer>((resolve, reject) => {
      (crypto as any).scrypt(password, salt, keylen, { N: parsed.N, r: parsed.r, p: parsed.p }, (err: any, dk: Buffer) => {
        if (err) reject(err);
        else resolve(dk);
      });
    });
    return crypto.timingSafeEqual(derived, Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}

