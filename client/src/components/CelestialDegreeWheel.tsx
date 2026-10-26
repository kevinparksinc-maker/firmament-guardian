/**
 * The Absolute: presentation-only star-frame degree wheel.
 * Longitudes MUST be provided in one verified reference frame by the chart engine.
 * This component never guesses an ayanamsa or changes astronomical positions.
 */
import React, { useState } from "react";

export type WheelPoint = { id: string; glyph: string; longitude: number; label: string; kind?: "planet" | "star" | "angle" };
export type WheelAspect = { from: string; to: string; type: "conjunction" | "square" | "opposition" | "trine" | "sextile" };
export type DegreeWheelProps = {
  points: WheelPoint[];
  aspects?: WheelAspect[];
  houseCusps?: number[];
  referenceFrame: string;
  onSelect?: (point: WheelPoint) => void;
};
const signs = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const names = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const mod = (n: number) => ((n % 360) + 360) % 360;
const polar = (deg: number, r: number) => {
  const a = (deg - 90) * Math.PI / 180;
  return { x: 250 + Math.cos(a) * r, y: 250 + Math.sin(a) * r };
};
const line = (a: number,b: number,r1: number,r2: number) => {
  const p=polar(a,r1),q=polar(b,r2);
  return <line x1={p.x} y1={p.y} x2={q.x} y2={q.y}/>;
};
export function elementalDecan(longitude: number) {
  const n=Math.floor(mod(longitude)/30), decan=Math.floor((mod(longitude)%30)/10);
  const elementFamilies=[["Aries","Leo","Sagittarius"],["Taurus","Virgo","Capricorn"],["Gemini","Libra","Aquarius"],["Cancer","Scorpio","Pisces"]];
  const family=elementFamilies.find(f=>f.includes(names[n]))!;
  return { sign:names[n], decan:decan+1, familySign:family[(family.indexOf(names[n])+decan)%3] };
}
export function CelestialDegreeWheel({points,aspects=[],houseCusps=[],referenceFrame,onSelect}:DegreeWheelProps) {
  const [selected,setSelected]=useState<string|null>(null);
  const byId=new Map(points.map(p=>[p.id,p]));
  const chosen=points.find(p=>p.id===selected);
  return <section aria-label="The Absolute celestial degree wheel" className="w-full rounded-2xl bg-slate-950 p-3 text-amber-100">
    <div className="mb-2 text-center text-sm font-semibold tracking-widest">THE ABSOLUTE · CELESTIAL WHEEL</div>
    <div className="mb-2 text-center text-xs text-slate-300">Reference: {referenceFrame}</div>
    <svg viewBox="0 0 500 500" role="img" aria-label="360 degree zodiac, houses, decans and planetary positions" className="mx-auto w-full max-w-[650px]">
      {[238,218,190,152].map(r=><circle key={r} cx="250" cy="250" r={r} fill="none" stroke="#c9a75a" strokeWidth={r===238?2:0.8}/>)}
      {Array.from({length:360},(_,i)=><g key={i} stroke="#d9bd7a" strokeWidth={i%10===0?1.4:.5}>{line(i,i,238,i%10===0?226:i%5===0?231:235)}</g>)}
      {Array.from({length:12},(_,i)=><g key={i}>
        <g stroke="#b99450">{line(i*30,i*30,152,238)}</g>
        <text x={polar(i*30+15,203).x} y={polar(i*30+15,203).y} textAnchor="middle" dominantBaseline="middle" fill="#f1cf87" fontSize="23">{signs[i]}</text>
      </g>)}
      {Array.from({length:36},(_,i)=><g key={i} stroke="#786544" strokeDasharray="2 3">{line(i*10,i*10,190,218)}</g>)}
      {houseCusps.length===12 && houseCusps.map((c,i)=><g key={i}>
        <g stroke="#d9c398" strokeWidth="1">{line(mod(c),mod(c),75,152)}</g>
        <text x={polar(mod(c+((mod(houseCusps[(i+1)%12]-c))/2)),115).x} y={polar(mod(c+((mod(houseCusps[(i+1)%12]-c))/2)),115).y} textAnchor="middle" fill="#e8d5aa" fontSize="12">{i+1}</text>
      </g>)}
      {aspects.map((a,i)=>{
        const p=byId.get(a.from),q=byId.get(a.to);
        if(!p||!q)return null;
        const x=polar(mod(p.longitude),150),y=polar(mod(q.longitude),150);
        return <line key={i} x1={x.x} y1={x.y} x2={y.x} y2={y.y} stroke={["trine","sextile"].includes(a.type)?"#49b878":"#e26b67"} strokeWidth="1.4" opacity=".8"/>;
      })}
      {points.map((p,i)=>{
        const pos=polar(mod(p.longitude),p.kind==="star"?177:168);
        return <g key={p.id} onClick={()=>{setSelected(p.id);onSelect?.(p)}} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){setSelected(p.id);onSelect?.(p)}}} aria-label={p.label} style={{cursor:"pointer"}}>
          <circle cx={pos.x} cy={pos.y} r="12" fill={selected===p.id?"#665019":"#081527"} stroke="#e9c77b" strokeWidth=".7"/>
          <text x={pos.x} y={pos.y} fill={p.kind==="star"?"#ffdc7c":"#f7ebd0"} fontSize="15" textAnchor="middle" dominantBaseline="middle">{p.glyph}</text>
        </g>;
      })}
    </svg>
    {chosen && <div className="mt-2 rounded-lg border border-amber-700 p-3 text-sm" aria-live="polite">
      <strong>{chosen.label}</strong> · {names[Math.floor(mod(chosen.longitude)/30)]} {(mod(chosen.longitude)%30).toFixed(2)}° · {elementalDecan(chosen.longitude).familySign} elemental decan
    </div>}
  </section>;
}
