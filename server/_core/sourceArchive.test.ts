import { describe, expect, it } from "vitest";
import { excludedFromPublicSourceZip as excluded } from "./sourceArchive";

describe("public project source ZIP hygiene", () => {
  it.each([
    ".env", ".env.local", ".env.production", "server/.env.staging",
    ".npmrc", "client/.pypirc", "credentials.json",
    "secrets/private-key.pem", "config/service-account.json",
    ".ssh/id_ed25519", ".aws/credentials", "keys/site.p12",
    "nested/../../.env", "id_rsa",
  ])("does not archive secret material at %s", path => {
    expect(excluded(path)).toBe(true);
  });
  it.each([
    "client/src/App.tsx", "server/astronomy.ts", "package.json",
    "client/src/assets/example.svg", "README.md", "drizzle/schema.ts",
  ])("keeps normal project source %s", path => {
    expect(excluded(path)).toBe(false);
  });
});
