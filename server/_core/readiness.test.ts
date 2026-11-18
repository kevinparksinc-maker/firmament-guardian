import { describe, expect, it } from "vitest";
import { applicationReadiness } from "./readiness";

const enoughJwt = "a".repeat(48);
describe("The Absolute operational readiness", () => {
  it("distinguishes server liveness from working interpreter and storage configuration", () => {
    const missing = applicationReadiness({ JWT_SECRET: enoughJwt });
    expect(missing.ready).toBe(false);
    expect(missing.checks).toMatchObject({
      sessionSigning: true, interpreterKey: false,
      interpreterProviders: [], databaseConfigured: false,
    });
  });
  it("only counts providers supported by the actual interpreter chain", () => {
    const anthOnly = applicationReadiness({
      JWT_SECRET: enoughJwt, DATABASE_URL: "mysql://test", ANTHROPIC_API_KEY: "test",
    });
    expect(anthOnly.ready).toBe(false);
    const configured = applicationReadiness({
      JWT_SECRET: enoughJwt, DATABASE_URL: "mysql://test",
      GEMINI_API_KEY: "example", OPENROUTER_API_KEY: "example2",
    });
    expect(configured.ready).toBe(true);
    expect(configured.checks.interpreterProviders).toEqual(["gemini", "openrouter"]);
  });
  it("rejects the unsafe sample session secret", () => {
    const readiness = applicationReadiness({
      JWT_SECRET: "firmament-guardian-default-jwt-secret-key",
      DATABASE_URL: "mysql://test", GEMINI_API_KEY: "example",
    });
    expect(readiness.checks.sessionSigning).toBe(false);
    expect(readiness.ready).toBe(false);
  });
});
