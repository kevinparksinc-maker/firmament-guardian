/** The public source ZIP must never become a credential-export endpoint. */
const blockedDirectoryNames = new Set([
  ".git", "node_modules", "dist", ".next", ".cache", ".turbo",
  ".ssh", ".aws", ".secrets", ".credentials", ".config",
]);
const blockedExactFileNames = new Set([
  ".npmrc", ".pypirc", ".netrc", ".ds_store", "id_rsa", "id_ed25519",
  "credentials.json", "service-account.json",
]);
export function excludedFromPublicSourceZip(relativePath: string): boolean {
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!parts.length || parts.some(part => part === "." || part === "..")) return true;
  if (parts.some(part => blockedDirectoryNames.has(part.toLowerCase()))) return true;
  const name = parts.at(-1)!.toLowerCase();
  if (blockedExactFileNames.has(name) || /^\.env(?:\.|$)/.test(name)) return true;
  if (/\.(?:pem|key|p12|pfx|jks|keystore|der|crt)$/.test(name)) return true;
  if (/^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.pub)?$/.test(name)) return true;
  if (/(?:^|[-_.])(?:service-account|private-key|api-credentials)(?:[-_.]|$)/.test(name)) return true;
  return false;
}
