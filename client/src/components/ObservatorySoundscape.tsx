import { useEffect, useRef, useState } from "react";
import { AudioLines, ChevronDown, Pause, Play, Volume2, VolumeX } from "lucide-react";

const TRACK = "/assets/firmament-inner-peace-528hz.mp3";
const ENABLED_KEY = "firmament-music-enabled";
const VOLUME_KEY = "firmament-music-volume";

export function ObservatorySoundscape() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(0.22);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1) setVolume(storedVolume);
    const storedEnabled = window.localStorage.getItem(ENABLED_KEY);
    const nextEnabled = storedEnabled !== "false";
    setEnabled(nextEnabled);
    window.localStorage.setItem(ENABLED_KEY, String(nextEnabled));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.loop = true;
    if (enabled && playing) void audio.play().catch(() => { setPlaying(false); });
    if (!enabled || !playing) audio.pause();
  }, [enabled, playing, volume]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const togglePlayback = () => {
    const next = !playing;
    setEnabled(true);
    setPlaying(next);
    window.localStorage.setItem(ENABLED_KEY, "true");
  };

  const toggleMute = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    togglePlayback();
  };

  const updateVolume = (value: number) => {
    setVolume(value);
    window.localStorage.setItem(VOLUME_KEY, String(value));
    if (value > 0 && !playing) setPlaying(true);
    setEnabled(true);
    window.localStorage.setItem(ENABLED_KEY, "true");
  };

  return <>
    <audio ref={audioRef} src={TRACK} preload="metadata" autoPlay onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} aria-hidden="true" />
    <div className="fixed bottom-20 right-3 z-30 flex items-center gap-2 sm:bottom-4 sm:right-4"><div className={`overflow-hidden rounded-full border border-violet-200/20 bg-slate-950/85 shadow-xl shadow-violet-950/20 backdrop-blur-xl transition-all ${expanded ? "w-52" : "w-0"}`}><div className="flex h-10 items-center gap-2 px-3"><span className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-violet-100">Inner Peace · 528 Hz</span><input aria-label="Music volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => updateVolume(Number(event.target.value))} className="w-16 accent-cyan-300" /></div></div><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label="Open music controls" className="rounded-full border border-violet-200/20 bg-slate-950/85 p-2 text-slate-300 shadow-xl shadow-violet-950/20 backdrop-blur-xl hover:border-violet-200/45 hover:text-white"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /></button><button type="button" onClick={togglePlayback} aria-pressed={playing} aria-label={playing ? "Pause background music" : "Play background music"} className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-slate-950/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-violet-100 shadow-xl shadow-violet-950/20 backdrop-blur-xl hover:border-violet-200/45 hover:bg-slate-900/90">{playing ? <Pause className="h-3.5 w-3.5 text-cyan-300" /> : <Play className="h-3.5 w-3.5 text-violet-200" />}<span className="hidden sm:inline">{playing ? "Music on" : "Music off"}</span></button><button type="button" onClick={toggleMute} aria-label={playing ? "Mute background music" : "Unmute background music"} className="rounded-full border border-violet-200/20 bg-slate-950/85 p-2 text-slate-300 shadow-xl shadow-violet-950/20 backdrop-blur-xl hover:border-violet-200/45 hover:text-white">{playing ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}</button><AudioLines className={`h-3.5 w-3.5 ${playing ? "animate-pulse text-cyan-300" : "text-slate-600"}`} aria-hidden="true" /></div>
  </>;
}
