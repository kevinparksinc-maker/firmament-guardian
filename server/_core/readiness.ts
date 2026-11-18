/** Configuration readiness is distinct from /healthz liveness and does not call third-party APIs. */
export function applicationReadiness(env: NodeJS.ProcessEnv) {
  const secret = (env.MANUS_JWT_SECRET ?? env.JWT_SECRET ?? "").trim();
  const sessionSigning = secret.length >= 32 && secret !== "firmament-guardian-default-jwt-secret-key";
  const providers = [
    env.GEMINI_API_KEY?.trim() ? "gemini" : null,
    env.GROQ_API_KEY?.trim() ? "groq" : null,
    env.OPENROUTER_API_KEY?.trim() ? "openrouter" : null,
  ].filter((name): name is string => Boolean(name));
  const databaseConfigured = Boolean(env.DATABASE_URL?.trim());
  const checks = {
    sessionSigning,
    interpreterKey: providers.length > 0,
    interpreterProviders: providers,
    databaseConfigured,
  };
  return { ready: checks.sessionSigning && checks.interpreterKey && checks.databaseConfigured, checks };
}
