import { lazy, Suspense, useEffect } from "react";
import { toast } from "sonner";
import { ProfileSessionProvider, useProfileSession } from "./contexts/ProfileSessionContext";
import { PROFILE_TABS } from "./config/profileNavigation";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { LogIn, ShieldCheck, UserRound } from "lucide-react";
import { CelestialCommandShell } from "./components/CelestialCommandShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SovereignTierProvider } from "./components/SovereignTierModal";
// Route-level splitting: the large sky map and horary engine UI do not block the home screen.
const Home = lazy(() => import("./pages/Home"));
const HoraryPage = lazy(() => import("./pages/HoraryPage"));
const ZodiacHoraryPage = lazy(() => import("./pages/ZodiacHoraryPage"));
const History = lazy(() => import("./pages/History"));
const SkyHomePrototype = lazy(() => import("./pages/SkyHomePrototype"));

function AccountEntryGate({ children }: { children: React.ReactNode }) {
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  if (account.isLoading) return <main role="status" className="flex min-h-[78vh] items-center justify-center px-5 text-cyan-100">Verifying your Guardian account…</main>;
  if (!account.data) return <main className="relative flex min-h-[85vh] items-center justify-center px-5 py-12 text-slate-100"><section className="w-full max-w-xl rounded-3xl border-2 border-amber-300/70 bg-[linear-gradient(130deg,rgba(16,27,65,.97),rgba(24,13,56,.96))] p-7 shadow-[0_0_45px_rgba(248,191,91,.18)] sm:p-10"><div className="mb-5 flex items-center gap-3 text-amber-200"><ShieldCheck className="h-7 w-7"/><span className="text-xs font-bold uppercase tracking-[.24em]">Firmament Guardian</span></div><h1 className="font-serif text-3xl font-semibold text-amber-100 sm:text-4xl">Your Guardian begins with your identity.</h1><p className="mt-4 text-sm leading-7 text-slate-200">Create or sign in to your personal account first. Then set up your birth profile to unlock your private celestial observatory, charts and readings. No anonymous reading sessions.</p><div className="mt-6 rounded-xl border border-cyan-300/40 bg-cyan-300/[.06] px-4 py-3 text-sm text-cyan-100"><UserRound className="mr-2 inline h-4 w-4"/>Your birth details stay part of your personal profile. A phone number is not required for basic access.</div><button type="button" onClick={() => void startLogin()} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-fuchsia-300/70 bg-slate-950/70 px-4 font-semibold text-white shadow-[0_0_22px_rgba(255,106,220,.19)] hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"><LogIn className="h-5 w-5"/>Create account / Sign in</button><p className="mt-4 text-center text-xs text-slate-400">Sign-in is required. Profile setup follows immediately.</p></section></main>;
  return <>{children}</>;
}

function Router() {
  const [path] = useLocation();
  const { profile } = useProfileSession();
  // A signed-in visitor must finish the birth profile before opening other observatory modules.
  if (!profile && path !== "/") return <Redirect to="/" />;
  return (
    <Switch>
      {PROFILE_TABS.map(tab => (
        <Route key={tab.href} path={tab.href}><Home section={tab.section} /></Route>
      ))}
      <Route path={"/sky"} component={SkyHomePrototype} />
      <Route path={"/horary"} component={HoraryPage} />
      <Route path={"/zodiac-readings"} component={ZodiacHoraryPage} />
      <Route path={"/history"} component={History} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  useEffect(() => {
    const onAuthError = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      toast.error(message || "Unable to start sign-in. Please try again.");
    };
    window.addEventListener("fg:auth-error", onAuthError);
    return () => window.removeEventListener("fg:auth-error", onAuthError);
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <SovereignTierProvider>
            <Toaster />
            <ProfileSessionProvider>
            <CelestialCommandShell>
            <Suspense fallback={<main role="status" className="flex min-h-[55vh] items-center justify-center px-6 text-center text-sm text-cyan-100"><div className="rounded-2xl border border-cyan-200/20 bg-slate-950/70 px-6 py-5" aria-live="polite">Opening your celestial observatory…</div></main>}>
              <AccountEntryGate><Router /></AccountEntryGate>
            </Suspense>
            </CelestialCommandShell>
            </ProfileSessionProvider>
          </SovereignTierProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
