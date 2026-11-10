import type { ReactNode } from "react";
import { GuardianNavigation } from "./GuardianNavigation";
import { PrimaryProfileNavigation } from "./PrimaryProfileNavigation";
import "./CelestialCommandShell.css";

export function CelestialCommandShell({ children }: { children: ReactNode }) {
  return (
    <div className="fg-command-shell">
      {/* Consistent luxury header across ALL pages */}
      <GuardianNavigation />

      {/* Main content viewport with room for mobile bottom dock */}
      <main className="min-w-0 pb-20 md:pb-6">
        <div className="fg-command-main max-w-[1680px] mx-auto px-3 sm:px-6 py-4">
          {children}
        </div>
      </main>

      {/* Mobile-only thumb dock navigation */}
      <PrimaryProfileNavigation />
    </div>
  );
}