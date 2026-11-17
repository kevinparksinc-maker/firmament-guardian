import { ZODIAC_SIGNS, normalizeLongitude } from "../../../shared/hybrid";
import type { CanonicalPlacementMapping } from "../../../shared/masterPlanetPersonaConfig";
import type { PlanetPersonaTrait } from "../../../shared/planetPersonaMatrix";
import type { ChartResult } from "../../astronomy";
import { SIGN_CANON_RECORDS } from "../canon/planetsAndSigns";
import { retrieveChartCanonDossier } from "../canon/retriever";
import type {
  ChartCanonDossier,
  DispositorChainNode,
  RetrievedPlacementDossier,
} from "../canon/types";
import type { SynthesisResult } from "./types";

type AspectContactInfo = {
  aspect: string;
  otherName: string;
  otherSign: string;
  otherHouse: number;
  otherRuled: number[];
  isHost: boolean;
  isGuest: boolean;
  isMutualReception: boolean;
};

type Element = "Fire" | "Earth" | "Air" | "Water";

function stripOrbParen(aspectLabel: string): string {
  return aspectLabel.replace(/\s*\([^)]*\borb\b[^)]*\)/gi, "").trim();
}

export function getHousesRuledByPlanet(chart: ChartResult): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const houses = chart.houses;
  if (!Array.isArray(houses) || houses.length < 12) {
    const ascLon = chart.ascendant?.longitude;
    const baseSignIdx =
      ascLon != null && Number.isFinite(ascLon)
        ? Math.floor(normalizeLongitude(ascLon) / 30)
        : 0;
    for (let h = 1; h <= 12; h += 1) {
      const sign = ZODIAC_SIGNS[(baseSignIdx + h - 1) % 12];
      const lord = SIGN_CANON_RECORDS[sign]?.domicileLord;
      if (lord) {
        map.set(lord, [...(map.get(lord) ?? []), h]);
      }
    }
    return map;
  }

  for (let i = 0; i < 12; i += 1) {
    const cuspLon = houses[i];
    if (!Number.isFinite(cuspLon)) continue;
    const sign = ZODIAC_SIGNS[Math.floor(normalizeLongitude(cuspLon) / 30)];
    const lord = SIGN_CANON_RECORDS[sign]?.domicileLord;
    if (lord) {
      const houseNum = i + 1;
      const existing = map.get(lord) ?? [];
      if (!existing.includes(houseNum)) {
        map.set(lord, [...existing, houseNum]);
      }
    }
  }
  return map;
}

function describeHouseTopicShort(houseNum: number): string {
  const map: Record<number, string> = {
    1: "personal identity and outward posture",
    2: "earned income, savings, and self-reliance",
    3: "everyday speech, writing, learning, and local ties",
    4: "home life, family roots, parents, and private shelter",
    5: "creative play, romance, children, and personal delight",
    6: "daily routines, practical craft, and physical strain",
    7: "committed partnerships, fairness, and one-on-one trust",
    8: "shared money, debt, intimacy, and deep vulnerability",
    9: "convictions, ethics, serious study, and wider horizons",
    10: "reputation, authority, public work, and standing",
    11: "friendships, group ventures, allies, and long aims",
    12: "private thought, quiet recovery, and unspoken pressure",
  };
  return map[houseNum] ?? "core life responsibilities";
}

