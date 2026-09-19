import { useEffect, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function speakGuardian(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
  utterance.rate = 0.96;
  utterance.pitch = 0.88;
  utterance.volume = 0.86;
  const preferredVoice = window.speechSynthesis.getVoices().find(voice => /en(-US)?/i.test(voice.lang) && /Google|Samantha|Microsoft/i.test(voice.name));
  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function GuardianVoiceButton({ text, autoSpeak = false, onToggleAutoSpeak }: { text: string; autoSpeak?: boolean; onToggleAutoSpeak?: () => void }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const onStart = () => setSpeaking(true);
    const onEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener("start", onStart);
    window.speechSynthesis.addEventListener("end", onEnd);
    window.speechSynthesis.addEventListener("error", onEnd);
    return () => { window.speechSynthesis.removeEventListener("start", onStart); window.speechSynthesis.removeEventListener("end", onEnd); window.speechSynthesis.removeEventListener("error", onEnd); };
  }, [supported]);

  if (!supported) return null;
  return <div className="flex items-center gap-1">
    <Button type="button" variant="ghost" size="icon" onClick={() => { if (speaking) window.speechSynthesis.cancel(); else speakGuardian(text); }} className="h-7 w-7 rounded-full text-cyan-200/70 hover:bg-cyan-300/10 hover:text-cyan-100" aria-label={speaking ? "Stop Guardian voice" : "Play Guardian voice"}>
      {speaking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
    </Button>
    {onToggleAutoSpeak && <Button type="button" variant="ghost" size="icon" onClick={onToggleAutoSpeak} className={`h-7 w-7 rounded-full ${autoSpeak ? "text-violet-200" : "text-slate-600"}`} aria-label={autoSpeak ? "Disable automatic Guardian voice" : "Enable automatic Guardian voice"}>
      {autoSpeak ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
    </Button>}
  </div>;
}
