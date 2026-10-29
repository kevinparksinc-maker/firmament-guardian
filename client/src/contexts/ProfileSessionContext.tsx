import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ChartResult } from "../../../server/astronomy";
import type { UserProfileData } from "@/components/NatalProfileBuilder";

const PROFILE_KEY = "algorithms_cosmos_profile";
const SAVED_PROFILES_KEY = "fg:saved-birth-profiles:v1";

function profileId(p: UserProfileData): string {
  return [p.name.trim().toLowerCase(), p.date, p.time, p.location.trim().toLowerCase()].join("|");
}

function readSavedProfiles(): UserProfileData[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_PROFILES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((p): p is UserProfileData => Boolean(p && typeof p.name === "string" && typeof p.date === "string" && typeof p.location === "string")) : [];
  } catch { return []; }
}


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
  savedProfiles: UserProfileData[];
  deleteSavedProfile: (profile: UserProfileData) => void;
  setProfile: (next: UserProfileData | null) => void;
  updateTransitLocation: (transit: {
    transitLocation: string;
    transitLatitude: number;
    transitLongitude: number;
    transitTimezone: string;
  }) => void;
  setChart: Dispatch<SetStateAction<ChartResult | null>>;
};

const ProfileSessionContext = createContext<ProfileSession | null>(null);

export function ProfileSessionProvider({ children }: { children: ReactNode }) {
  const [profile, updateProfile] = useState<UserProfileData | null>(readProfile);
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<UserProfileData[]>(readSavedProfiles);

  const setProfile = useCallback((next: UserProfileData | null) => {
    updateProfile(next);
    setChart(null);
    if (typeof window === "undefined") return;
    try {
      if (next) {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        const existing = readSavedProfiles();
        const withoutMatch = existing.filter(p => profileId(p) !== profileId(next));
        const updated = [next, ...withoutMatch].slice(0, 100);
        window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
        setSavedProfiles(updated);
      } else window.localStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch {
      // The current session remains usable if local storage is blocked.
    }
  }, []);

  const deleteSavedProfile = useCallback((target: UserProfileData) => {
    const updated = readSavedProfiles().filter(p => profileId(p) !== profileId(target));
    try {
      window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
      setSavedProfiles(updated);
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch { /* Browser storage may be unavailable. */ }
  }, []);

  useEffect(() => {
    const sync = () => {
      setSavedProfiles(readSavedProfiles());
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

  const updateTransitLocation = useCallback((transit: {
    transitLocation: string;
    transitLatitude: number;
    transitLongitude: number;
    transitTimezone: string;
  }) => {
    updateProfile(current => {
      if (!current) return current;
      const next: UserProfileData = {
        ...current,
        transitLocation: transit.transitLocation,
        transitLatitude: transit.transitLatitude,
        transitLongitude: transit.transitLongitude,
        transitTimezone: transit.transitTimezone,
      };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
          const existing = readSavedProfiles();
          const withoutMatch = existing.filter(p => profileId(p) !== profileId(next));
          const updated = [next, ...withoutMatch].slice(0, 100);
          window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
          setSavedProfiles(updated);
        } catch {}
      }
      return next;
    });
    window.dispatchEvent(new CustomEvent("fg:transit-location-updated", { detail: transit }));
  }, []);

  const value = useMemo(
    () => ({ profile, chart, savedProfiles, setProfile, updateTransitLocation, setChart, deleteSavedProfile }),
    [profile, chart, savedProfiles, setProfile, updateTransitLocation, deleteSavedProfile]
  );
  return <ProfileSessionContext.Provider value={value}>{children}</ProfileSessionContext.Provider>;
}

export function useProfileSession() {
  const context = useContext(ProfileSessionContext);
  if (!context) throw new Error("ProfileSessionProvider is required");
  return context;
}
