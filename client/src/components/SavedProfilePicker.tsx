import { useState } from "react";
import { useProfileSession, profileId } from "@/contexts/ProfileSessionContext";
import type { UserProfileData } from "@/components/NatalProfileBuilder";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Props = { onLoad: (profile: UserProfileData) => void; };

export function SavedProfilePicker({ onLoad }: Props) {
  const { savedProfiles, deleteSavedProfile } = useProfileSession();
  const [open, setOpen] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  return (
    <section aria-label="Saved birth profiles" className="rounded-2xl border border-cyan-200/20 bg-slate-950/70 p-5 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-white">Load / Manage Profiles</h2>
          <p className="mt-1 text-xs text-slate-400">Choose a saved birth chart or delete previous profiles.</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="min-h-11 rounded-xl border border-cyan-300/40 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10"
        >
          {open ? "Close saved profiles" : `Saved Profiles (${savedProfiles.length})`}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-2">
          {!savedProfiles.length ? (
            <p className="rounded-lg bg-white/5 p-4 text-sm text-slate-300">
              No saved profiles in this browser yet. Save a birth profile first.
            </p>
          ) : (
            savedProfiles.map((profile, index) => {
              const pKey = profileId(profile);
              return (
                <div
                  key={`${pKey}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
                >
                  <div className="min-w-0">
                    <strong className="block break-words text-sm text-white">{profile.name}</strong>
                    <p className="text-xs text-slate-400">{profile.date} · {profile.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoad(profile)}
                      className="min-h-10 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                    >
                      Load
                    </button>
                    {confirmDeleteKey === pKey ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/80 px-2 py-1 shadow-md">
                        <span className="text-xs font-semibold text-rose-200">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSavedProfile(profile);
                            setConfirmDeleteKey(null);
                            toast.success(`Removed profile for ${profile.name}`);
                          }}
                          className="rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-500"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(null)}
                          className="rounded bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(pKey)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-300/30 px-3 text-xs text-rose-200 hover:bg-rose-500/20"
                        title={`Delete ${profile.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <p className="pt-2 text-xs text-amber-200/80">
            Profiles are stored locally in your browser session and remain available across visits.
          </p>
        </div>
      )}
    </section>
  );
}
