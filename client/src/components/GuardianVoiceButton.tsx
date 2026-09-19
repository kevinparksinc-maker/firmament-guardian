import { useEffect, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

type VoiceStatus = "idle" | "speaking" | "unavailable" | "error";

export function speakGuardian(text: string, onStatus?: (status: VoiceStatus) => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    onStatus?.("unavailable");
    return false;
  }
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim());
  utterance.rate = 0.94;
  utterance.pitch = 0.88;
  utterance.volume = 1;
  utterance.onstart = () => onStatus?.("speaking");
  utterance.onend = () => onStatus?.("idle");
  utterance.onerror = () => onStatus?.("error");
  let started = false;
  const chooseVoice = () => {
    if (started) return;
    started = true;
    const voices = synthesis.getVoices();
    const preferred = voices.find(voice => /^en(-US)?/i.test(voice.lang) && /Google|Samantha|Microsoft|Alex/i.test(voice.name)) || voices.find(voice => /^en/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    synthesis.speak(utterance);
  };
  const voices = synthesis.getVoices();
  if (voices.length) chooseVoice();
  else { synthesis.addEventListener("voiceschanged", chooseVoice, { once: true }); window.setTimeout(chooseVoice, 250); }
  return true;
}

export function GuardianVoiceButton({ text }: { text: string }) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  if (!supported) return null;
  const speaking = status === "speaking";
  return <Button type="button" variant="ghost" size="icon" onClick={() => { if (speaking) { window.speechSynthesis.cancel(); setStatus("idle"); } else speakGuardian(text, setStatus); }} className={`h-7 w-7 rounded-full ${status === "error" ? "text-rose-300" : "text-cyan-200/70 hover:bg-cyan-300/10 hover:text-cyan-100"}`} aria-label={speaking ? "Stop Guardian voice" : "Play Guardian voice"} title={status === "error" ? "Voice failed — try again" : "Play Guardian voice"}>
    {speaking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "error" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
  </Button>;
}
