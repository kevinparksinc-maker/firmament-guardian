import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ChartResult } from "../../../server/astronomy";
import type { UserProfileData } from "@/components/NatalProfileBuilder";

const PROFILE_KEY = "algorithms_cosmos_profile";
const SAVED_PROFILES_KEY = "fg:saved-birth-profiles:v1";

function legacyKey(p: UserProfileData): string {
  return [p.name.trim().toLowerCase(), p.date, p.time, p.location.trim().toLowerCase()].join("|");
}

function profileId(p: UserProfileData): string {
  return p.id || legacyKey(p);
}

function ensureId(p: UserProfileData): UserProfileData {
  return p.id ? p : { ...p, id: crypto.randomUUID() };
}

function readSavedProfiles(): UserProfileData[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_PROFILES_KEY) || "[]");
    const valid = Array.isArray(value) ? value.filter((p): p is UserProfileData => Boolean(p && typeof p.name === "string" && typeof p.date === "string" && typeof p.location === "string")) : [];
    const migrated = valid.map(ensureId);
    if (valid.some(p => !p.id)) window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return []; }
}


function readProfile(): UserProfileData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UserProfileData;
      if (parsed && typeof parsed.name === "string" && parsed.location) {
        const saved = readSavedProfiles().find(p => p.id === parsed.id || legacyKey(p) === legacyKey(parsed));
        const migrated = saved || ensureId(parsed);
        if (!parsed.id) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    return null;
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
  saveEditedProfile: (previous: UserProfileData, next: UserProfileData) => void;
  importProfiles: (profiles: UserProfileData[]) => number;
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
    const saved = next ? ensureId(next) : null;
    updateProfile(saved);
    setChart(null);
    if (typeof window === "undefined") return;
    try {
      if (saved) {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));
        const existing = readSavedProfiles();
        const withoutMatch = existing.filter(p => profileId(p) !== profileId(saved));
        const updated = [saved, ...withoutMatch].slice(0, 100);
        window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
        setSavedProfiles(updated);
      } else window.localStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch {
      // The current session remains usable if local storage is blocked.
    }
  }, []);

  const saveEditedProfile = useCallback((previous: UserProfileData, next: UserProfileData) => {
    const saved = { ...next, id: previous.id || next.id || crypto.randomUUID() };
    updateProfile(saved);
    setChart(null);
    if (typeof window === "undefined") return;
    try {
      const updated = [saved, ...readSavedProfiles().filter(p =>
        profileId(p) !== profileId(previous) && profileId(p) !== profileId(saved) && legacyKey(p) !== legacyKey(previous)
      )].slice(0, 100);
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));
      window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
      setSavedProfiles(updated);
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch {
      // Editing remains available for this session if browser storage is blocked.
    }
  }, []);

  const deleteSavedProfile = useCallback((target: UserProfileData) => {
    const updated = readSavedProfiles().filter(p => profileId(p) !== profileId(target));
    const isActive = profile && (profileId(profile) === profileId(target) || legacyKey(profile) === legacyKey(target));
    try {
      window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
      setSavedProfiles(updated);
      if (isActive) {
        window.localStorage.removeItem(PROFILE_KEY);
        updateProfile(null);
        setChart(null);
      }
      window.dispatchEvent(new Event("fg:profile-updated"));
    } catch { /* Browser storage may be unavailable. */ }
  }, [profile]);

  const importProfiles = useCallback((incoming: UserProfileData[]): number => {
    const existing = readSavedProfiles();
    const known = new Set(existing.map(profileId));
    const added: UserProfileData[] = [];
    for (const candidate of incoming) {
      if (!candidate || typeof candidate.name !== "string" || !candidate.name.trim() ||
          !/^\\d{4}-\\d{2}-\\d{2}$/.test(candidate.date) ||
          !/^\\d{2}:\\d{2}$/.test(candidate.time) ||
          typeof candidate.location !== "string" ||
          !Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude) ||
          Math.abs(candidate.latitude) > 90 || Math.abs(candidate.longitude) > 180 ||
          typeof candidate.timezone !== "string" || !candidate.timezone) continue;
      const saved = ensureId(candidate);
      if (!known.has(profileId(saved))) {
        known.add(profileId(saved));
        added.push(saved);
      }
    }
    if (!added.length) return 0;
    const updated = [...added, ...existing].slice(0, 100);
    window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
    setSavedProfiles(updated);
    window.dispatchEvent(new Event("fg:profile-updated"));
    return added.length;
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
    () => ({ profile, chart, savedProfiles, setProfile, saveEditedProfile, importProfiles, updateTransitLocation, setChart, deleteSavedProfile }),
    [profile, chart, savedProfiles, setProfile, saveEditedProfile, importProfiles, updateTransitLocation, deleteSavedProfile]
  );
  return <ProfileSessionContext.Provider value={value}>{children}</ProfileSessionContext.Provider>;
}

export function useProfileSession() {
  const context = useContext(ProfileSessionContext);
  if (!context) throw new Error("ProfileSessionProvider is required");
  return context;
}
