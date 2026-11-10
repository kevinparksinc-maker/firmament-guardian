import { COOKIE_NAME, OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

type PublicRuntimeConfig = {
  appId?: string;
  oauthPortalUrl?: string;
};

let runtimeConfigPromise: Promise<PublicRuntimeConfig> | null = null;

function loadRuntimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch("/api/runtime-config", { credentials: "same-origin" })
      .then(async response => {
        if (!response.ok) throw new Error(`Runtime configuration request failed (${response.status})`);
        return response.json() as Promise<PublicRuntimeConfig>;
      })
      .catch(error => {
        runtimeConfigPromise = null;
        throw error;
      });
  }

  return runtimeConfigPromise;
}

// Start the Manus OAuth login only from an event handler or effect. Runtime
// configuration keeps the public project ID and OAuth portal out of the static
// build, so the same artifact works in Preview and production.
export const startLogin = async (): Promise<void> => {
  try {
    let config: PublicRuntimeConfig = {};
    try {
      config = await loadRuntimeConfig();
    } catch {
      // Configuration fetch failed, continue to fallback
    }

    if (config.appId && config.oauthPortalUrl) {
      const redirectUri = `${window.location.origin}/api/oauth/callback`;
      const nonce = crypto.randomUUID();
      document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
      const state = encodeOAuthState({ redirectUri, nonce });

      const url = new URL(`${config.oauthPortalUrl.replace(/\/$/, "")}/app-auth`);
      url.searchParams.set("appId", config.appId);
      url.searchParams.set("redirectUri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("responseType", "code");

      window.location.assign(url.toString());
      return;
    }

    // Fallback: seamless local session for standalone / preview environments
    const response = await fetch("/api/oauth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        try {
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}`);
        } catch {
          // sessionStorage unavailable
        }
      }
      window.location.reload();
      return;
    }

    throw new Error("Unable to establish session");
  } catch (error) {
    console.error("[OAuth] Unable to begin sign-in", error);
    const reason = error instanceof Error ? error.message : "Unknown sign-in error";
    const message = `Unable to start sign-in: ${reason}. Please try again or contact support if this persists.`;
    window.dispatchEvent(new CustomEvent("fg:auth-error", { detail: { message } }));
  }
};
