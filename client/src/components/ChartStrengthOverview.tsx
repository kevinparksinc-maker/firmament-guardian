import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";
import { HouseStrengthChart, PlanetStrengthChart } from "./VedicStrengthCharts";

/**
 * First-class access to the numerical strength evidence already produced by
 * the deterministic vedic.strength endpoint. It does not call an LLM and
 * does not wait for interpretation.methodOutcomes or its provider-dependent minis.
 */
export function ChartStrengthOverview({ chart }: { chart: ChartResult }) {
  const query = trpc.vedic.strength.useQuery(
    { chart },
    { retry: false, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  const planetRows = query.data?.planets;
  const houseRows = query.data?.houses;
  const sortedPlanets = [...(planetRows ?? [])].sort((a, b) => a.rank - b.rank);
  const sortedHouses = [...(houseRows ?? [])].sort((a, b) => a.rank - b.rank);

  return (
    <section
      aria-label="Planetary and house strength"
      id="planetary-house-strength"
      className="space-y-5 rounded-2xl border border-amber-300/30 bg-slate-950/85 p-4 sm:p-6"
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-200">
          Major interpretive layer · Calculated, not generated
        </p>
        <h2 className="font-serif text-2xl font-semibold text-white">
          Planetary Strength &amp; House Strength
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          Shadbala measures each classical planet's sixfold capacity. Bhava Bala
          compares the capacity of all twelve houses. These are chart-derived
          strengths, not predictions or percentages of success. Their
          interpretation is woven with mansions, house lordship and planetary
          contacts in your complete reading.
        </p>
      </header>

      {query.isLoading && (
        <p role="status" className="text-sm text-cyan-200">
          Calculating Shadbala and Bhava Bala from your chart…
        </p>
      )}
      {query.error && (
        <div role="alert" className="space-y-2 text-sm text-rose-200">
          <p>Strength results could not be loaded: {query.error.message}</p>
          <button type="button" onClick={() => void query.refetch()} className="underline">
            Retry strength calculations
          </button>
        </div>
      )}

      {query.data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-3" aria-label="Shadbala overview">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-amber-100">Shadbala · 7 planets</h3>
              <a className="text-xs text-cyan-200 underline" href="#method-vedic-shadbala">
                Calculation evidence
              </a>
            </div>
            {sortedPlanets.length ? (
              <>
                <p className="text-xs text-slate-400">
                  100% means the planet meets its own traditional minimum,
                  not that an event is 100% likely. Ranked by adequacy.
                </p>
                {sortedPlanets.map(planet => {
                  const percentage = planet.adequacyRatio * 100;
                  return (
                    <div key={planet.body} className="rounded-lg border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <strong>{planet.body}</strong>
                        <span className="tabular-nums text-amber-100">
                          {percentage.toFixed(1)}% · #{planet.rank}/7
                        </span>
                      </div>
                      <div
                        role="meter"
                        aria-label={`${planet.body} Shadbala versus its minimum`}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(100, percentage)}
                        aria-valuenow={Math.max(0, percentage)}
                        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"
                      >
                        <div
                          className="h-full bg-amber-300"
                          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {planet.rupas.toFixed(2)} rupas · Required{" "}
                        {(planet.requiredVirupas / 60).toFixed(2)} · Rules{" "}
                        {planet.ownedHouses.length
                          ? planet.ownedHouses.map(h => `H${h}`).join(", ")
                          : "no local houses"}
                      </p>
                    </div>
                  );
                })}
              </>
            ) : (
              <p role="status" className="rounded-lg border border-amber-300/20 p-3 text-sm text-amber-100">
                "No Shadbala values were returned by the calculation engine."
              </p>
            )}
          </section>

          <section className="space-y-3" aria-label="Bhava Bala overview">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-cyan-100">Bhava Bala · 12 houses</h3>
              <a className="text-xs text-cyan-200 underline" href="#method-vedic-bhava-bala">
                Calculation evidence
              </a>
            </div>
            {sortedHouses.length ? (
              <>
                <p className="text-xs text-slate-400">
                  Relative strength within this chart; ranked from strongest to
                  weakest house. No universal success threshold is implied.
                </p>
                {sortedHouses.map(house => {
                  const maximum = Math.max(1, ...sortedHouses.map(row => row.totalVirupas));
                  return (
                    <div key={house.house} className="rounded-lg border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <strong>House {house.house}</strong>
                        <span className="tabular-nums text-cyan-100">
                          {(house.totalVirupas / 60).toFixed(2)} rupas · #{house.rank}/12
                        </span>
                      </div>
                      <div
                        role="meter"
                        aria-label={`House ${house.house} Bhava Bala`}
                        aria-valuemin={0}
                        aria-valuemax={maximum}
                        aria-valuenow={Math.max(0, house.totalVirupas)}
                        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"
                      >
                        <div
                          className="h-full bg-cyan-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, house.totalVirupas / maximum * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {house.sign} · Ruled by {house.lord} · Lord acts through H
                        {house.lordDeliveryHouse}
                      </p>
                    </div>
                  );
                })}
              </>
            ) : (
              <p role="status" className="rounded-lg border border-cyan-300/20 p-3 text-sm text-cyan-100">
                "No Bhava Bala values were returned by the calculation engine."
              </p>
            )}
          </section>
        </div>
      )}

      {(planetRows?.length || houseRows?.length) && (
        <details className="rounded-xl border border-white/15 p-3">
          <summary className="cursor-pointer font-medium text-cyan-100">
            Open full strength calculations and component tables
          </summary>
          <div className="mt-4 space-y-8">
            {planetRows?.length ? <PlanetStrengthChart rows={planetRows} /> : null}
            {houseRows?.length ? <HouseStrengthChart rows={houseRows} /> : null}
          </div>
        </details>
      )}
      <p className="text-xs text-slate-400">
        Method: The Absolute's documented fixed-XYZ / equal-house adaptation
        of Shadbala and Bhava Bala. Results require the chart's necessary
        birth-time and Ascendant inputs. See the calculation evidence for
        formula variants, provenance and any unavailable inputs.
      </p>
    </section>
  );
}
