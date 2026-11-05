// Calculated charts contain the full evidence ledger. Keep query inputs in the
// request body so chart-derived queries cannot exceed browser/proxy URL limits.
export const chartQueryTransport = { methodOverride: "POST" as const };
export const chartQueryServerTransport = { allowMethodOverride: true };
