const fs = require('fs');
const x = JSON.parse(fs.readFileSync('/tmp/cfb-20260919.json', 'utf8'));
const fixtures = x.events.map((e, index) => {
  const c = e.competitions?.[0];
  const competitors = [...(c?.competitors || [])].sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  const away = competitors.find(t => t.homeAway === 'away') || competitors[1];
  const home = competitors.find(t => t.homeAway === 'home') || competitors[0];
  return {
    id: `cfb-2026-09-19-${String(index + 1).padStart(3,'0')}-${e.id}`,
    teamA: away.team.displayName,
    teamB: home.team.displayName,
    sport: 'NCAA' ,
    location: c?.venue?.fullName || 'Unknown venue',
    startTime: e.date,
    status: e.status?.type?.description || 'Scheduled',
    eventId: e.id,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    conference: e.league?.name || 'NCAA',
    odds: c?.odds?.[0] || null,
  };
});
fs.writeFileSync('/tmp/cfb-slate-fixtures.json', JSON.stringify(fixtures, null, 2));
console.log(JSON.stringify({count: fixtures.length, first: fixtures.slice(0,3), last: fixtures.slice(-3)}, null, 2));