function parseAspectContacts(
  trait: PlanetPersonaTrait,
  placementByName: Map<string, PlanetPersonaTrait>,
  housesRuledMap: Map<string, number[]>
): AspectContactInfo[] {
  const traitDomicileLord = SIGN_CANON_RECORDS[trait.sign]?.domicileLord;
  const out: AspectContactInfo[] = [];

  for (const raw of trait.activeAspects) {
    const clean = stripOrbParen(raw);
    const match = clean.match(/^([A-Za-z]+)\s+(.+)$/);
    if (!match) continue;
    const aspect = match[1].toLowerCase();
    const otherName = match[2].trim();
    const otherTrait = placementByName.get(otherName);
    if (!otherTrait) continue;

    const otherLord = SIGN_CANON_RECORDS[otherTrait.sign]?.domicileLord;
    const isHost = traitDomicileLord === otherName;
    const isGuest = otherLord === trait.planet;
    const isMutualReception = isHost && isGuest;

    out.push({
      aspect,
      otherName,
      otherSign: otherTrait.sign,
      otherHouse: otherTrait.house,
      otherRuled: housesRuledMap.get(otherName) ?? [],
      isHost,
      isGuest,
      isMutualReception,
    });
  }
  return out;
}

/**
 * Retained strictly for the silent internal LLM calculation matrix in narrative.ts.
 * Never rendered to the reader directly.
 */
export function buildNamedChartConfigurations(
  matrix: PlanetPersonaTrait[],
  housesRuledMap: Map<string, number[]>
): string[] {
  const byName = new Map(matrix.map(p => [p.planet, p]));
  const items: string[] = [];

  const mercury = byName.get("Mercury");
  const pluto = byName.get("Pluto");
  const moon = byName.get("Moon");
  const jupiter = byName.get("Jupiter");
  const sun = byName.get("Sun");
  const mars = byName.get("Mars");
  const saturn = byName.get("Saturn");
  const asc = byName.get("Ascendant");

  if (mercury && pluto && moon) {
    const mercAspects = mercury.activeAspects.map(stripOrbParen).join(" ").toLowerCase();
    const moonAspects = moon.activeAspects.map(stripOrbParen).join(" ").toLowerCase();
    if (mercAspects.includes("pluto") && (mercAspects.includes("moon") || moonAspects.includes("mercury"))) {
      const mercRuled = housesRuledMap.get("Mercury") ?? [];
      const moonRuled = housesRuledMap.get("Moon") ?? [];
      items.push(
        `- **Sharp Perception & Plainspoken Circuit (${[mercury.planet, pluto.planet, moon.planet, jupiter && mercAspects.includes("jupiter") ? jupiter.planet : null].filter(Boolean).join("–")}):** Instinctive impressions in House ${moon.house}${moonRuled.length ? ` (ruling H${moonRuled.join(", H")})` : ""} feed straight into Mercury–Pluto in House ${mercury.house}${mercRuled.length ? ` (ruling H${mercRuled.join(", H")})` : ""}${jupiter && mercAspects.includes("jupiter") ? ` and Jupiter in House ${jupiter.house}` : ""}.`
      );
    }
  }

  if (sun && mars) {
    const sunLord = SIGN_CANON_RECORDS[sun.sign]?.domicileLord;
    const sunAspects = sun.activeAspects.map(stripOrbParen).join(" ").toLowerCase();
    if (sunLord === "Mars" && /(square|opposition)\s+mars/i.test(sunAspects)) {
      const sunRuled = housesRuledMap.get("Sun") ?? [];
      const marsRuled = housesRuledMap.get("Mars") ?? [];
      items.push(
        `- **Guest–Host Friction (${sun.planet} in ${sun.sign} H${sun.house} vs. ${mars.planet} in ${mars.sign} H${mars.house}):** Mars hosts Sun in ${sun.sign} while squaring/opposing it from H${mars.house}; Sun rules H${sunRuled.join(", H") || "-"} and Mars rules H${marsRuled.join(", H") || "-"}.`
      );
    }
  }

  if (asc && saturn && moon) {
    const chartRuler = SIGN_CANON_RECORDS[asc.sign]?.domicileLord;
    if (chartRuler === "Saturn" && moon.house === 7) {
      const satRuled = housesRuledMap.get("Saturn") ?? [];
      items.push(
        `- **Self-Reliance vs. Partnership Backbone (${asc.sign} Ascendant → ${saturn.planet} H${saturn.house} ↔ ${moon.planet} H${moon.house}):** Chart ruler Saturn governs H${satRuled.join(", H")} from H${saturn.house} opposite Moon in ${moon.sign} H${moon.house}.`
      );
    }
  }

  return items;
}

