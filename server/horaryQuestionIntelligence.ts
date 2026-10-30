export type HouseReference = {
  id: string;
  label: string;
  role: "querent" | "person" | "matter" | "supporting";
  house: number;
  ruler: string;
  radicalHouse: number;
  relativeHouse?: number;
  derivedFrom?: string;
  relationship?: string;
  wording: string;
  reasoning: string;
};

export type HoraryHouseSelection = {
  status: "resolved" | "clarification_needed";
  assignments: HouseReference[];
  primaryPersonId: string;
  primaryMatterId: string;
  significators: Array<{ planet: string; roles: string[] }>;
  questionIntent: {
    fullQuestion: string;
    querent: "person asking the question";
    people: Array<{ label: string; relationship?: string; house: number; wording: string }>;
    objects: string[];
    events: string[];
    action: string;
    desiredOutcome: string;
  };
  clarificationQuestion?: string;
};

type HouseInput = Array<{ house: number; ruler: string }>;
type Override = { subjectHouse?: number; topicHouse?: number; enabled?: boolean };

const RELATIONSHIPS = [
  { id: "child", label: "child", terms: "child|children|son|daughter|kid", house: 5, reason: "A querent’s child is assigned to the 5th house." },
  { id: "sibling", label: "sibling", terms: "sibling|siblings|brother|sister", house: 3, reason: "A querent’s sibling is assigned to the 3rd house." },
  { id: "mother", label: "mother", terms: "mother|mum|mom", house: 4, reason: "The mother is assigned to the 4th house in this rule set." },
  { id: "father", label: "father", terms: "father|dad", house: 10, reason: "The father is assigned to the 10th house in this rule set." },
  { id: "parent", label: "parent", terms: "parent|parents", house: 4, reason: "A parent without a specified parental role is assigned to the 4th house; clarify if the distinction changes the judgment." },
  { id: "partner", label: "partner", terms: "partner|spouse|husband|wife|boyfriend|girlfriend|fiancé|fiance|ex", house: 7, reason: "A spouse, romantic partner, or counterpart is assigned to the 7th house." },
  { id: "friend", label: "friend", terms: "friend|friends", house: 11, reason: "A friend is assigned to the 11th house." },
  { id: "boss", label: "boss or employer", terms: "boss|manager|employer", house: 10, reason: "A boss or employer is assigned to the 10th house as an authority figure." },
  { id: "employee", label: "employee or staff member", terms: "employee|staff member|worker|assistant", house: 6, reason: "An employee or service worker is assigned to the 6th house." },
  { id: "colleague", label: "colleague", terms: "colleague|coworker|co-worker|teammate", house: 6, reason: "A colleague is assigned to the 6th house for workplace relations; the 10th describes authority or career outcome." },
  { id: "neighbor", label: "neighbor", terms: "neighbor|neighbour", house: 3, reason: "A neighbor is assigned to the 3rd house." },
  { id: "lawyer", label: "lawyer or attorney", terms: "lawyer|attorney|solicitor", house: 9, reason: "A lawyer or legal adviser is assigned to the 9th house." },
] as const;

