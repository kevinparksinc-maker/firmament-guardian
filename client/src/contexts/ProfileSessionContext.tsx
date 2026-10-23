import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ChartResult } from "../../../server/astronomy";
import type { UserProfileData } from "@/components/NatalProfileBuilder";

const PROFILE_KEY = "algorithms_cosmos_profile";

function readProfile(): UserProfileData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    return stored ? (JSON.parse(stored) as UserProfileData) : null;
  } catch {
    return null;
  }
}

type ProfileSession = {
  profile: UserProfileData | null;
  chart: ChartResult | null;
  setProfile: (next: UserProfileData | null) => void;
  setChart: Dispatch<SetStateAction<ChartResult | null>>;
};

const ProfileSessionContext = createContext<ProfileSession | null>(null);

export function ProfileSessionProvider({ children }: { children: ReactNode }) {
  const [profile, updateProfile] = useState<UserProfileData | null>(readProfile);
  const [chart, setChart] = useState<ChartResult | null>(null);

  const setProfile = useCallback((next: UserProfileData | null) => {
    updateProfile(next);
    setChart(null);
    if (typeof window === "undefined") return;
    try {
      if (next) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch {
      // The current session remains usable if local storage is blocked.
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const updated = readProfile();
      updateProfile(current => {
        if (JSON.stringify(current) === JSON.stringify(updated)) return current;
        setChart(null);
        return updated;
      });
    };
    window.addEventListener("storage", sync);
    window.addEventListener("fg:profile-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("fg:profile-updated", sync);
    };
  }, []);

  const value = useMemo(() => ({ profile, chart, setProfile, setChart }), [profile, chart, setProfile]);
  return <ProfileSessionContext.Provider value={value}>{children}</ProfileSessionContext.Provider>;
}

export function useProfileSession() {
  const context = useContext(ProfileSessionContext);
  if (!context) throw new Error("ProfileSessionProvider is required");
  return context;
}