function elementOf(sign?: string): Element {
  const el = sign ? SIGN_CANON_RECORDS[sign]?.element : undefined;
  if (el === "Fire" || el === "Earth" || el === "Air" || el === "Water") return el;
  return "Earth";
}

function topicFocusFromQuestion(question: string): "love" | "money" | "career" | "family" | "friends" | "purpose" | "full" {
  const q = question.toLowerCase();
  if (/\b(love|relationship|partner|marriage|romantic|dating|husband|wife|heartbreak|sex|intimacy)\b/.test(q)) return "love";
  if (/\b(money|wealth|debt|finance|income|earn|salary|poverty|rich|spending)\b/.test(q)) return "money";
  if (/\b(career|job|work|business|reputation|boss|promotion|purpose|calling)\b/.test(q)) return "career";
  if (/\b(family|mother|father|parent|childhood|roots|home|children|kids)\b/.test(q)) return "family";
  if (/\b(friend|loyalty|betray|enemy|rivals|social|circle)\b/.test(q)) return "friends";
  if (/\b(future|next|timing|change|chapter|turning|meaning|faith|spiritual)\b/.test(q)) return "purpose";
  return "full";
}

function getPlacementCondition(dossier: ChartCanonDossier, body: string) {
  const pl = dossier.placements.find(p => p.body === body);
  const cond = pl?.dignityAndCondition;
  const hasDignity = (cond?.essentialDignities.length ?? 0) > 0;
  const hasDebility = (cond?.essentialDebilities ?? []).some(d => /Detriment|Fall/i.test(d));
  const isRetro = Boolean(cond?.accidentalCondition.toLowerCase().includes("retrograde"));
  const isCombust = cond?.solarCondition === "combust";
  const contraryToSect = Boolean(cond?.sectAlignment.toLowerCase().includes("contrary to sect"));
  return { pl, hasDignity, hasDebility, isRetro, isCombust, contraryToSect };
}

/**
 * Generates an intimate, candid, second-person narrative grounded silently in every
 * calculated layer of the chart—with short bold reader-specific section titles,
 * flowing paragraphs, zero bullet-point lists of traits, and zero astrology terms.
 */
