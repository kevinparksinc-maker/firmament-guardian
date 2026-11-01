import { lazy, Suspense } from "react";
import { CelestialCommandShell } from "./components/CelestialCommandShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SovereignTierProvider } from "./components/SovereignTierModal";
// Route-level splitting: the large sky map and horary engine UI do not block the home screen.
const Home = lazy(() => import("./pages/Home"));
const HoraryPage = lazy(() => import("./pages/HoraryPage"));
const ZodiacHoraryPage = lazy(() => import("./pages/ZodiacHoraryPage"));
const History = lazy(() => import("./pages/History"));
const SkyHomePrototype = lazy(() => import("./pages/SkyHomePrototype"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <SovereignTierProvider>
            <Toaster />
            <CelestialCommandShell>
            <Suspense fallback={<main role="status" className="flex min-h-[55vh] items-center justify-center px-6 text-center text-sm text-cyan-100"><div className="rounded-2xl border border-cyan-200/20 bg-slate-950/70 px-6 py-5" aria-live="polite">Opening your celestial observatory…</div></main>}>
              <Router />
            </Suspense>
            </CelestialCommandShell>
          </SovereignTierProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
