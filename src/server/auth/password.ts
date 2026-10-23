import { hash, verify, Algorithm } from "@node-rs/argon2";

// OWASP Password Storage Cheat Sheet (argon2id, m=19 MiB, t=2, p=1).
const OPTIONS = { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/** Hash used to equalise timing when the email does not exist. */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("mosaic-timing-equaliser-not-a-real-password");
  return dummyHash;
}