type MatterRule = { id: string; label: string; house: number; role: "matter" | "supporting"; pattern: RegExp; reason: string };
const MATTER_RULES: MatterRule[] = [
  { id: "relationship", label: "relationship or counterpart", house: 7, role: "matter", pattern: /\b(relationship|marriage|marry|dating|date|reconcile|reconciliation|break ?up|separate|divorce|commitment|romance|love life)\b/i, reason: "Partnership and open dealings are judged from the 7th house." },
  { id: "career", label: "career, job, or public outcome", house: 10, role: "matter", pattern: /\b(job offer|new job|career|promotion|interview|employment|profession|business deal|boss|employer|resign|quit my job|hire me|hire|hired|hiring|work opportunity|public reputation|career path)\b/i, reason: "Career, authority, and public outcomes are judged from the 10th house." },
  { id: "health", label: "health and recovery", house: 6, role: "matter", pattern: /\b(health|illness|sick|surgery|treatment|recovery|symptom|diagnosis|medical|wellbeing|well-being|recover from (?:illness|surgery|treatment|disease|injury))\b/i, reason: "Illness, treatment, and everyday bodily service are assigned to the 6th house; the querent’s body remains signified by the 1st." },
  { id: "money", label: "personal money or possessions", house: 2, role: "matter", pattern: /\b(money|income|salary|wage|earnings|savings|profit|investment|funds|possessions|belongings|valuable|missing (?:item|object|keys|wallet|phone|ring|[a-z]+)|lost (?:item|object|keys|wallet|phone|ring|[a-z]+)|find (?:my|the) (?:keys|wallet|phone|ring|item|object|[a-z]+))\b/i, reason: "The querent’s movable possessions and personal resources are assigned to the 2nd house." },
  { id: "shared_money", label: "debt, loan, or another party’s money", house: 8, role: "matter", pattern: /\b(debt|loan|owe|owed|inheritance|tax|shared money|their money|partner's money|partner’s money|refund|insurance payout)\b/i, reason: "Debt, obligations, inheritances, and money belonging to another party are assigned to the 8th house." },
  { id: "property", label: "home, land, or immovable property", house: 4, role: "matter", pattern: /\b(home|house|property|land|real estate|apartment|flat|move house|relocat(?:e|ion)|buy (?:a )?house|sell (?:my |the )?(?:house|property)|rent (?:a |the )?(?:home|house|apartment|flat))\b/i, reason: "A home, land, and immovable property are assigned to the 4th house; the 10th can describe the transaction’s public or professional outcome." },
  { id: "children", label: "children or pregnancy", house: 5, role: "matter", pattern: /\b(pregnan(?:t|cy)|conceiv(?:e|ing)|child|children|son|daughter|fertility)\b/i, reason: "Children, pregnancy, and conception are assigned to the 5th house." },
  { id: "short_travel", label: "short journey or local transport", house: 3, role: "matter", pattern: /\b(short trip|commute|local travel|nearby trip|car journey|train to|bus to|neighboring city)\b/i, reason: "Short journeys, local movement, and transport are assigned to the 3rd house." },
  { id: "travel_study", label: "long-distance travel, higher study, or visa", house: 9, role: "matter", pattern: /\b(travel|trip|flight|overseas|abroad|visa|immigration|university|college|higher education|study abroad|publish|publishing|court|lawsuit|legal case|trial|judge|appeal)\b/i, reason: "Long journeys, foreign matters, higher study, and legal judgment are assigned to the 9th house; an opposing litigant is separately assigned to the 7th and the decision may involve the 10th." },
  { id: "legal_opponent", label: "opposing party in a legal dispute", house: 7, role: "supporting", pattern: /\b(sue|sued|lawsuit|legal case|court case|litigation|opponent|opposing party|defendant|plaintiff)\b/i, reason: "The opposing party in litigation is assigned to the 7th house, separately from the 9th-house law/court matter and 10th-house decision." },
  { id: "legal_outcome", label: "decision or public ruling", house: 10, role: "supporting", pattern: /\b(sue|sued|lawsuit|legal case|court case|litigation|verdict|ruling|judge|appeal)\b/i, reason: "A public decision or ruling is assigned to the 10th house; it is read alongside the 9th-house legal matter and 7th-house opponent." },
  { id: "friends", label: "friendship, group, or support", house: 11, role: "matter", pattern: /\b(friendship|friend group|team|community|support network|wish|hope)\b/i, reason: "Friends, allies, groups, and hopes are assigned to the 11th house." },
  { id: "hidden", label: "hidden matter or confinement", house: 12, role: "matter", pattern: /\b(hidden|secret|confinement|hospitalization|imprison|isolation|unknown enemy)\b/i, reason: "Confinement, hidden constraints, and matters kept out of view are assigned to the 12th house." },
];

function norm(s: string) { return s.toLocaleLowerCase(); }
function exactMatch(text: string, pattern: RegExp) { return text.match(pattern); }
function turnHouse(from: number, relative: number) { return ((from - 1 + relative - 1) % 12) + 1; }
function ruling(houses: HouseInput, house: number) { return houses.find(row => row.house === house)?.ruler ?? ""; }
function cleanQuote(match: RegExpMatchArray) { return match[0].replace(/\s+/g, " ").trim(); }
function buildQuestionIntent(question: string, assignments: HouseReference[]) {
  const actionWords = "buy|sell|rent|move|relocate|travel|study|recover|improve|find|lose|return|receive|earn|get|accept|offer|hire|promote|marry|date|reconcile|separate|divorce|sue|win|lose|call|meet|succeed|work|conceive|conceive|treat|heal|pay|repay|lend|borrow|invest|choose|change|leave|stay";
  const action = question.match(new RegExp(`\\b(${actionWords})(?:ing|ed|s)?\\b`, "i"))?.[0] ?? "understand the matter described";
  const matters = assignments.filter(row => row.role === "matter" || row.role === "supporting");
  return {
    fullQuestion: question,
    querent: "person asking the question" as const,
    people: assignments.filter(row => row.role === "person").map(row => ({ label: row.label, ...(row.relationship ? { relationship: row.relationship } : {}), house: row.house, wording: row.wording })),
    objects: matters.map(row => row.wording),
    events: matters.map(row => row.label),
    action,
    desiredOutcome: question.replace(/[?!.]+$/, "").trim(),
  };
}

/** Deterministic doctrine map. It records the wording and the derivation for every selected house. */
export function resolveHoraryQuestion(question: string, houses: HouseInput, override: Override = {}): HoraryHouseSelection {
  const text = question.trim();
  const lower = norm(text);
  const assignments: HouseReference[] = [];
  const add = (row: Omit<HouseReference, "ruler">) => {
    if (!assignments.some(existing => existing.id === row.id && existing.house === row.house)) assignments.push({ ...row, ruler: ruling(houses, row.house) });
  };

  add({ id: "querent", label: "Querent", role: "querent", house: 1, radicalHouse: 1, wording: text, reasoning: "The person asking the horary question is assigned to radical House 1." });

  const personPhrases: Array<{ label: string; relation: string; base: number; wording: string; reason: string }> = [];
  // Resolve explicit kinship chains from the querent outward, e.g. "my sister's child".
  const chain = lower.match(/\bmy\s+(mother|mum|mom|father|dad|parent|parents|sibling|brother|sister|child|children|son|daughter|kid|partner|spouse|husband|wife|boyfriend|girlfriend|friend|boss|manager|colleague|coworker|co-worker)(?:'s|’s)\s+(child|children|son|daughter|sibling|brother|sister|partner|spouse|husband|wife|friend|boss|job|health|money|home|career)\b/i);
  if (chain) {
    const first = RELATIONSHIPS.find(rule => new RegExp(`^(?:${rule.terms})$`, "i").test(chain[1]));
    if (first) {
      const house = first.house;
      const quote = cleanQuote(chain);
      personPhrases.push({ label: `the ${chain[1]}`, relation: first.id, base: house, wording: `my ${chain[1]}`, reason: first.reason });
      const secondRule = RELATIONSHIPS.find(rule => new RegExp(`^(?:${rule.terms})$`, "i").test(chain[2]));
      if (secondRule) {
        const derivedHouse = turnHouse(house, secondRule.house);
        add({ id: `person:${secondRule.id}:turned`, label: `the ${chain[2]} of the ${chain[1]}`, role: "person", house: derivedHouse, radicalHouse: house, relativeHouse: secondRule.house, derivedFrom: first.id, relationship: secondRule.id, wording: quote, reasoning: `This is a relationship chain: first assign the ${chain[1]} to radical House ${house}; then count ${secondRule.label} as House ${secondRule.house} from that person, giving radical House ${derivedHouse}. ${secondRule.reason}` });
      }
    }
  }

  for (const rule of RELATIONSHIPS) {
    const regex = new RegExp(`\\b(?:my|our)\\s+(?:${rule.terms})\\b`, "i");
    const match = exactMatch(text, regex);
    if (match) {
      const already = assignments.some(row => row.relationship === rule.id && row.house === rule.house);
      if (!already) add({ id: `person:${rule.id}`, label: `the ${rule.label}`, role: "person", house: rule.house, radicalHouse: rule.house, relationship: rule.id, wording: cleanQuote(match), reasoning: rule.reason });
    }
  }
  if (/\b(?:my|our)\s+(?:mother|mum|mom|father|dad)\b/i.test(text)) {
    for (let index = assignments.length - 1; index >= 0; index--) if (assignments[index].relationship === "parent") assignments.splice(index, 1);
  }

  const namedCounterpart = /\b(?:will|can|should|does|is|has)\s+([A-Z][a-z]{1,})\b/.exec(text);
  if (namedCounterpart && !["I", "We", "They", "He", "She", "It"].includes(namedCounterpart[1]) && !assignments.some(row => row.role === "person")) {
    add({ id: "person:named-counterpart", label: namedCounterpart[1], role: "person", house: 7, radicalHouse: 7, relationship: "named counterpart", wording: namedCounterpart[1], reasoning: "A named counterpart directly addressed as the other party is assigned to the 7th house unless the question supplies a more specific relationship." });
  }

  // Possessive people without a relationship cue are genuinely underdetermined.
  const unidentifiedThey = /\b(they|them|their|he|him|his|she|her)\b/i.exec(text);
  const hasExplicitPerson = assignments.some(row => row.role === "person");
  const hasNamedOrNounPerson = /\b(my|our)\s+[A-Z][a-z]+\b/.test(text);
  const asksAboutThirdParty = /\b(their|they|them|he|him|his|she|her)\b/i.test(text) && /\b(will|should|can|does|is|are|has|have)\b/i.test(text);
  const hasClarificationAnswer = /\[clarification:/i.test(text);
  const genericParent = /\b(?:my|our)\s+parents?\b/i.test(text);
  const namedParent = /\b(?:my|our)\s+(?:mother|mum|mom|father|dad)\b/i.test(text);
  const personCount = assignments.filter(row => row.role === "person").length;
  const clarificationQuestion = genericParent && !namedParent && !hasClarificationAnswer
    ? "Could you clarify: are you asking about your mother or your father?"
    : asksAboutThirdParty && !hasClarificationAnswer && (personCount === 0 || personCount > 1 || !hasNamedOrNounPerson && !hasExplicitPerson)
      ? personCount > 1 ? "Which person does “they” refer to in your question?" : "Who does “they” refer to in your question?"
      : undefined;
  if (clarificationQuestion) {
    return { status: "clarification_needed", assignments, primaryPersonId: "querent", primaryMatterId: "", significators: [], questionIntent: buildQuestionIntent(text, assignments), clarificationQuestion };
  }

  const found: Array<{ rule: MatterRule; match: RegExpMatchArray; targetHouse: number; fromHouse: number; relativeHouse: number }> = [];
  for (const rule of MATTER_RULES) {
    const match = exactMatch(text, rule.pattern);
    if (!match) continue;
    const person = assignments.find(row => row.role === "person");
    const querentOwnMatter = /\bmy\s+(?:job|career|health|money|salary|home|property|house|wallet|keys|phone|item|object)\b/i.test(text);
    const questionNamesOtherAsActor = hasExplicitPerson && /\b(?:will|can|should|does|is|has)\s+my\s+.{0,32}\b(?:mother|mum|mom|father|dad|parent|sibling|brother|sister|child|children|son|daughter|kid|partner|spouse|husband|wife|boyfriend|girlfriend|friend|boss|manager|employer|employee|colleague|coworker|co-worker)\b/i.test(text);
    const possessiveOtherMatter = /\b(?:their|his|her)\s+(?:job|career|health|money|salary|home|property|child|partner|boss|friend)\b/i.test(text);
    const fromPerson = Boolean(person && (possessiveOtherMatter || (questionNamesOtherAsActor && !querentOwnMatter)));
    const fromHouse = fromPerson && person ? person.house : 1;
    const targetHouse = fromHouse === 1 ? rule.house : turnHouse(fromHouse, rule.house);
    found.push({ rule, match, targetHouse, fromHouse, relativeHouse: rule.house });
  }

  // Expert house overrides are optional and apply only when explicitly enabled.
  if (override.enabled && Number.isInteger(override.subjectHouse) && override.subjectHouse! >= 1 && override.subjectHouse! <= 12) {
    const index = assignments.findIndex(row => row.role === "person");
    const row = { id: "person:expert-override", label: "Expert-selected person", role: "person" as const, house: override.subjectHouse!, radicalHouse: override.subjectHouse!, relationship: "expert override", wording: "Expert override", reasoning: "Optional advanced override supplied by the astrologer." };
    if (index >= 0) assignments[index] = { ...row, ruler: ruling(houses, row.house) }; else add(row);
    if (override.topicHouse === undefined) {
      found.splice(0, found.length, ...found.map(item => ({ ...item, fromHouse: override.subjectHouse!, targetHouse: turnHouse(override.subjectHouse!, item.relativeHouse) })));
    }
  }
  if (override.enabled && Number.isInteger(override.topicHouse) && override.topicHouse! >= 1 && override.topicHouse! <= 12) {
    const subjectHouse = assignments.find(row => row.role === "person")?.house ?? 1;
    const actualHouse = turnHouse(subjectHouse, override.topicHouse!);
    found.splice(0, found.length, { rule: { id: "expert-topic", label: "expert-selected matter", house: override.topicHouse!, role: "matter", pattern: /(?:)/, reason: "Optional advanced override supplied by the astrologer." }, match: ["Expert override"] as unknown as RegExpMatchArray, targetHouse: actualHouse, fromHouse: subjectHouse, relativeHouse: override.topicHouse! });
  }

  const uniqueFound: typeof found = [];
  for (const item of found) if (!uniqueFound.some(existing => existing.rule.id === item.rule.id && existing.targetHouse === item.targetHouse)) uniqueFound.push(item);
  for (const item of uniqueFound) {
    const personBased = item.fromHouse !== 1;
    add({ id: `matter:${item.rule.id}:${item.targetHouse}`, label: item.rule.label, role: item.rule.role, house: item.targetHouse, radicalHouse: item.fromHouse, relativeHouse: personBased ? item.relativeHouse : undefined, derivedFrom: personBased ? assignments.find(row => row.role === "person")?.id : undefined, wording: cleanQuote(item.match), reasoning: personBased ? `${item.rule.reason} Count House ${item.relativeHouse} from the identified person in radical House ${item.fromHouse}, yielding radical House ${item.targetHouse}.` : item.rule.reason });
  }

  // Self-related health/body questions include House 1 as a supporting significator.
  if (uniqueFound.some(item => item.rule.id === "health")) add({ id: "body:querent", label: "Querent’s body and constitution", role: "supporting", house: 1, radicalHouse: 1, wording: uniqueFound.find(item => item.rule.id === "health")!.match[0], reasoning: "The 1st house signifies the querent’s body and constitution; it is read alongside the 6th-house illness or treatment." });
  // Most explicit matter is primary; all other detected matters remain visible as supporting roles.
  const primary = assignments.find(row => row.role === "matter") ?? assignments.find(row => row.role === "supporting");
  if (!primary) {
    const generic = assignments.find(row => row.role === "person");
    if (generic) add({ id: "matter:person", label: "the person or relationship asked about", role: "matter", house: generic.house, radicalHouse: generic.house, relationship: generic.relationship, wording: generic.wording, reasoning: "No separate topic phrase was detected, so the identified person’s own condition is judged from their assigned house." });
    else add({ id: "matter:identity", label: "the querent’s condition or initiative", role: "matter", house: 1, radicalHouse: 1, wording: text, reasoning: "The question does not name a distinct external matter; begin with the querent’s condition in radical House 1." });
  }

  const primaryMatter = assignments.find(row => row.role === "matter") ?? assignments.find(row => row.role === "supporting")!;
  const primaryPerson = assignments.find(row => row.role === "person") ?? assignments[0];
  const planetRoles = new Map<string, string[]>();
  for (const row of assignments) {
    if (!row.ruler) continue;
    planetRoles.set(row.ruler, [...(planetRoles.get(row.ruler) ?? []), row.label]);
  }
  const moonRoles = planetRoles.get("Moon") ?? [];
  planetRoles.set("Moon", [...moonRoles, "natural co-significator of the question and unfolding circumstances"]);
  return {
    status: "resolved",
    assignments,
    primaryPersonId: primaryPerson.id,
    primaryMatterId: primaryMatter.id,
    significators: [...planetRoles.entries()].map(([planet, roles]) => ({ planet, roles })),
    questionIntent: buildQuestionIntent(text, assignments),
  };
}
