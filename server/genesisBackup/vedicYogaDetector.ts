export interface PlanetPlacement {
  name: string;
  sign: string;
  house: number;
  degree: number;
}
export interface YogaResult {
  name: string;
  detected: boolean;
  message: string;
}
const ANGLES = [1,4,7,10];
const OWN_EXALT: Record<string,string[]> = {
 Mars:["Aries","Scorpio","Capricorn"],
 Mercury:["Gemini","Virgo"],
 Jupiter:["Sagittarius","Pisces","Cancer"],
 Venus:["Taurus","Libra","Pisces"],
 Saturn:["Capricorn","Aquarius","Libra"],
};
const PANCHA: Record<string,string> = {
 Mars:"Ruchaka Yoga", Mercury:"Bhadra Yoga", Jupiter:"Hamsa Yoga",
 Venus:"Malavya Yoga", Saturn:"Shasha Yoga",
};
const SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const distance=(a:number,b:number)=>((a-b+12)%12);
export function detectPanchaMahapurushaYogas(planets:PlanetPlacement[],_gender?:string):YogaResult[]{
  return Object.entries(PANCHA).flatMap(([planet,name])=>{
    const body=planets.find(p=>p.name===planet);
    if(!body||!ANGLES.includes(body.house)||!OWN_EXALT[planet].includes(body.sign))return [];
    return [{name,detected:true,message:`${name}: ${planet} in ${body.sign}, angular house ${body.house}, occupying an own or exaltation sign. Traditional Pancha Mahapurusha configuration; further dignity, combustion, planetary strength, and actual life manifestation must be judged separately.`}];
  });
}
export function detectAllYogas(planets:PlanetPlacement[],gender?:string):YogaResult[]{
 const found=detectPanchaMahapurushaYogas(planets,gender);
 const by=(name:string)=>planets.find(p=>p.name===name);
 const moon=by("Moon"),jupiter=by("Jupiter"),sun=by("Sun"),mercury=by("Mercury"),mars=by("Mars");
 const signNumber=(p:PlanetPlacement)=>SIGNS.indexOf(p.sign);
 if(moon&&jupiter&&signNumber(moon)>=0&&signNumber(jupiter)>=0&&[0,3,6,9].includes(distance(signNumber(jupiter),signNumber(moon)))){
  found.push({name:"Gaja Kesari Yoga (basic)",detected:true,message:`Jupiter is in a kendra from the Moon by sign: Jupiter ${jupiter.sign}, Moon ${moon.sign}. Basic geometric condition only; traditional cancellation and strength conditions have not been assessed.`});
 }
 if(sun&&mercury&&sun.sign===mercury.sign){
  found.push({name:"Budha-Aditya Yoga (basic)",detected:true,message:`Sun and Mercury are in ${sun.sign}. A same-sign combination is present; combustion, exact conjunction, planetary strength and cancellation must be judged separately.`});
 }
 if(moon&&mars&&moon.sign===mars.sign){
  found.push({name:"Chandra-Mangala Yoga (conjunction variant)",detected:true,message:`Moon and Mars occupy ${moon.sign}. This detects the same-sign variant only; exact orb and other historical definitions need separate assessment.`});
 }
 return found;
}
