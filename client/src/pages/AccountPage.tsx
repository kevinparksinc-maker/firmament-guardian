import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { startLegacyLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const availability = trpc.auth.availability.useQuery(undefined, { enabled: !user && !loading, retry: false, refetchOnWindowFocus: false, staleTime: 15000 });
  const accountReady = availability.data?.available === true;
  const pending = login.isPending || register.isPending;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!accountReady) return;
    try {
      if (mode === "register")
        await register.mutateAsync({ name, email, password });
      else await login.mutateAsync({ email, password });
      // Remove a stale preview token before checking the new HttpOnly session.
      sessionStorage.removeItem("manus-cookie");
      await utils.auth.me.invalidate();
      const next =
        new URLSearchParams(window.location.search).get("next") || "/";
      navigate(
        next.startsWith("/") &&
          !next.startsWith("//") &&
          !next.startsWith("/account")
          ? next
          : "/"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again."
      );
    }
  };
  return (
    <main className="mx-auto max-w-lg space-y-6 py-8 text-slate-100 sm:py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-amber-200">
          The Absolute · Your account
        </p>
        <h1 className="font-serif text-3xl">
          {user
            ? "Your private observatory"
            : availability.data?.available === false ? "Account connection needed"
            : mode === "register"
              ? "Create your account"
              : "Welcome back"}
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          Sign in to open private birth profiles, saved charts and reading
          history. Existing profiles on this device are preserved.
        </p>
      </header>
      {loading ? (
        <p role="status">Checking your session…</p>
      ) : user ? (
        <section className="space-y-5 rounded-2xl border border-white/15 bg-slate-950/70 p-6">
          <p>Signed in as {user.name || user.email}.</p>
          <Link href="/" className="block text-cyan-200 underline">
            Open your observatory →
          </Link>
          <button
            type="button"
            onClick={() =>
              void logout().catch(error => setError(error.message))
            }
            className="rounded-xl border border-white/20 px-4 py-3"
          >
            Sign out
          </button>
        </section>
      ) : !accountReady ? (
        <section aria-live="polite" className="space-y-4 rounded-2xl border border-amber-200/25 bg-slate-950/70 p-6">
          <p role="status" className="text-sm leading-7 text-slate-200">{availability.isLoading ? "Checking the account connection…" : availability.data?.message || "Unable to check the account connection. Your existing device profiles are preserved."}</p>
          <p className="text-sm leading-7 text-slate-400">Registration and sign-in will open once account storage is connected. You do not need to enter your password while this connection is unavailable.</p>
          <button type="button" disabled={availability.isFetching} onClick={() => void availability.refetch()} className="rounded-xl border border-cyan-200/35 px-4 py-3 text-sm text-cyan-100 disabled:opacity-50">{availability.isFetching ? "Checking…" : "Check connection again"}</button>
        </section>
      ) : (
        <>
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-white/15 bg-slate-950/70 p-6"
          >
            {mode === "register" && (
              <label className="block space-y-2 text-sm">
                <span>Name</span>
                <input
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/30 p-3"
                />
              </label>
            )}
            <label className="block space-y-2 text-sm">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 p-3"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>
                Password{mode === "register" ? " · At least 12 characters" : ""}
              </span>
              <input
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 p-3"
              />
            </label>
            <button
              disabled={pending}
              type="submit"
              className="w-full rounded-xl bg-amber-200 p-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {pending
                ? "Connecting…"
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setPassword("");
                setError("");
              }}
              className="text-sm text-cyan-200 underline"
            >
              {mode === "login"
                ? "Create a new account"
                : "I already have an account"}
            </button>
          </form>
          <details className="text-sm text-slate-400">
            <summary className="cursor-pointer">
              Have an account from the original sign-in?
            </summary>
            <p className="my-3 leading-6">
              Use its original sign-in to retain access to that account's saved
              records. A new email account does not take ownership of an older
              account.
            </p>
            <button
              type="button"
              onClick={() =>
                void startLegacyLogin().catch(error => setError(error.message))
              }
              className="text-cyan-200 underline"
            >
              Use original sign-in
            </button>
          </details>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-300/30 bg-rose-950/30 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
    </main>
  );
}
