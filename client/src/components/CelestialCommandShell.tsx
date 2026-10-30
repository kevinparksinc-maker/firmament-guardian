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
      <main className="fg-command-viewport min-w-0 pb-20 md:pb-6">
        <div className="fg-command-main">
          {children}
        </div>
      </main>

      {/* Mobile-only thumb dock navigation */}
      <PrimaryProfileNavigation />
    </div>
  );
}
