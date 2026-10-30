import React, { type ReactNode } from "react";
import "./absolute-ui.css";

type Tone = "default" | "gold" | "cyan" | "violet" | "rose";
type HeadingLevel = 2 | 3 | 4;
type StatusTone = "good" | "mixed" | "friction";
type Action = ReactNode;

const headingTags = { 2: "h2", 3: "h3", 4: "h4" } as const;

/** Scope the Phase 2 semantic tokens to a subtree; the Phase 1 shell remains the page frame. */
export function AbsoluteTheme({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={["the-absolute-theme", className].filter(Boolean).join(" ")}>{children}</div>;
}

/** Presentational only. Use a real Link or button for interactive cards. */
export function AbsoluteCard({
  children,
  tone = "default",
  selected = false,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  selected?: boolean;
  className?: string;
}) {
  return (
    <article
      className={["abs-card", `abs-tone-${tone}`, selected ? "abs-selected" : "", className]
        .filter(Boolean)
        .join(" ")}
      data-selected={selected || undefined}
    >
      {children}
    </article>
  );
}

export function AbsoluteSection({
  title,
  eyebrow,
  description,
  action,
  children,
  headingLevel = 2,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: Action;
  children: ReactNode;
  headingLevel?: HeadingLevel;
}) {
  const Heading = headingTags[headingLevel];
  return (
    <section className="abs-section">
      <header className="abs-section-header">
        <div>
          {eyebrow && <p className="abs-eyebrow">{eyebrow}</p>}
          <Heading>{title}</Heading>
          {description && <p className="abs-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function MetricTile({
  label,
  displayValue,
  description,
  evidence,
  status,
}: {
  label: string;
  displayValue: string | number;
  description?: string;
  evidence?: ReactNode;
  status?: string;
}) {
  return (
    <AbsoluteCard>
      <p className="abs-eyebrow">{label}</p>
      <p className="abs-metric">{displayValue}</p>
      {status && <p className="abs-status">{status}</p>}
      {description && <p className="abs-muted">{description}</p>}
      {evidence && (
        <details>
          <summary>Why this value?</summary>
          <div className="abs-evidence">{evidence}</div>
        </details>
      )}
    </AbsoluteCard>
  );
}

export function PlanetPlacementCard({
  planetName,
  glyph,
  signLabel,
  degreeLabel,
  houseLabel,
  dignityLabel,
  onInspect,
}: {
  planetName: string;
  glyph: string;
  signLabel: string;
  degreeLabel: string;
  houseLabel?: string;
  dignityLabel?: string;
  onInspect?: () => void;
}) {
  const secondary = [houseLabel, dignityLabel].filter(Boolean).join(" · ");
  const accessibleName = [planetName, signLabel, degreeLabel, houseLabel, dignityLabel]
    .filter(Boolean)
    .join(", ");
  const content = (
    <>
      <span className="abs-glyph" aria-hidden="true">{glyph}</span>
      <span className="abs-card-copy">
        <strong>{planetName}</strong>
        <span>{signLabel} · {degreeLabel}</span>
        {secondary && <small>{secondary}</small>}
      </span>
    </>
  );

  return onInspect ? (
    <button
      type="button"
      className="abs-planet abs-clickable"
      onClick={onInspect}
      aria-label={`Inspect ${accessibleName}`}
    >
      {content}
    </button>
  ) : (
    <div className="abs-planet">{content}</div>
  );
}

export function HouseCard({
  houseNumber,
  signLabel,
  cuspDegree,
  rulerLabel,
  occupants = [],
}: {
  houseNumber: number;
  signLabel: string;
  cuspDegree?: string;
  rulerLabel?: string;
  occupants?: string[];
}) {
  return (
    <AbsoluteCard>
      <p className="abs-eyebrow">House {houseNumber}</p>
      <strong>{signLabel}</strong>
      {cuspDegree && <p>{cuspDegree}</p>}
      {rulerLabel && <p className="abs-muted">Ruler: {rulerLabel}</p>}
      <p className="abs-muted">{occupants.length ? occupants.join(", ") : "No planets"}</p>
    </AbsoluteCard>
  );
}

export function ElementBalanceCard({
  elements,
}: {
  elements: { name: string; value: number; label: string }[];
}) {
  return (
    <AbsoluteCard>
      <h3>Element balance</h3>
      <div className="abs-stack">
        {elements.map((element) => (
          <div key={element.name}>
            <div className="abs-between">
              <span>{element.name}</span>
              <span>{element.label}</span>
            </div>
            <div
              className="abs-meter"
              role="progressbar"
              aria-label={`${element.name} balance`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={element.value}
              aria-valuetext={`${element.label} (${element.value}%)`}
            >
              <span style={{ width: `${element.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </AbsoluteCard>
  );
}

export function MansionCard({
  tradition,
  mansionName,
  degreeRangeLabel,
  occupants = [],
  occupancyLabel,
  interpretation,
}: {
  tradition: string;
  mansionName: string;
  degreeRangeLabel?: string;
  occupants?: string[];
  /** Display-ready status from the caller; the component does not infer occupancy. */
  occupancyLabel?: string;
  interpretation?: ReactNode;
}) {
  return (
    <AbsoluteCard tone="violet">
      <p className="abs-eyebrow">{tradition}</p>
      <h3>{mansionName}</h3>
      {degreeRangeLabel && <p>{degreeRangeLabel}</p>}
      {occupants.length > 0 ? (
        <p className="abs-muted">Occupants: {occupants.join(", ")}</p>
      ) : (
        <p className="abs-muted">{occupancyLabel ?? "Occupancy not specified"}</p>
      )}
      {interpretation && (
        <details>
          <summary>Interpretation</summary>
          <div className="abs-evidence">{interpretation}</div>
        </details>
      )}
    </AbsoluteCard>
  );
}

export function ChartFrame({
  title,
  frameLabel,
  legend,
  evidence,
  children,
}: {
  title: string;
  frameLabel: "God View" | "Agent View";
  legend?: ReactNode;
  evidence?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AbsoluteCard tone="gold" className="abs-chart-frame">
      <div className="abs-between">
        <h3>{title}</h3>
        <span className="abs-chip">{frameLabel}</span>
      </div>
      <div className="abs-chart" role="group" aria-label={`${title} — ${frameLabel}`}>
        {children}
      </div>
      {legend && <div className="abs-muted">{legend}</div>}
      {evidence && (
        <details>
          <summary>Chart evidence</summary>
          <div className="abs-evidence">{evidence}</div>
        </details>
      )}
    </AbsoluteCard>
  );
}

export function ReadingSection({
  heading,
  summary,
  paragraphs,
  evidence,
  expanded,
}: {
  heading: string;
  summary: string;
  paragraphs: string[];
  evidence?: ReactNode;
  expanded?: boolean;
}) {
  return (
    <section className="abs-reading">
      <h3>{heading}</h3>
      <p className="abs-reading-lead">{summary}</p>
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {evidence && (
        <details open={expanded}>
          <summary>Why this interpretation?</summary>
          <div className="abs-evidence">{evidence}</div>
        </details>
      )}
    </section>
  );
}

export function EnergyStatusCard({
  eyebrow = "Personal Harmonic Flow Clock",
  title,
  statusLabel,
  statusTone = "mixed",
  scoreLabel,
  windowLabel,
  nextShiftLabel,
  suggestions = [],
  evidence,
  chartSlot,
  children,
  action,
  disclosureLabel = "Explore the evidence and charts",
}: {
  eyebrow?: string;
  title?: string;
  statusLabel: string;
  statusTone?: StatusTone;
  scoreLabel?: string;
  windowLabel?: string;
  nextShiftLabel?: string;
  suggestions?: string[];
  evidence?: ReactNode;
  chartSlot?: ReactNode;
  children?: ReactNode;
  action?: Action;
  disclosureLabel?: string;
}) {
  return (
    <section className="abs-card abs-tone-cyan abs-energy" aria-label={title ?? eyebrow}>
      <header className="abs-energy-header">
        <div>
          <p className="abs-eyebrow">{eyebrow}</p>
          {title && <h2>{title}</h2>}
        </div>
        <div className="abs-energy-tools">
          <div className="abs-energy-state">
            <span className={`abs-status-chip abs-status-${statusTone}`}>{statusLabel}</span>
            {scoreLabel && <strong className="abs-metric">{scoreLabel}</strong>}
          </div>
          {action && <div className="abs-energy-action">{action}</div>}
        </div>
      </header>
      {(windowLabel || nextShiftLabel) && (
        <div className="abs-energy-meta">
          {windowLabel && <p>{windowLabel}</p>}
          {nextShiftLabel && <p><span className="abs-muted">Next shift:</span> {nextShiftLabel}</p>}
        </div>
      )}
      {children && <div className="abs-energy-content">{children}</div>}
      {suggestions.length > 0 && (
        <ul className="abs-suggestions">{suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul>
      )}
      {(evidence || chartSlot) && (
        <details>
          <summary>{disclosureLabel}</summary>
          <div className="abs-evidence">{evidence}{chartSlot}</div>
        </details>
      )}
    </section>
  );
}

export function StatePanel({
  kind,
  title,
  message,
  action,
}: {
  kind: "loading" | "empty" | "error" | "locked";
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="abs-state"
      role={kind === "error" ? "alert" : "status"}
      aria-busy={kind === "loading"}
      data-state={kind}
    >
      <p className="abs-eyebrow">{kind}</p>
      <h3>{title}</h3>
      <p className="abs-muted">{message}</p>
      {action}
    </div>
  );
}
