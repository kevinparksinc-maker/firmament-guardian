import { useState } from "react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";

type Frame = "god" | "agent";
const glyphs: Record<string,string> = {Sun:"☉",Moon:"☽",Mercury:"☿",Venus:"♀",Mars:"♂",Jupiter:"♃",Saturn:"♄",Uranus:"♅",Neptune:"♆",Pluto:"♇",Rahu:"☊",Ketu:"☋",NorthNode:"☊",SouthNode:"☋"};
const signs = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const normalize = (value:number) => ((value % 360)+360)%360;

const HOUSE_GEOMETRY = [
  // H1: Top Center Diamond (Ascendant / Lagna)
  {
    house: 1,
    points: "200,0 100,100 200,200 300,100",
    labelPos: { x: 200, y: 72 },
    signPos: { x: 200, y: 35 },
    planetPos: { x: 200, y: 125 },
  },
  // H2: Top-Left Triangle
  {
    house: 2,
    points: "200,0 0,0 100,100",
    labelPos: { x: 100, y: 45 },
    signPos: { x: 145, y: 35 },
    planetPos: { x: 95, y: 72 },
  },
  // H3: Upper-Left Triangle
  {
    house: 3,
    points: "0,0 0,200 100,100",
    labelPos: { x: 45, y: 100 },
    signPos: { x: 35, y: 145 },
    planetPos: { x: 50, y: 75 },
  },
  // H4: Left Center Diamond (Nadir / Bandhu)
  {
    house: 4,
    points: "0,200 100,100 200,200 100,300",
    labelPos: { x: 100, y: 172 },
    signPos: { x: 35, y: 200 },
    planetPos: { x: 100, y: 225 },
  },
  // H5: Lower-Left Triangle
  {
    house: 5,
    points: "0,200 0,400 100,300",
    labelPos: { x: 45, y: 300 },
    signPos: { x: 35, y: 260 },
    planetPos: { x: 50, y: 335 },
  },
  // H6: Bottom-Left Triangle
  {
    house: 6,
    points: "0,400 200,400 100,300",
    labelPos: { x: 100, y: 355 },
    signPos: { x: 145, y: 375 },
    planetPos: { x: 95, y: 330 },
  },
  // H7: Bottom Center Diamond (Descendant / Jaya)
  {
    house: 7,
    points: "200,400 100,300 200,200 300,300",
    labelPos: { x: 200, y: 272 },
    signPos: { x: 200, y: 375 },
    planetPos: { x: 200, y: 325 },
  },
  // H8: Bottom-Right Triangle
  {
    house: 8,
    points: "200,400 400,400 300,300",
    labelPos: { x: 300, y: 355 },
    signPos: { x: 255, y: 375 },
    planetPos: { x: 305, y: 330 },
  },
  // H9: Lower-Right Triangle
  {
    house: 9,
    points: "400,400 400,200 300,300",
    labelPos: { x: 355, y: 300 },
    signPos: { x: 365, y: 260 },
    planetPos: { x: 350, y: 335 },
  },
  // H10: Right Center Diamond (Midheaven / Karma)
  {
    house: 10,
    points: "400,200 300,300 200,200 300,100",
    labelPos: { x: 300, y: 172 },
    signPos: { x: 365, y: 200 },
    planetPos: { x: 300, y: 225 },
  },
  // H11: Upper-Right Triangle
  {
    house: 11,
    points: "400,200 400,0 300,100",
    labelPos: { x: 355, y: 100 },
    signPos: { x: 365, y: 145 },
    planetPos: { x: 350, y: 75 },
  },
  // H12: Top-Right Triangle
  {
    house: 12,
    points: "400,0 200,0 300,100",
    labelPos: { x: 300, y: 45 },
    signPos: { x: 255, y: 35 },
    planetPos: { x: 305, y: 72 },
  },
];


