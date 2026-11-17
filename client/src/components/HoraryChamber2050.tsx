import { useState } from "react";
import { AlertTriangle, ArrowDown, BookOpen, Compass, Eye, HelpCircle, Layers3, MoonStar, Orbit, ShieldCheck, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import type { HoraryChart } from "../../../server/horary";
import "./HoraryChamber2050.css";

type Lens = "answer" | "testimony" | "celestial";
type Props = { chart: HoraryChart; reading: string };
const glyphs: Record<string, string> = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄" };
const classical = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);
const pt = (lon: number, r: number) => {
  const a = ((lon - 90) * Math.PI) / 180;
  return { x: 250 + Math.cos(a) * r, y: 250 + Math.sin(a) * r };
};

export function HoraryChamber2050({ chart, reading }: Props) {
  const [lens, setLens] = useState<Lens>("answer");
  const [focused, setFocused] = useState("Moon");
  const [showTechnical, setShowTechnical] = useState(false);

  const traditional = chart.traditional;
  const status = traditional.judgment.verdict;
  const moon = traditional.moonStatus;
  const featured = chart.placements.filter(p => classical.has(p.name));
  const selected = featured.find(row => row.name === focused) ?? chart.moon;
  const qa = chart.questionAnalysis;
  const isExplanatory = qa?.questionType === "open_explanatory" || qa?.questionType === "location";

  const significators = [
    { name: "You / querent", ruler: chart.querentRuler, house: 1 },
    {
      name: chart.subject === "querent" ? "Unfolding flow (Moon)" : "Person in question",
      ruler: chart.subject === "querent" ? "Moon" : chart.subjectRuler,
      house: chart.subject === "querent" ? chart.moon.house : chart.subjectHouse,
    },
    { name: qa?.matterSubject ? `Matter (${qa.matterSubject})` : "The matter", ruler: chart.topicRuler, house: chart.actualTopicHouse },
    ...(chart.additionalTopicHouses ?? []).slice(0, 3).map(h => ({
      name: h.label,
      ruler: h.ruler,
      house: h.actualHouse,
    })),
  ];

  const steps: [Lens, string, string, typeof Eye][] = [
    ["answer", "01", "Your answer", Sparkles],
    ["testimony", "02", "Why this judgment?", Compass],
    ["celestial", "03", "Question-time sky", Orbit],
  ];

  return (
    <section className="hc2050" aria-label="Firmament Horary 2050 judgment chamber">
      <div className="hc2050-head">
        <div>
          <p className="hc2050-kicker">
            <MoonStar size={15} /> THE HORARY CHAMBER · QUESTION MOMENT
          </p>
          <h2>
            Your question, <em>under the heavens.</em>
          </h2>
          <p>
            Each reading begins with what you actually asked, casts the question-moment sky, and translates the traditional chart testimony into clear everyday guidance.
          </p>
        </div>
        <span className="hc2050-seal">
          <ShieldCheck size={16} /> QUESTION MOMENT · SAME CHART
        </span>
      </div>

      <div className="hc2050-question">
        <div>
          <span>QUESTION UNDER EXAMINATION</span>
          <h3>{chart.question}</h3>
          <small>
            {chart.location} ·{" "}
            {new Date(chart.askedAt).toLocaleString(undefined, {
              timeZone: chart.timezone,
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            · Equal House
          </small>
        </div>
        <div className="hc2050-verdict">
          <span>{isExplanatory ? "INTERPRETED FOCUS" : "TRADITIONAL JUDGMENT"}</span>
          <strong>{isExplanatory ? qa.matterSubject : status}</strong>
          <small>
            {isExplanatory
              ? `House ${chart.actualTopicHouse}${chart.additionalTopicHouses?.length ? ` + Houses ${chart.additionalTopicHouses.map(h => h.actualHouse).join(", ")}` : ""} · see full chart testimony in Tab 02`
              : "Configured astrological testimony · provisional, not certainty"}
          </small>
        </div>
      </div>

      <div className="hc2050-stepbar" role="tablist" aria-label="Horary explanation depth">
        {steps.map(([id, number, label, Icon]) => (
          <button
            type="button"
            key={id}
            role="tab"
            id={`hc2050-tab-${id}`}
            aria-controls={`hc2050-panel-${id}`}
            aria-selected={lens === id}
            onClick={() => setLens(id)}
            className={lens === id ? "selected" : ""}
          >
            <span>{number}</span>
            <Icon size={17} />
            <strong>{label}</strong>
          </button>
        ))}
      </div>

      {lens === "answer" && (
        <div role="tabpanel" id="hc2050-panel-answer" aria-labelledby="hc2050-tab-answer" className="hc2050-stage">
          <div className="hc2050-column">
            <span className="hc2050-eyebrow">01 / THE HUMAN ANSWER</span>
            <h3>The reading, in clear language</h3>
            <p>
              Plainspoken guidance anchored directly to your question and the calculated chart testimony. Technical astrology details remain available in the Evidence tab.
            </p>
            <div className="hc2050-reading prose prose-invert max-w-none prose-headings:text-white prose-p:leading-8 prose-p:text-[#cbd7e2] prose-strong:text-[#f0d7aa]">
              <Streamdown>{reading}</Streamdown>
            </div>
            <button type="button" className="hc2050-next" onClick={() => setLens("testimony")}>
              Inspect traditional chart evidence <ArrowDown size={16} />
            </button>
          </div>
          <aside className="hc2050-side">
            <div className="hc2050-side-heading">
              <HelpCircle size={17} /> HOW THIS WAS ANALYZED
            </div>
            <div className="hc2050-side-item">
              <strong>Subject & scope</strong>
              <p>{qa?.matterSubject ?? chart.topicLabel}</p>
            </div>
            <div className="hc2050-side-item">
              <strong>Houses consulted</strong>
              <p>
                House {chart.subjectHouse} (subject), House {chart.actualTopicHouse} (matter)
                {chart.additionalTopicHouses?.length
                  ? `, plus supporting Houses ${chart.additionalTopicHouses.map(h => h.actualHouse).join(", ")}`
                  : ""}
              </p>
            </div>
            <div className="hc2050-side-item">
              <strong>Reasoning</strong>
              <p>{qa?.reasoning ?? "Traditional significators and lunar motion applied directly to the question."}</p>
            </div>
            <p className="hc2050-caution">Open Tab 02 ("Why this judgment?") to see every planet, aspect, dignity, and traditional test.</p>
          </aside>
        </div>
      )}

      {lens === "testimony" && (
        <div role="tabpanel" id="hc2050-panel-testimony" aria-labelledby="hc2050-tab-testimony" className="hc2050-stage">
          <div className="hc2050-wide">
            <div className="hc2050-eyebrow">02 / DETERMINISTIC TRADITIONAL EVIDENCE</div>
            <h3>See the reasons, not just the reading.</h3>
            <p>
              These are the actual houses, significators, and traditional testimonies returned by the Horary calculation. Conflicting evidence remains visible.
            </p>
            <div className="hc2050-significators">
              {significators.map((item, index) => (
                <article key={index}>
                  <span>{item.name}</span>
                  <strong>{item.ruler}</strong>
                  <small>House {item.house}</small>
                </article>
              ))}
            </div>
            <div className="hc2050-testimony-grid">
              <article>
                <span>
                  <Orbit size={16} /> PERFECTING CONTACTS
                </span>
                <strong>{traditional.perfection.length} configured testimony records</strong>
                {traditional.perfection.length ? (
                  traditional.perfection.map((item, i) => (
                    <div key={i} className="hc2050-testimony-item">
                      <b className={item.strength === "difficult" ? "hard" : item.strength === "supportive" ? "soft" : ""}>
                        {item.type.replaceAll("-", " ")} · {item.strength}
                      </b>
                      <p>{item.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="hc2050-muted">
                    No direct, translated, collected or prohibited perfection was returned for the configured significators.
                  </p>
                )}
              </article>
              <article>
                <span>
                  <MoonStar size={16} /> THE MOON'S CONDITION
                </span>
                <strong>{moon.voidOfCourse ? "Void of course" : "Further applications found"}</strong>
                <p>{moon.explanation}</p>
                <div className="hc2050-testimony-item">
                  {moon.nextApplications.length ? (
                    moon.nextApplications.map((item, i) => (
                      <p key={i}>
                        {item.planet} · {item.aspect} · approximately {item.daysToPerfection} days to exact contact
                      </p>
                    ))
                  ) : (
                    <p>No next classical application before sign exit is recorded.</p>
                  )}
                </div>
              </article>
              <article>
                <span>
                  <Compass size={16} /> RECEPTION AND CONDITION
                </span>
                <strong>{traditional.receptions.length} reception entries</strong>
                {traditional.receptions.length ? (
                  traditional.receptions.slice(0, 10).map((item, i) => (
                    <div key={i} className="hc2050-testimony-item">
                      <p>{item.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="hc2050-muted">No configured reception returned.</p>
                )}
                {traditional.receptions.length > 10 && (
                  <p className="hc2050-muted">
                    {traditional.receptions.length - 10} further entries remain in the complete traditional ledger below.
                  </p>
                )}
              </article>
              <article>
                <span>
                  <AlertTriangle size={16} /> CAUTIONS BEFORE JUDGMENT
                </span>
                <strong>{traditional.radicality.status === "radical" ? "No configured caution triggered" : "Additional caution"}</strong>
                <p>{traditional.radicality.explanation}</p>
                {traditional.radicality.considerations.map((item, i) => (
                  <div key={i} className="hc2050-testimony-item">
                    <p>{item}</p>
                  </div>
                ))}
              </article>
            </div>
            <div className="hc2050-judgment">
              <span>ENGINE'S JUDGMENT EXPLANATION ({status})</span>
              <p>{traditional.judgment.explanation}</p>
              {traditional.judgment.testimonies.length > 0 && (
                <ul>
                  {traditional.judgment.testimonies.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {lens === "celestial" && (
        <div role="tabpanel" id="hc2050-panel-celestial" aria-labelledby="hc2050-tab-celestial" className="hc2050-stage">
          <div className="hc2050-sky">
            <div className="hc2050-wheel">
              <svg
                viewBox="0 0 500 500"
                role="img"
                aria-label="Question-time calculated planet positions in the fixed celestial sector system and local equal houses"
              >
                <defs>
                  <radialGradient id="hc2050-core">
                    <stop stopColor="#22355a" offset="0" />
                    <stop stopColor="#091124" offset="1" />
                  </radialGradient>
                </defs>
                <circle cx="250" cy="250" r="219" fill="url(#hc2050-core)" stroke="#e2c596" strokeOpacity=".52" />
                <circle cx="250" cy="250" r="177" fill="none" stroke="#89cfe9" strokeOpacity=".32" />
                <circle cx="250" cy="250" r="130" fill="none" stroke="#ad9bdd" strokeOpacity=".26" />
                {chart.houses.map(h => {
                  const a = pt(h.longitude, 130);
                  const z = pt(h.longitude, 218);
                  return (
                    <g key={h.house}>
                      <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="#acdaf0" strokeOpacity=".43" />
                      <text
                        x={pt(h.longitude + 15, 153).x}
                        y={pt(h.longitude + 15, 153).y}
                        fill="#e9d4ac"
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {h.house}
                      </text>
                    </g>
                  );
                })}
                {Array.from({ length: 12 }, (_, i) => {
                  const a = pt(i * 30, 177);
                  const z = pt(i * 30, 219);
                  return <line key={i} x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="#e7c788" strokeOpacity=".55" />;
                })}
                {featured.map(row => {
                  const q = pt(row.longitude, 191);
                  return (
                    <g
                      key={row.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFocused(row.name)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setFocused(row.name);
                        }
                      }}
                      aria-label={`Inspect ${row.name} ${row.display}`}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={q.x}
                        cy={q.y}
                        r={focused === row.name ? 8 : 5}
                        fill={focused === row.name ? "#ffe0a2" : "#a4e4f1"}
                      />
                      <title>
                        {row.name} {row.display}
                      </title>
                    </g>
                  );
                })}
                <text x="250" y="239" textAnchor="middle" fill="#f4e2c4" fontFamily="Georgia" fontSize="17">
                  HORARY
                </text>
                <text x="250" y="263" textAnchor="middle" fill="#a5bfcd" fontSize="10">
                  QUESTION · LOCAL HOUSES
                </text>
              </svg>
            </div>
            <p>
              Fixed celestial zodiac sectors are shown behind the question's local equal houses. Planet positions come from equatorial ephemeris XYZ projected into the app’s fixed firmament frame. Local equal houses start at the sunrise-anchored Ascendant.
            </p>
          </div>
          <aside className="hc2050-sky-side">
            <div className="hc2050-eyebrow">03 / THE QUESTION-TIME FIELD</div>
            <h3>Explore the significators.</h3>
            <div className="hc2050-planet-grid">
              {featured.map(row => (
                <button
                  key={row.name}
                  type="button"
                  aria-pressed={focused === row.name}
                  onClick={() => setFocused(row.name)}
                  className={focused === row.name ? "selected" : ""}
                >
                  <span>{glyphs[row.name] ?? "✦"}</span>
                  {row.name}
                </button>
              ))}
            </div>
            <div className="hc2050-selection">
              <span>SELECTED PLACEMENT</span>
              <strong>
                {selected.name} · {selected.display}
              </strong>
              <p>
                Agent View: House {selected.house}. Fixed God View: House{" "}
                {selected.godHouse ?? Math.floor((((selected.longitude % 360) + 360) % 360) / 30) + 1}.
              </p>
            </div>
            <div className="hc2050-legend">
              <p>
                <i /> Gold: permanent zodiac territory
              </p>
              <p>
                <i /> Cyan: local equal-house divisions
              </p>
              <p>
                <i /> Light markers: question-time planets
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTechnical(s => !s)}
              aria-expanded={showTechnical}
              className="hc2050-technical-toggle"
            >
              <BookOpen size={16} />
              {showTechnical ? "Hide exact degrees" : "Show exact degree ledger"}
            </button>
            {showTechnical && (
              <div className="hc2050-technical-list">
                {featured.map(row => (
                  <div key={row.name}>
                    <span>{row.name}</span>
                    <strong>
                      {row.display} · H{row.house}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <footer className="hc2050-footer">
        <Layers3 size={15} /> God View and Agent View remain separate calculated frames. Open Tab 02 or the Evidence box below to inspect every planet, cusp, Lot, dignity, and look-ahead date.
      </footer>
    </section>
  );
}
