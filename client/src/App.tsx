import { lazy, Suspense } from "react";
import { ProfileSessionProvider, useProfileSession } from "./contexts/ProfileSessionContext";
import { PROFILE_TABS } from "./config/profileNavigation";
import { CelestialCommandShell } from "./components/CelestialCommandShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SovereignTierProvider } from "./components/SovereignTierModal";
// Route-level splitting: the large sky map and horary engine UI do not block the home screen.
const SavedProfilesPage = lazy(() => import("./pages/SavedProfilesPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const Home = lazy(() => import("./pages/Home"));
const LegacyHome = lazy(() => import("./pages/LegacyHome"));
const HoraryPage = lazy(() => import("./pages/HoraryPage"));
const ZodiacHoraryPage = lazy(() => import("./pages/ZodiacHoraryPage"));
const History = lazy(() => import("./pages/History"));
const SkyHomePrototype = lazy(() => import("./pages/SkyHomePrototype"));
const LifeStoryPage = lazy(() => import("./pages/LifeStoryPage"));
const SynastryPage = lazy(() => import("./pages/SynastryPage"));
const StandaloneTransitPage = lazy(() => import("./pages/StandaloneTransitPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));

function AccountEntryGate({ children }: { children: React.ReactNode }) {
  // Development mode: no account service is required to use the local app.
  // Keep all profile data in this browser/device until account deployment is ready.
  return <ProfileSessionProvider accountId="guest"><CelestialCommandShell>{children}</CelestialCommandShell></ProfileSessionProvider>;
}

function Router() {
  const [path] = useLocation();
  const { profile } = useProfileSession();
  // A birth profile is still required before opening profile-based observatory modules.
  if (!profile && path !== "/account" && path !== "/profiles" && path !== "/" && path !== "/legacy" && path !== "/horary" && path !== "/zodiac-readings" && path !== "/sky" && path !== "/history") return <Redirect to="/" />;
  return (
    <Switch>
      <Route path="/account" component={AccountPage} />
      <Route path="/profiles" component={SavedProfilesPage} />
      <Route path="/reading/depth"><Home section="reading" /></Route>
      <Route path="/reading/evidence"><Home section="reading" /></Route>
      <Route path="/energy/contacts"><Home section="energy" /></Route>
      <Route path="/energy/consultation"><Home section="energy" /></Route>
      <Route path="/forecast"><Home section="energy" /></Route>
      {PROFILE_TABS.map(tab => (
        <Route key={tab.href} path={tab.href}><Home section={tab.section} /></Route>
      ))}
      <Route path={"/legacy"} component={LegacyHome} />
      <Route path={"/synastry"} component={SynastryPage} />
      <Route path={"/transit-sky"} component={StandaloneTransitPage} />
      <Route path={"/explore"} component={ExplorePage} />
      <Route path={"/sky"} component={SkyHomePrototype} />
      <Route path={"/life-story"} component={LifeStoryPage} />
      <Route path={"/horary"} component={HoraryPage} />
      <Route path={"/zodiac-readings"} component={ZodiacHoraryPage} />
      <Route path={"/history"} component={History} />
      <Route path={"/guide"}><Home section="guide" /></Route>
      <Route path={"/profile"}><Home section="profile" /></Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <SovereignTierProvider>
            <Toaster />
            <Suspense fallback={<main role="status" className="flex min-h-[55vh] items-center justify-center px-6 text-center text-sm text-cyan-100"><div className="rounded-2xl border border-cyan-200/20 bg-slate-950/70 px-6 py-5" aria-live="polite">Opening your celestial observatory…</div></main>}>
              <AccountEntryGate><Router /></AccountEntryGate>
            </Suspense>
          </SovereignTierProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