function GuardianDiamond({chart,frame,selected,onSelect}:{chart:ChartResult;frame:Frame;selected:string|null;onSelect:(name:string)=>void}) {
  const all: ChartRow[] = [...chart.movingBodies, chart.northNode, chart.southNode].filter((body):body is ChartRow => Boolean(body) && Number.isFinite(body!.longitude));
  const houseFor = (row: ChartRow) => frame === "god" ? row.godHouse ?? Math.floor(normalize(row.longitude)/30)+1 : row.agentHouse;
  const anchor = frame === "god" ? 0 : Number(chart.ascendant?.longitude);
  const anchorValid = Number.isFinite(anchor);
  const current = all.find(row=>row.name===selected);
  return <div className="min-w-0 rounded-xl border border-white/15 bg-slate-950/80 p-3">
    <h3 className="mb-1 text-sm font-semibold text-white">{frame === "god" ? "God View · fixed Aries houses" : "Agent View · event Ascendant houses"}</h3>
    <p className="mb-3 text-xs text-slate-400">{frame === "god" ? "House 1 = 0° Aries" : anchorValid ? `House 1 = ${anchor.toFixed(2)}° longitude` : "Ascendant unavailable"}</p>
    <svg viewBox="0 0 400 400" className="mx-auto block w-full max-w-[480px]" role="img" aria-label={`${frame} North Indian diamond chart with twelve houses and calculated planetary placements`}>
      <rect x="1" y="1" width="398" height="398" fill="#081427" stroke="#c49c55" strokeWidth="1.5"/>
      {HOUSE_GEOMETRY.map(area => {
        const members = all.filter(row=>houseFor(row)===area.house);
        const signIndex = Math.floor(normalize(anchor+(area.house-1)*30)/30);
        return <g key={area.house}>
          <polygon points={area.points} fill={selected && members.some(row=>row.name===selected)?"#1a4b63":"transparent"} stroke="#a98a5f" strokeWidth="1"/>
          <text x={area.labelPos.x} y={area.labelPos.y} fill="#d6b878" textAnchor="middle" fontSize="11">H{area.house}</text>
          <text x={area.signPos.x} y={area.signPos.y} fill="#91bad0" textAnchor="middle" fontSize="13">{signs[signIndex]}</text>
          {members.slice(0,5).map((row,i)=><text key={row.name} x={area.planetPos.x} y={area.planetPos.y+(i-(Math.min(members.length,5)-1)/2)*13} fill={row.name===selected?"#ffde87":"#e9eef7"} textAnchor="middle" fontSize="12" fontWeight={row.name===selected?"bold":"normal"}>{glyphs[row.name]??row.name.slice(0,3)}</text>)}
          {members.length>5&&<text x={area.planetPos.x+28} y={area.planetPos.y+31} fill="#ffcf8f" fontSize="10">+{members.length-5}</text>}
        </g>;
      })}
    </svg>
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Select a planet to inspect">
      {all.map(row=><button key={row.name} type="button" onClick={()=>onSelect(row.name)} aria-pressed={selected===row.name} className={`rounded-md border px-2 py-1 text-xs ${selected===row.name?"border-amber-300 bg-amber-300/20 text-white":"border-white/10 text-slate-300 hover:bg-white/10"}`}>{glyphs[row.name]??"•"} {row.name}</button>)}
    </div>
    {current&&<p className="mt-3 rounded-md bg-white/5 p-2 text-xs text-slate-300">{current.name} · {current.display} · {houseFor(current)!=null?`House ${houseFor(current)}`:"house unavailable"}</p>}
  </div>;
}

export function GuardianDiamondCharts({chart}:{chart:ChartResult}) {
  const [selected,setSelected] = useState<string|null>("Sun");
  const available = chart.agentViewAvailable && chart.ascendant != null && chart.movingBodies.some(row=>row.agentHouse != null);
  return <section className="rounded-2xl border border-amber-300/20 bg-slate-900/65 p-4 sm:p-5" aria-label="Visual diamond chart comparison">
    <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Visual chart evidence · North Indian diamond</p><h2 className="mt-1 font-serif text-2xl text-white">See where the planets actually sit</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">The same planetary longitudes shown through fixed God houses and, when available, observer-relative Agent houses. Select a planet to highlight it in both views.</p></div>
    <div className={available?"grid gap-4 lg:grid-cols-2":"grid gap-4"}>
      <GuardianDiamond chart={chart} frame="god" selected={selected} onSelect={setSelected}/>
      {available&&<GuardianDiamond chart={chart} frame="agent" selected={selected} onSelect={setSelected}/>}
    </div>
    {!available&&<p className="mt-3 text-xs text-slate-400">Agent diamond is displayed when a calculated event Ascendant and personal house placements are available.</p>}
    <p className="mt-3 text-xs text-slate-500">Visual placement evidence only. Traditional doctrine, chart calculations, and final interpretations remain in the existing engine.</p>
  </section>;
}
