import { lazy, Suspense, useEffect, useState } from "react";
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
const LifeStoryPage = lazy(() => import("./pages/LifeStoryPage"));
const SynastryPage = lazy(() => import("./pages/SynastryPage"));
const EnergyPage = lazy(() => import("./pages/EnergyPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));

function AccountEntryGate({ children }: { children: React.ReactNode }) {
  // Gracefully load account info in the background without blocking the observatory preview
  trpc.auth.me.useQuery(undefined, { retry: false });
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
      <Route path={"/synastry"} component={SynastryPage} />
      <Route path={"/energy"} component={EnergyPage} />
      <Route path={"/explore"} component={ExplorePage} />
      <Route path={"/sky"} component={SkyHomePrototype} />
      <Route path={"/life-story"} component={LifeStoryPage} />
      <Route path={"/horary"} component={HoraryPage} />
      <Route path={"/zodiac-readings"} component={ZodiacHoraryPage} />
      <Route path={"/history"} component={History} />
      <Route path={"/guide"}><Home section="guide" /></Route>
      <Route path={"/profile"}><Home section="profile" /></Route>
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
