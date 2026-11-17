export interface RealWorldActorTranslation {
  coreTheme: string;
  strengthAndPower: string;
  humanChallenge: string;
  growthAction: string;
  conversationalProse: string;
}

export interface MinimalTraitForTranslation {
  planet: string;
  sign: string;
  house: number;
  houseArena: string;
  decanFlavor?: string;
  personaArchetype?: string;
}

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  Ascendant: "AC",
  Descendant: "DC",
  "North Node": "☊",
  NorthNode: "☊",
  "South Node": "☋",
  SouthNode: "☋",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDecanForProse(raw?: string): string {
  if (!raw) return "measured, self-possessed focus";
  const dashSplit = raw.split("—");
  if (dashSplit.length > 1) {
    return dashSplit[dashSplit.length - 1].trim();
  }
  const stripped = raw
    .replace(/^[a-z]+\s+flavor:\s*decan\s*\d+\s*(?:\([^)]*\))?\s*[—–-]?\s*/gi, "")
    .replace(/\bflavor:\s*/gi, "")
    .trim();
  return stripped || "measured, self-possessed focus";
}

/**
 * Translates technical matrix properties into clear, grounded "real-world people talk".
 * Calculations stay in the background; this delivers practical behavioral counsel.
 */
export function buildRealWorldTranslation(trait: MinimalTraitForTranslation): RealWorldActorTranslation {
  const name = trait.planet;
  const sign = trait.sign;
  const house = trait.house;
  const arena = (trait.houseArena || `House ${house}`).toLowerCase();
  const archetype = trait.personaArchetype || name;
  const decanNote = formatDecanForProse(trait.decanFlavor);

  let coreTheme = "";
  let strengthAndPower = "";
  let humanChallenge = "";
  let growthAction = "";
  let conversationalProse = "";

  switch (name) {
    case "Sun":
      coreTheme = `Your central life force, self-expression, and personal purpose operating in House ${house} (${arena}).`;
      strengthAndPower = `Self-authorship and visible follow-through when genuine conviction backs an effort.`;
      humanChallenge = `Treating delegation as loss of control or carrying excessive responsibility alone out of pride.`;
      growthAction = `Build where shared standards and verifiable accountability align rather than forcing outcomes single-handedly.`;
      conversationalProse = `In ${sign} inside your ${ordinal(house)} house, your sense of authority centers directly on ${arena}. Half-measures rarely hold your commitment: once you take ownership of an objective, you tie personal credibility to the outcome and absorb real pressure to protect it.`;
      break;

    case "Moon":
      coreTheme = `Your emotional sanctuary, instinctive gut radar, and what makes you feel secure, placed in House ${house}.`;
      strengthAndPower = `Fast, accurate emotional perception that tracks unspoken consistency, motive, and loyalty over time.`;
      humanChallenge = `Guarding privately when hurt, absorbing someone else's instability, or silently keeping score instead of stating expectations.`;
      growthAction = `State your emotional terms plainly early on and keep downtime protected so judgment stays clear.`;
      conversationalProse = `Moon in ${sign} in your ${ordinal(house)} house anchors emotional safety inside ${arena}. Your nervous system tracks whether someone's daily behavior matches what they promise, tightening defenses the moment reliability turns conditional.`;
      break;

    case "Ascendant":
      coreTheme = `Your outward posture, first impression, and how you naturally take command in new rooms and life transitions.`;
      strengthAndPower = `Measured self-command: ${sign} composure paired with ${decanNote} signals competence before you ever speak.`;
      humanChallenge = `Over-relying on self-sufficient armor even with trusted allies, teaching others to assume you never need backing.`;
      growthAction = `Maintain firm standards without requiring total self-containment in close alliances.`;
      conversationalProse = `Your Ascendant in ${sign} enters unfamiliar situations through ${decanNote}. Others immediately register composure, observation, and clear personal boundaries—a posture that commands respect early while risking emotional distance if kept permanently locked.`;
      break;

    case "Descendant":
      coreTheme = `The relational contract—what you look for, attract, and negotiate through one-on-one commitments in House 7.`;
      strengthAndPower = `Capacity for deep reciprocity and reading whether someone has real staying power when pressure hits.`;
      humanChallenge = `Either testing partners too harshly before trusting them, or attracting people who mirror what you hesitate to express yourself.`;
      growthAction = `Choose partners who match your reliability in plain daylight and treat agreements as mutual commitments between equals.`;
      conversationalProse = `Anchoring your 7th House in ${sign}, your Descendant shows what you require when commitment gets serious. Surface charm fades quickly for you; you notice whether someone keeps their word when it is inconvenient. Healthy partnership here depends on letting mutual vulnerability coexist with firm boundaries.`;
      break;

    case "North Node":
    case "NorthNode":
      coreTheme = `Your active growth frontier—the unfamiliar edge of life where deliberate courage expands your range.`;
      strengthAndPower = `Breakthrough momentum. Leaning into ${sign} qualities in House ${house} pushes you past repetitive stalemates.`;
      humanChallenge = `Hesitating because this arena feels less automatic than your ingrained comfort habits.`;
      growthAction = `Choose concrete visibility and direct initiative in House ${house} matters even when the script feels new.`;
      conversationalProse = `Your North Node in ${sign} in your ${ordinal(house)} house marks where growth requires deliberate initiative rather than autopilot comfort. Rooted in ${arena}, real progress comes when you take an active stance instead of negotiating yourself out of the risk.`;
      break;

    case "South Node":
    case "SouthNode":
      coreTheme = `Your ingrained default habits—abilities you have mastered so thoroughly that they can become an unconscious fallback.`;
      strengthAndPower = `Natural fluency and poise in ${sign} and House ${house} matters without needing heavy rehearsal.`;
      humanChallenge = `Retreating into excessive smoothing, detachment, or over-familiar routines when direct action is actually needed.`;
      growthAction = `Keep the tactical judgment here as a foundation, while refusing to hide inside familiar compromises.`;
      conversationalProse = `Your South Node in ${sign} in your ${ordinal(house)} house describes what feels effortless to you under pressure. Those instincts work well as supporting skill, yet over-relying on them keeps you looping inside safe habits instead of stepping into fresher responsibility.`;
      break;

    case "Mercury":
      coreTheme = `Your thinking style, speech, decision filter, and investigative focus in House ${house}.`;
      strengthAndPower = `Clear, probing judgment that spots contradictions, unspoken agendas, and weak reasoning immediately.`;
      humanChallenge = `Harsh skepticism, over-analyzing motives, or cutting off dialogue too abruptly when someone hedges.`;
      growthAction = `Pair your investigative precision with transparent questions so others hear clarity rather than cross-examination.`;
      conversationalProse = `Mercury in ${sign} in your ${ordinal(house)} house makes your mind naturally investigative: you listen past polite framing to test whether the facts hold up. In ${arena}, your words carry weight because you would rather deliver an uncomfortable truth cleanly than participate in vague diplomacy.`;
      break;

    case "Venus":
      coreTheme = `Your values, relational loyalty, aesthetic standards, and how you handle trust and shared resources in House ${house}.`;
      strengthAndPower = `Deep devotion, discernment, and refusal to counterfeit affection or compromise core values.`;
      humanChallenge = `All-or-nothing relational testing, guarding your heart tightly until full proof arrives, or holding quiet resentment when effort feels unequal.`;
      growthAction = `Invest where loyalty is actively reciprocated, and address small imbalances early before quiet detachment sets in.`;
      conversationalProse = `Venus in ${sign} in your ${ordinal(house)} house refuses shallow attraction or cheap compromise. Whether in love, money, or creative alliances, you bond deeply where substance is real and disengage decisively when respect or reciprocity breaks down.`;
      break;

    case "Mars":
      coreTheme = `Your drive, conflict style, execution strategy, and how you defend boundaries in House ${house}.`;
      strengthAndPower = `Persistent strategic grit, independent nerve, and willingness to tackle friction directly.`;
      humanChallenge = `Impatience with inefficiency, sudden sharp pushback after holding annoyance too long, or turning debates into tests of willpower.`;
      growthAction = `Channel urgency into structured systems and decisive timing rather than reactive pressure.`;
      conversationalProse = `Mars in ${sign} in your ${ordinal(house)} house governs how you push back, solve problems, and claim autonomy in ${arena}. You act best when you set clear rules of engagement up front instead of absorbing frustration until it breaks out sharply.`;
      break;

    case "Jupiter":
      coreTheme = `Your judgment horizon, mentorship instinct, confidence, and where generous perspective opens doors in House ${house}.`;
      strengthAndPower = `Broad vision, fair-minded counsel, and capacity to synthesize complexity into clear guidance for others.`;
      humanChallenge = `Over-promising, assuming goodwill alone fixes structural gaps, or spreading focus too thin.`;
      growthAction = `Pair long-range optimism with practical follow-through so every opportunity you open stays durable.`;
      conversationalProse = `Jupiter in ${sign} in your ${ordinal(house)} house expands how you teach, learn, and plan beyond short-term friction. Inside ${arena}, opportunities open up when you share insight candidly and back your confidence with consistent execution.`;
      break;

    case "Saturn":
      coreTheme = `Your discipline, long-term standards, accountability, and where effort builds lasting authority in House ${house}.`;
      strengthAndPower = `Uncommon stamina, realism under stress, and credibility earned through slow, verifiable work.`;
      humanChallenge = `Expecting delays to prove inadequacy, tightening standards into rigid self-criticism, or refusing help while carrying heavy duties.`;
      growthAction = `Respect steady compounding results and separate fair accountability from perfectionistic pressure.`;
      conversationalProse = `Saturn in ${sign} in your ${ordinal(house)} house sets high, durable standards in ${arena}. Nothing worthwhile here comes as a cheap shortcut; what feels demanding early on becomes the exact backbone people trust you to hold over the long run.`;
      break;

    case "Pluto":
      coreTheme = `Deep structural pressure, power dynamics, and unsparing honesty around control and transformation in House ${house}.`;
      strengthAndPower = `Calm nerve in crisis, ability to see beneath surface politics, and resilience through major reinventions.`;
      humanChallenge = `Hyper-vigilance around hidden motives or holding onto struggles for control long after walking away would free you.`;
      growthAction = `Focus your energy on what you genuinely govern and release power games that drain your authority.`;
      conversationalProse = `Pluto in ${sign} in your ${ordinal(house)} house sharpens your sensitivity to leverage, truth, and real accountability within ${arena}. Superficial fixes never satisfy you; your strength comes from facing root causes plainly without getting pulled into silent power struggles.`;
      break;

    default:
      coreTheme = `${name} in ${sign} in House ${house} (${arena}).`;
      strengthAndPower = `Distinctive perspective and independent judgment aligned with ${archetype}.`;
      humanChallenge = `Restlessness or friction when rigid routines leave no room for adaptation.`;
      growthAction = `Channel unconventional insights into practical form rather than detachment.`;
      conversationalProse = `${name} in ${sign} in your ${ordinal(house)} house brings independent perspective to ${arena}, pushing you beyond stale assumptions toward workable change.`;
      break;
  }

  return {
    coreTheme,
    strengthAndPower,
    humanChallenge,
    growthAction,
    conversationalProse,
  };
}

