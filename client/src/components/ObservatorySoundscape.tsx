import { useEffect, useRef, useState } from "react";
import { AudioLines, Volume2, VolumeX } from "lucide-react";

type AudioNodes = {
  context: AudioContext;
  master: GainNode;
  oscillators: OscillatorNode[];
  noise: AudioBufferSourceNode;
};

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.35;
  return buffer;
}

function startSoundscape(): AudioNodes {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);

  const lowPass = context.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 520;
  lowPass.Q.value = 0.7;
  lowPass.connect(master);

  const oscillators = [
    { frequency: 55, type: "sine" as OscillatorType, gain: 0.12 },
    { frequency: 82.41, type: "triangle" as OscillatorType, gain: 0.045 },
    { frequency: 164.81, type: "sine" as OscillatorType, gain: 0.018 },
  ].map(({ frequency, type, gain }) => {
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = (Math.random() - 0.5) * 5;
    oscillatorGain.gain.value = gain;
    oscillator.connect(oscillatorGain).connect(lowPass);
    oscillator.start();
    return oscillator;
  });

  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 410;
  noiseFilter.Q.value = 0.45;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.035;
  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context);
  noise.loop = true;
  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start();

  master.gain.exponentialRampToValueAtTime(0.075, context.currentTime + 1.8);
  return { context, master, oscillators, noise };
}

function stopSoundscape(nodes: AudioNodes) {
  const now = nodes.context.currentTime;
  nodes.master.gain.cancelScheduledValues(now);
  nodes.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  window.setTimeout(() => {
    nodes.oscillators.forEach(oscillator => oscillator.stop());
    nodes.noise.stop();
    void nodes.context.close();
  }, 850);
}

export function ObservatorySoundscape() {
  const [enabled, setEnabled] = useState(false);
  const nodesRef = useRef<AudioNodes | null>(null);

  useEffect(() => () => { if (nodesRef.current) stopSoundscape(nodesRef.current); }, []);

  const toggle = () => {
    if (enabled && nodesRef.current) {
      stopSoundscape(nodesRef.current);
      nodesRef.current = null;
      setEnabled(false);
      return;
    }
    const nodes = startSoundscape();
    nodesRef.current = nodes;
    setEnabled(true);
  };

  return <button type="button" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "Mute observatory soundscape" : "Enable observatory soundscape"} className="fixed right-5 top-[4.1rem] z-30 inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-slate-950/65 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-100 shadow-xl shadow-violet-950/20 backdrop-blur-xl hover:border-violet-200/45 hover:bg-slate-900/80">
    {enabled ? <Volume2 className="h-3.5 w-3.5 text-violet-300" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
    <AudioLines className={`h-3.5 w-3.5 ${enabled ? "animate-pulse text-cyan-300" : "text-slate-500"}`} />
    {enabled ? "Soundscape on" : "Soundscape off"}
  </button>;
}