export function buildDeepDeterministicMasterStory(
  chart: ChartResult,
  matrix: PlanetPersonaTrait[],
  synthesis: SynthesisResult,
  question: string,
  _mappings: CanonicalPlacementMapping[]
): {
  answer: string;
  overview: string;
  sections: Array<{ id: string; title: string; text: string; findingIds: string[] }>;
} {
  const dossier = retrieveChartCanonDossier(chart);
  const housesRuledMap = getHousesRuledByPlanet(chart);
  const placementByName = new Map<string, PlanetPersonaTrait>(matrix.map(p => [p.planet, p]));
  const dispositorByPlanet = new Map<string, DispositorChainNode>(
    (dossier.dispositorChains ?? []).map(d => [d.planet, d])
  );

  const getTrait = (name: string) =>
    matrix.find(
      p =>
        p.planet.toLowerCase() === name.toLowerCase() ||
        p.display.toLowerCase().includes(name.toLowerCase())
    );

  const asc = getTrait("Ascendant");
  const sun = getTrait("Sun");
  const moon = getTrait("Moon");
  const mercury = getTrait("Mercury");
  const venus = getTrait("Venus");
  const mars = getTrait("Mars");
  const jupiter = getTrait("Jupiter");
  const saturn = getTrait("Saturn");
  const pluto = getTrait("Pluto");

  const sunRow = chart.movingBodies.find(b => b.name === "Sun");
  const isDayChart = sunRow ? sunRow.house >= 7 && sunRow.house <= 12 : true;

  const ascEl = elementOf(asc?.sign);
  const sunEl = elementOf(sun?.sign);
  const moonEl = elementOf(moon?.sign);
  const mercEl = elementOf(mercury?.sign);
  const venusEl = elementOf(venus?.sign);
  const marsEl = elementOf(mars?.sign);

  const ascContacts = asc ? parseAspectContacts(asc, placementByName, housesRuledMap) : [];
  const sunContacts = sun ? parseAspectContacts(sun, placementByName, housesRuledMap) : [];
  const moonContacts = moon ? parseAspectContacts(moon, placementByName, housesRuledMap) : [];
  const mercContacts = mercury ? parseAspectContacts(mercury, placementByName, housesRuledMap) : [];
  const venusContacts = venus ? parseAspectContacts(venus, placementByName, housesRuledMap) : [];
  const marsContacts = mars ? parseAspectContacts(mars, placementByName, housesRuledMap) : [];
  const saturnContacts = saturn ? parseAspectContacts(saturn, placementByName, housesRuledMap) : [];

  const moonCond = getPlacementCondition(dossier, "Moon");
  const venusCond = getPlacementCondition(dossier, "Venus");
  const marsCond = getPlacementCondition(dossier, "Mars");
  const mercCond = getPlacementCondition(dossier, "Mercury");
  const saturnCond = getPlacementCondition(dossier, "Saturn");

  const chartRulerName = asc ? SIGN_CANON_RECORDS[asc.sign]?.domicileLord : undefined;
  const chartRulerTrait = chartRulerName ? getTrait(chartRulerName) : undefined;
  const chartRulerHouse = chartRulerTrait?.house ?? 1;

  const moonIn7Or4 = moon?.house === 7 || moon?.house === 4;
  const strongGuardedSelf =
    ascEl === "Earth" ||
    chartRulerName === "Saturn" ||
    ascContacts.some(c => c.otherName === "Saturn") ||
    saturn?.house === 1 ||
    saturn?.house === 10;

  const mercJoinedPluto = mercContacts.some(c => c.otherName === "Pluto" && c.aspect === "conjunction");
  const mercLinkedMoon =
    mercContacts.some(c => c.otherName === "Moon") ||
    moonContacts.some(c => c.otherName === "Mercury");
  const sunSquaresMars = sunContacts.some(
    c => c.otherName === "Mars" && ["square", "opposition"].includes(c.aspect)
  );
  const guestHostTension = Array.from(dispositorByPlanet.values()).some(d => {
    const guest = placementByName.get(d.planet);
    if (!guest) return false;
    const contacts = parseAspectContacts(guest, placementByName, housesRuledMap);
    return contacts.some(c => c.otherName === d.domicileLord && ["square", "opposition"].includes(c.aspect));
  });

  const sectionsList: Array<{ id: string; title: string; text: string; findingIds: string[] }> = [];

  // SECTION 1: Lead with the strongest core pattern
  const coreTitle = strongGuardedSelf
    ? "Deciding alone before anyone hears you needed help"
    : sunEl === "Fire" || ascEl === "Fire"
      ? "Moving first and expecting the room to catch up"
      : ascEl === "Air"
        ? "Reading the whole table before putting your cards down"
        : "Taking the temperature quietly and remembering everything";

  const coreParagraphs: string[] = [];

  if (strongGuardedSelf) {
    coreParagraphs.push(
      `By the time you admit to anyone that a situation has gotten heavy, you have usually already figured out how to carry it yourself. People read your composure first—steady voice, dry timing, nothing wasted—and assume you do not feel the pressure the way they do. Inside, you watch every promise closely against follow-through, because growing up or learning early taught you that leaning on someone who drops the rope costs twice as much as handling it on your own.`
    );
  } else if (ascEl === "Fire") {
    coreParagraphs.push(
      `When something matters to you, you move before the committee finishes talking. People feel your conviction right away—often before you have explained every step behind it—which earns respect when a room is stalled and friction when slower personalities feel pushed aside. What looks like sheer nerve on the outside is usually how you protect yourself from stalling out in someone else's hesitation.`
    );
  } else if (ascEl === "Air") {
    coreParagraphs.push(
      `You rarely walk into a situation blind; you map out who wants what, where the weak logic sits, and which exits stay open before you commit yourself. Others rely on you to stay fair and clear-headed when the mood turns noisy, though they do not always realize how much emotional weight you keep behind polite conversation while deciding whether it is worth speaking up.`
    );
  } else {
    coreParagraphs.push(
      `You take in far more of a room's undercurrent than you show on your face. Before you speak, you already know who is posturing, who is nervous, and where an agreement is going to crack—a quiet radar that keeps you out of clumsy traps, yet also makes small talk feel exhausting when you can hear what nobody is saying out loud.`
    );
  }

  if (moonIn7Or4 || moonCond.hasDignity) {
    coreParagraphs.push(
      `That self-containment has a real counterpart underneath: steady loyalty matters deeply to you, and life never feels whole when you are entirely unattached. When trust is real, you show up quietly—fixing what broke, remembering what mattered to someone weeks ago, holding your ground beside them—yet pride often stops you from saying plainly when you want that same steadiness returned. ${chartRulerHouse === 12 ? "A lot of your heaviest processing happens behind closed doors before anyone else sees a crack in the surface." : "What you protect is never just privacy; it is the right not to be let down after opening the door."}`
    );
  } else {
    coreParagraphs.push(
      `Even so, living on pure self-reliance comes with a hidden bill. You notice immediately when someone's effort stops matching their words, and rather than arguing for basic respect, you quietly move them from your inner circle to polite acquaintance. Most people never see the moment you made that cut; they only notice later that the warmth never came back.`
    );
  }

  sectionsList.push({
    id: "core-identity-posture",
    title: coreTitle,
    text: coreParagraphs.join("\n\n"),
    findingIds: ["core-identity", "ascendant", "sun"],
  });

  // SECTION 2: Natural gifts, quiet pleasures, and how your mind works
  const giftsTitle = mercJoinedPluto
    ? "The instinct to spot what others gloss over"
    : mercEl === "Earth" || sunEl === "Earth"
      ? "Turning messy problems into working structure"
      : mercEl === "Air"
        ? "Seeing the pattern two moves ahead"
        : "Reading motives faster than people explain them";

  const giftsParagraphs: string[] = [];

  if (mercJoinedPluto || mercEl === "Water") {
    giftsParagraphs.push(
      `Your sharpest natural gift is an unfiltered eye for what is actually going on beneath polite framing. Whether someone is pitching a deal, hiding resentment, or glossing over a flaw in a plan, your mind locks straight onto the missing piece without needing anyone to draw you a map. Friends and coworkers come to you when they want the truth without sugarcoating—not because you enjoy tearing things down, but because you genuinely cannot pretend a cracked foundation is solid.`
    );
  } else if (mercEl === "Earth") {
    giftsParagraphs.push(
      `While other people get tangled in grand theories or anxious guesswork, you naturally sort out what actually works. Give you a cluttered budget, a stalled project, or a tangled schedule and you take quiet satisfaction in trimming away waste until the whole thing runs cleanly. Others depend on that steady competence more than they always say out loud.`
    );
  } else if (mercEl === "Air") {
    giftsParagraphs.push(
      `Ideas connect quickly for you—you hear half an argument and already see the counterargument, the joke inside it, and the practical way to bridge two stubborn people at the same table. Writing, teaching, negotiating, or untangling complex systems comes to you with real ease, often just for the pleasure of getting the wording or mechanics right.`
    );
  } else {
    giftsParagraphs.push(
      `You think best when there is skin in the game—when a decision leads to action rather than endless circular discussion. People lean on your candor when a group gets bogged down in politeness, because you are willing to say what everyone else is tiptoeing around and put momentum back into the room.`
    );
  }

  // Concrete hobbies & everyday enjoyment woven as prose (no bullets!)
  const hobbiesProse: string[] = [];
  if (mercJoinedPluto || mercEl === "Water") {
    hobbiesProse.push("deep-dive research, investigative reading, strategy, debate, or tearing into how people and systems really tick");
  } else if (mercEl === "Earth") {
    hobbiesProse.push("building or fixing things with your own hands, systems design, finance tracking, or methodical craft");
  } else if (mercEl === "Air") {
    hobbiesProse.push("writing, language, sharp conversation, puzzles, and fast-moving exchanges of ideas");
  } else {
    hobbiesProse.push("direct storytelling, competitive games, pitching bold ideas, and hands-on experiments");
  }

  if (venusEl === "Water" || venusEl === "Earth") {
    hobbiesProse.push("music with real weight to it, cooking good food for a few trusted people, or tactile crafts where you can feel the quality");
  } else {
    hobbiesProse.push("curating aesthetics, lively cultural spaces, and design that feels fresh rather than stiff");
  }

  if (marsEl === "Air" || marsEl === "Fire" || mars?.house === 1 || mars?.house === 2 || mars?.house === 5) {
    hobbiesProse.push("physical conditioning, solo endurance challenges, or competitive work where your own effort decides the score");
  }

  giftsParagraphs.push(
    `When nobody is grading you, you gravitate toward ${hobbiesProse.join("; ")}. These are not surface pastimes for you—they are how you discharge nervous tension and stay sharp on your own terms. Yet the same perceptive edge has a cost in ordinary arguments: ${mercJoinedPluto || mercLinkedMoon ? "once you feel cornered or lied to, your questions turn surgical fast, and you can back someone into a wall before they realize a small disagreement just became a trial." : "when people move too slowly or miss obvious steps, impatience can sound sharper than you intended, shutting down people who were genuinely trying to meet you halfway."}`
  );

  sectionsList.push({
    id: "natural-gifts-and-mind",
    title: giftsTitle,
    text: giftsParagraphs.join("\n\n"),
    findingIds: ["mercury", "natural-gifts"],
  });

  // SECTION 3: Family, childhood roots & what you learned early
  const familyTitle =
    chartRulerName === "Saturn" || saturn?.house === 4 || moon?.house === 4
      ? "Learning to grow up before anyone asked if you were ready"
      : "How early home life set your rules for trust";

  const familyParagraphs: string[] = [];
  familyParagraphs.push(
    moonCond.hasDignity
      ? `Home left you with strong instincts for care and duty, alongside an early habit of watching adult moods carefully to keep things stable. You likely knew far younger than your peers when money was tight, when patience was thin, or when somebody had to stay steady so the house did not rattle apart. That built real backbone early on—along with a quiet reluctance to burden anyone else with your own rough days.`
      : `In the household you came up in, warmth and tension rarely stayed neatly separated. You learned early how to read shifts in tone from down the hallway, how to handle your own schoolwork or problems without creating extra noise, and how quickly approval could depend on being capable rather than needy.`
  );
  familyParagraphs.push(
    `In school and early years, mindless repetition bored you flat, while subjects or teachers that respected your intelligence pulled your full focus right away. That same script carries straight into adulthood: you still bristle when someone tries to manage you with empty rules, and you still measure family loyalty by who shows up quietly when things get inconvenient rather than who says the nicest words on holidays.`
  );

  sectionsList.push({
    id: "family-childhood-roots",
    title: familyTitle,
    text: familyParagraphs.join("\n\n"),
    findingIds: ["family-home", "moon"],
  });

  // SECTION 4: Friendships, loyalty & quiet rivalry
  const friendsTitle =
    sun?.house === 11 || mars?.house === 11
      ? "High loyalty, zero patience for half-hearted allies"
      : "Choosing a small table and keeping score silently";

  const friendsParagraphs: string[] = [];
  friendsParagraphs.push(
    `You do not collect casual acquaintances just to fill a weekend. You respect people who do what they say, handle their own weight, and can take an honest answer without sulking. Around the right circle, you are fiercely protective—the friend who remembers details nobody else caught, gives straight counsel when everyone else flatters, and stays steady in a real crisis.`
  );
  friendsParagraphs.push(
    `Where friendships sour—or quiet rivalry creeps in—is rarely over small misunderstandings. You draw strong, opinionated people, and occasionally run into someone who smiles to your face while resenting your bluntness or measuring their standing against yours. Your own part in broken ties is subtler: instead of calling out one uneven favor or broken promise in the moment, you file it away, keep watching, and shut the door cleanly after the third strike—often leaving the other person confused why you turned cold overnight.`
  );

  sectionsList.push({
    id: "friends-loyalty-rivalry",
    title: friendsTitle,
    text: friendsParagraphs.join("\n\n"),
    findingIds: ["friends-rivals"],
  });

  // SECTION 5: Love, intimacy & what happens when closeness gets tested
  const loveTitle = venusCond.hasDebility
    ? "Wanting deep devotion while testing the door"
    : venusContacts.some(c => ["square", "opposition"].includes(c.aspect))
      ? "Hunger for closeness, allergic to control"
      : "Showing love through steadiness, struggling to ask softly";

  const loveParagraphs: string[] = [];
  if (venusEl === "Water" || venusEl === "Earth" || moonIn7Or4) {
    loveParagraphs.push(
      `In love, half-measures bore or unsettle you. You notice loyalty in small concrete actions—whether someone follows through when they are tired, tells the unvarnished truth about money and plans, and stands beside you without playing coy games. When you care, you invest deeply and expect the same seriousness in return, not casual flakiness dressed up as charm.`
    );
  } else {
    loveParagraphs.push(
      `Attraction hits you through honesty, mental spark, and someone who has a spine of their own. You cannot respect a partner who agrees with everything just to keep peace, yet you also pull back fast the moment closeness starts feeling like surveillance or possessiveness.`
    );
  }

  loveParagraphs.push(
    `${venusCond.hasDebility || moonIn7Or4 ? "The hardest pattern in intimate relationships is the silent test." : "The friction in love usually shows up right when comfort meets pride."} You want someone strong enough to catch you when you are worn thin, yet asking softly for reassurance or help feels unnatural—almost like handing someone leverage they might misuse later. So when hurt, you go quiet, turn brisk, or handle everything solo until your partner feels locked out on the wrong side of glass. Relationships last for you when expectations around honesty, effort, and shared weight are said out loud before resentment hardens into distance.`
  );

  sectionsList.push({
    id: "love-intimacy-partnerships",
    title: loveTitle,
    text: loveParagraphs.join("\n\n"),
    findingIds: ["venus", "relationships"],
  });

  // SECTION 6: Work, money, ownership & shared stakes
  const moneyWorkTitle =
    sunSquaresMars || guestHostTension
      ? "Calling your own shots without turning shared stakes into a fight"
      : "Building something with your own name on it";

  const moneyWorkParagraphs: string[] = [];
  if (sunSquaresMars || guestHostTension || mars?.house === 2 || mars?.house === 8) {
    moneyWorkParagraphs.push(
      `Money is never neutral for you; it is freedom from being told how to move. You work hardest when you own the outcome directly or at least have clean authority over how the job gets done, and nothing irritates you faster than weak leadership taking credit or wasting your time. ${marsCond.contraryToSect ? "Under financial pressure, impatience can tempt you into forcing a deal early or snapping back harder than a workplace dispute actually warrants." : "Early on, finances often teach you the hard way never to leave shared expenses, verbal promises, or split profits vague."}`
    );
  } else {
    moneyWorkParagraphs.push(
      `Your best work happens where competence matters more than office theater. You gain ground steadily when you build tangible skill, put clear agreements in writing, and focus on durable craft over flashy shortcuts. Others rely on you to hold the standard when a project gets chaotic, though taking on everybody else's dropped tasks can quietly drain your energy if you never push back.`
    );
  }

  moneyWorkParagraphs.push(
    `Where work and ambition collide with daily strain is in the belief that resting means falling behind. You can run on pure willpower long past the point your body starts asking for slower nights and steadier routines, then wonder why irritability spikes over small errands. Lasting prosperity here comes when you separate proving yourself from overworking, keep contracts clean on paper, and put your name squarely on what you build.`
  );

  sectionsList.push({
    id: "work-money-pressure",
    title: moneyWorkTitle,
    text: moneyWorkParagraphs.join("\n\n"),
    findingIds: ["mars", "saturn", "work-purpose", "resources-wealth"],
  });

  // SECTION 7: Turning points, inner convictions & where this goes next
  const activeSeasonTitle = synthesis.timingOverview?.turningPoints?.length
    ? "What this chapter is asking you to stop carrying alone"
    : "Growing into steadier authority without the armor";

  const closingParagraphs: string[] = [];
  const hasActiveTiming =
    matrix.some(p => p.activeDashaRole.includes("Lord")) ||
    Boolean(dossier.westernTimingActivations?.length) ||
    Boolean(synthesis.timingOverview?.turningPoints?.length);

  if (hasActiveTiming) {
    closingParagraphs.push(
      `In this current season of your life, old arrangements that ran on silent over-functioning are losing patience with themselves. Conversations about work ownership, financial clarity, and where your real loyalty goes are moving from background irritation into clear choices—rewarding plain honesty over keeping tight-lipped peace just to avoid an awkward afternoon.`
    );
  } else {
    closingParagraphs.push(
      `Over time, the noise around proving yourself drops away and leaves clearer priorities: meaningful work you can stand behind, fewer relationships built on guesswork, and daily convictions tested by real life rather than borrowed slogans.`
    );
  }

  // Unique chart-specific ending sentence (rule: "End with a sentence that belongs to this reader and this chart.")
  const specificEnding = strongGuardedSelf && moonIn7Or4
    ? `You do not lose your footing by letting someone share the weight once in a while; you only lose it when you wait until the breaking point to admit you needed them beside you.`
    : mercJoinedPluto
      ? `The same sharp eye that keeps you from being fooled is meant to build real trust with the few people brave enough to meet you without masks.`
      : sunSquaresMars
        ? `Your real strength arrives the day your ambition and your independence stop fighting over the same steering wheel.`
        : `Nothing in your life asks you to shrink what comes naturally—only to say out loud what you actually want before deciding nobody else will stay for it.`;

  closingParagraphs.push(specificEnding);

  sectionsList.push({
    id: "integrated-trajectory",
    title: activeSeasonTitle,
    text: closingParagraphs.join("\n\n"),
    findingIds: ["synthesis-complete", "tensions", "transits"],
  });

  // Order lead section dynamically when a focused topic is requested
  const focus = topicFocusFromQuestion(question);
  const priorityMap: Record<string, string> = {
    love: "love-intimacy-partnerships",
    money: "work-money-pressure",
    career: "work-money-pressure",
    family: "family-childhood-roots",
    friends: "friends-loyalty-rivalry",
    purpose: "integrated-trajectory",
  };
  const targetId = priorityMap[focus];
  if (targetId) {
    const idx = sectionsList.findIndex(s => s.id === targetId);
    if (idx > 0) {
      const [picked] = sectionsList.splice(idx, 1);
      sectionsList.unshift(picked);
    }
  }

  const overview =
    sectionsList[0]?.text.split("\n\n")[0]?.trim() ||
    "You read situations quickly, carry more responsibility than people realize, and earn real peace only when independence and honest trust stop pulling in opposite directions.";

  const answer = sectionsList
    .map(s => `**${s.title}**\n\n${s.text}`)
    .join("\n\n");

  return { answer, overview, sections: sectionsList };
}
