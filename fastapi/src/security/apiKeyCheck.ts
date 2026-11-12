import { readFileSync, existsSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { HttpError } from "../errors";

export function readSecret(name: string): string {
  const path = `/run/secrets/${name}`;
  if (existsSync(path)) {
    return readFileSync(path, "utf8").trim();
  }
  // Useful for local development outside Docker
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing secret or env var: ${name}`);
  }
  return value;
}

const INTERNAL_API_KEY = Buffer.from(readSecret("fastapi_internal_key"));

export function verifyInternalKey(provided: string | undefined): void {
  const given = Buffer.from(provided ?? "");
  if (
    provided === undefined ||
    given.length !== INTERNAL_API_KEY.length ||
    !timingSafeEqual(given, INTERNAL_API_KEY)
  ) {
    throw new HttpError(403, "Forbidden");
  }
}
