import { Link } from "wouter";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6 py-12 text-slate-100">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-amber-200">The Firmament · Development mode</p>
        <h1 className="font-serif text-3xl">Account sign-in is paused</h1>
        <p className="text-sm leading-7 text-slate-300">
          Account registration and cloud storage will be enabled when deployment is ready.
          You can continue building and using Firmament with birth profiles saved on this device.
        </p>
      </header>
      <Link href="/" className="inline-flex rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950">
        Return to the observatory
      </Link>
    </main>
  );
}
