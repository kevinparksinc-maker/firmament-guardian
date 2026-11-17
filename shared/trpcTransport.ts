export const chartQueryTransport = {
  maxURLLength: 2083,
  methodOverride: "POST" as const,
};

export const chartQueryServerTransport = {
  maxBodySize: 10 * 1024 * 1024,
  allowMethodOverride: true,
};
