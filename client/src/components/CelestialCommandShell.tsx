import { FloatingInterpreter } from "./FloatingInterpreter";
import { Suspense, type ReactNode } from "react";
import { MobilePageSkeleton } from "./MobilePageSkeleton";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { GuardianNavigation } from "./GuardianNavigation";
import { PrimaryProfileNavigation } from "./PrimaryProfileNavigation";
import "./CelestialCommandShell.css";
import "./MobileFramework.css";

export function CelestialCommandShell({ children }: { children: ReactNode }) {
  useMobileViewport();
  return (
    <div className="fg-command-shell">
      {/* Consistent luxury header across ALL pages */}
      <GuardianNavigation />

      {/* Main content viewport with room for mobile bottom dock */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-slate-900 focus:p-3 focus:text-cyan-100">Skip to content</a>
      <main id="main-content" tabIndex={-1} className="fg-content-canvas">
        <div className="fg-command-main max-w-[1680px] mx-auto px-3 sm:px-6 py-4">
          <Suspense fallback={<MobilePageSkeleton />}>{children}</Suspense>
        </div>
      </main>

      {/* Mobile-only thumb dock navigation */}
      <PrimaryProfileNavigation />
      <FloatingInterpreter />
    </div>
  );
}