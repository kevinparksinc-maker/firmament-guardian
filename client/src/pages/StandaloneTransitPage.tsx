import { useState } from "react";
import { Link } from "wouter";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";
import { ChartWheel } from "@/components/ChartWheel";
import { DiamondChart } from "@/components/DiamondChart";
import type { ChartResult } from "../../../server/astronomy";

/** Independent event-time chart: its birth/event coordinates are NOT the user's natal chart. */
export default function StandaloneTransitPage() {
  const { profile } = useProfileSession();
  const [date,setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [time,setTime] = useState("12:00");
  const [location,setLocation] = useState(() => profile?.transitLocation || profile?.location || "");
  const [latitude,setLatitude] = useState(() => String(profile?.transitLatitude ?? profile?.latitude ?? ""));
  const [longitude,setLongitude] = useState(() => String(profile?.transitLongitude ?? profile?.longitude ?? ""));
  const [timezone,setTimezone] = useState(() => profile?.transitTimezone || profile?.timezone || "UTC");
  const [result,setResult] = useState<ChartResult|null>(null);
  const [view,setView] = useState<"diamond"|"wheel">("diamond");
  const calculate = trpc.hybrid.calculate.useMutation();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) &&
    !!location.trim() && !!timezone.trim() && Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) && Math.abs(Number(latitude))<=90 && Math.abs(Number(longitude))<=180;
  const run = async () => {
    if (!valid) return;
    setResult(null);
    try {
      const chart = await calculate.mutateAsync({
        location,latitude:Number(latitude),longitude:Number(longitude),timezone,date,time,
        worldview:"agent",readingScope:"natal",
      });
      // The event-time moving bodies are the independent sky; suppress natal/transit overlays.
      setResult({...chart,transits:[]});
    } catch { /* The mutation error is rendered below. */ }
  };
  return <main className="mx-auto max-w-5xl space-y-5 p-4 text-slate-100 sm:p-6">
    <header className="space-y-2">
      <Link href="/energy" className="text-sm text-cyan-300">← Energy Read</Link>
      <h1 className="font-serif text-3xl text-amber-200">Independent Transit Sky</h1>
      <p className="text-sm text-slate-300">Calculate the sky for its own date, time and location—not the birth chart. Event-time houses and angles come from the same calculation engine. This is not a natal-to-transit overlay.</p>
    </header>
    <section className="grid gap-3 rounded-2xl border border-white/15 bg-slate-950/70 p-4 sm:grid-cols-2">
      <label className="text-xs">Date<input aria-label="Transit date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <label className="text-xs">Local time<input aria-label="Transit local time" type="time" value={time} onChange={e=>setTime(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <label className="text-xs">Location<input aria-label="Transit location" value={location} onChange={e=>setLocation(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <label className="text-xs">IANA timezone<input aria-label="Transit timezone" value={timezone} onChange={e=>setTimezone(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <label className="text-xs">Latitude<input aria-label="Transit latitude" type="number" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <label className="text-xs">Longitude<input aria-label="Transit longitude" type="number" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 p-3 text-white"/></label>
      <button disabled={!valid || calculate.isPending} onClick={run} className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">{calculate.isPending?"Calculating sky…":"Calculate Independent Transit Chart"}</button>
      {calculate.error && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{calculate.error.message}</p>}
    </section>
    {result && <section className="space-y-4">
      <div className="flex gap-2">
        <button onClick={()=>setView("diamond")} className="rounded-lg border border-amber-300/40 px-3 py-2">Diamond</button>
        <button onClick={()=>setView("wheel")} className="rounded-lg border border-amber-300/40 px-3 py-2">Wheel</button>
      </div>
      <p className="text-xs text-slate-400">Event chart · {date} {time} · {location} · {timezone}</p>
      {view==="diamond"?<DiamondChart chart={result}/>:<ChartWheel chart={result}/>}
    </section>}
  </main>;
}
