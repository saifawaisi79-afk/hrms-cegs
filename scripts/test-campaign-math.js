/**
 * Campaign Hub math checks (standalone — no path aliases).
 * Run: node scripts/test-campaign-math.js
 */
function splitEvenly(total, parts) {
  const n = Math.max(0, Math.floor(Number(parts) || 0));
  const t = Math.max(0, Math.floor(Number(total) || 0));
  if (n === 0) return [];
  const base = Math.floor(t / n);
  const rem = t % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

function deriveCampaignTargets(monthlyTeamTarget, weekCount, employeeCount) {
  const monthly = Math.max(0, Math.floor(Number(monthlyTeamTarget) || 0));
  const weeks = Math.max(0, Math.floor(Number(weekCount) || 0));
  const employees = Math.max(0, Math.floor(Number(employeeCount) || 0));
  const teamWeeklyByWeek = splitEvenly(monthly, weeks);
  const typicalTeamWeekly = teamWeeklyByWeek[0] ?? 0;
  const individualByWeek = teamWeeklyByWeek.map((tw) => splitEvenly(tw, employees));
  const typicalIndividual = individualByWeek[0]?.[0] ?? 0;
  return { typicalTeamWeekly, typicalIndividual, teamWeeklyByWeek, individualByWeek };
}

function weekStatus(actual, target) {
  const a = Math.max(0, Number(actual) || 0);
  const t = Math.max(0, Number(target) || 0);
  const remaining = Math.max(0, t - a);
  if (a > t) return { remaining: 0, achieved: true, exceeded: true };
  if (a === t) return { remaining: 0, achieved: true, exceeded: false };
  return { remaining, achieved: false, exceeded: false };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const d = deriveCampaignTargets(160, 4, 5);
assert(d.typicalTeamWeekly === 40, 'team weekly 40');
assert(d.typicalIndividual === 8, 'individual 8');
assert(weekStatus(8, 8).achieved && !weekStatus(8, 8).exceeded, '8/8');
assert(weekStatus(9, 8).achieved && weekStatus(9, 8).exceeded && weekStatus(9, 8).remaining === 0, '9/8');
assert(weekStatus(7, 8).remaining === 1, '7/8');
assert(splitEvenly(25, 6).reduce((a, b) => a + b, 0) === 25, 'sum 25');
assert(JSON.stringify(splitEvenly(25, 6)) === JSON.stringify([5, 4, 4, 4, 4, 4]), '25/6');
assert(!weekStatus(50, 8).achieved === false, '50 still achieved');
assert(weekStatus(1, 8).achieved === false, '1 not achieved');

console.log('campaign math ok', d);
