/**
 * Campaign Hub backend evaluator — source of truth for targets, joiners, bonuses.
 * Awards are insert-once (unique index). Notifications use Notification.dedupeKey.
 */

import User from '@/lib/models/User';
import Candidate from '@/lib/models/Candidate';
import JoinerEntry from '@/lib/models/JoinerEntry';
import Notification from '@/lib/models/Notification';
import CampaignAward from '@/lib/models/CampaignAward';
import {
  getMonthWeekPeriods,
  deriveCampaignTargets,
  weekStatus,
  monthBounds,
  WEEKLY_BONUS_INR,
  EOM_BONUS_INR,
  EOM_MIN_WEEKLY_WINS,
} from '@/lib/campaign-weeks';
import { collectValidJoiners, countJoinersFor, lastJoinerIso } from '@/lib/campaign-joiners';
import { istIsoDate as todayIst } from '@/lib/ist-time';

function flattenUser(u) {
  const o = u.toObject ? u.toObject() : u;
  return {
    id: o._id.toString(),
    _id: o._id.toString(),
    name: o.name,
    email: o.email,
    role: o.role,
    employee_id: o.employee_id,
    status: o.status,
  };
}

async function notifyOnce({ senderId, recipientId, title, message, dedupeKey }) {
  try {
    await Notification.create({
      sender_id: senderId || null,
      recipient_id: recipientId,
      title,
      message,
      created_at: new Date().toISOString(),
      dedupeKey,
    });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false;
    throw err;
  }
}

async function insertAward(doc) {
  try {
    const created = await CampaignAward.create(doc);
    return created;
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

async function leadershipIds() {
  const leaders = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    status: { $in: ['active', 'on_leave'] },
  })
    .select('_id')
    .lean();
  return leaders.map((u) => u._id);
}

async function notifyLeadershipAndEmployee({
  employee,
  title,
  employeeMessage,
  leadershipMessage,
  eventKey,
  senderId,
}) {
  const leaders = await leadershipIds();
  await notifyOnce({
    senderId,
    recipientId: employee._id || employee.id,
    title,
    message: employeeMessage,
    dedupeKey: `${eventKey}:emp:${employee.id}`,
  });
  for (const lid of leaders) {
    if (String(lid) === String(employee.id)) continue;
    await notifyOnce({
      senderId,
      recipientId: lid,
      title,
      message: leadershipMessage,
      dedupeKey: `${eventKey}:lead:${lid}`,
    });
  }
}

export function snapshotFromCampaign(campaign, users, joiners, awards, now = new Date()) {
  const today = todayIst(now);
  const weeks = getMonthWeekPeriods(campaign.monthKey);
  const bounds = monthBounds(campaign.monthKey);
  const derived = deriveCampaignTargets(
    campaign.monthlyTeamTarget,
    weeks.length,
    users.length
  );
  const currentWeek =
    weeks.find((w) => today >= w.startIso && today <= w.endIso) || weeks[weeks.length - 1] || null;

  const usersSorted = [...users].sort((a, b) =>
    String(a.employee_id || a.id).localeCompare(String(b.employee_id || b.id))
  );

  const awardMap = new Map();
  (awards || []).forEach((a) => {
    awardMap.set(`${a.type}:${String(a.employeeId)}:${a.periodKey}`, a);
  });

  const employees = usersSorted.map((u, empIndex) => {
    const weekly = weeks.map((w, wi) => {
      const target = derived.individualByWeek[wi]?.[empIndex] ?? 0;
      const actual = countJoinersFor(joiners, u.name, w.startIso, w.endIso);
      const st = weekStatus(actual, target);
      const award = awardMap.get(`weekly_bonus:${u.id}:${w.weekKey}`);
      const weekStarted = today >= w.startIso;
      return {
        weekKey: w.weekKey,
        startIso: w.startIso,
        endIso: w.endIso,
        index: w.index,
        target,
        actual,
        remaining: st.remaining,
        achieved: st.achieved,
        exceeded: st.exceeded,
        label: st.label,
        bonusAmount: award ? award.amount : st.achieved && weekStarted ? WEEKLY_BONUS_INR : 0,
        bonusAwarded: !!award,
        isCurrent: currentWeek ? w.weekKey === currentWeek.weekKey : false,
      };
    });
    const monthlyJoiners = bounds
      ? countJoinersFor(joiners, u.name, bounds.start, bounds.end)
      : 0;
    const weeklyWins = weekly.filter((w) => w.achieved).length;
    const thisWeek = weekly.find((w) => w.isCurrent) || weekly[weekly.length - 1];
    const eomEligible = weeklyWins >= EOM_MIN_WEEKLY_WINS;
    return {
      ...u,
      weekly,
      thisWeek,
      monthlyJoiners,
      weeklyWins,
      eomEligible,
      lastJoinerIso: bounds ? lastJoinerIso(joiners, u.name, bounds.start, bounds.end) : '',
      weeklyBonusTotal: weekly.filter((w) => w.bonusAwarded).length * WEEKLY_BONUS_INR,
    };
  });

  const teamMonthlyJoiners = employees.reduce((s, e) => s + e.monthlyJoiners, 0);
  const teamThisWeek = employees.reduce((s, e) => s + (e.thisWeek?.actual || 0), 0);
  const teamWeeklyTarget = currentWeek
    ? derived.teamWeeklyByWeek[currentWeek.index] ?? derived.typicalTeamWeekly
    : derived.typicalTeamWeekly;

  const monthEnded = bounds ? today > bounds.end : false;
  const eomPick = monthEnded ? pickEmployeeOfMonth(employees) : null;
  const eomAward = eomPick
    ? awardMap.get(`eom:${eomPick.id}:${campaign.monthKey}`)
    : [...awardMap.values()].find((a) => a.type === 'eom');

  return {
    campaign: {
      id: campaign._id?.toString?.() || campaign.id,
      monthKey: campaign.monthKey,
      monthlyTeamTarget: derived.monthlyTeamTarget,
      weekCount: derived.weekCount,
      selectedEmployeeCount: derived.selectedEmployeeCount,
      teamWeeklyByWeek: derived.teamWeeklyByWeek,
      typicalTeamWeekly: derived.typicalTeamWeekly,
      typicalIndividual: derived.typicalIndividual,
      evenTeamWeekly: derived.evenTeamWeekly,
      evenIndividual: derived.evenIndividual,
      weeks,
      currentWeek,
      teamMonthlyJoiners,
      teamThisWeek,
      teamWeeklyTarget,
      monthEnded,
    },
    employees,
    derived,
    today,
    eomWinner: monthEnded && eomPick
      ? {
          id: eomPick.id,
          name: eomPick.name,
          monthlyJoiners: eomPick.monthlyJoiners,
          weeklyWins: eomPick.weeklyWins,
          awarded: Boolean(eomAward),
          bonusAmount: eomAward ? eomAward.amount : 0,
        }
      : null,
  };
}

export function pickEmployeeOfMonth(employees) {
  const eligible = employees.filter((e) => e.eomEligible);
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    if (b.monthlyJoiners !== a.monthlyJoiners) return b.monthlyJoiners - a.monthlyJoiners;
    if (b.weeklyWins !== a.weeklyWins) return b.weeklyWins - a.weeklyWins;
    const aLast = a.lastJoinerIso || '9999-99-99';
    const bLast = b.lastJoinerIso || '9999-99-99';
    if (aLast !== bLast) return aLast.localeCompare(bLast);
    return String(a.employee_id || a.id).localeCompare(String(b.employee_id || b.id));
  });
  return eligible[0];
}

export async function loadJoinerUniverse() {
  const joinedQ = {
    $or: [
      { category: { $regex: 'join', $options: 'i' } },
      { response: { $regex: 'join', $options: 'i' } },
      { followUp1: { $regex: 'join', $options: 'i' } },
      { followUp2: { $regex: 'join', $options: 'i' } },
      { followUp3: { $regex: 'join', $options: 'i' } },
    ],
  };
  const [entries, candidates] = await Promise.all([
    JoinerEntry.find({}).lean(),
    Candidate.find(joinedQ)
      .select('name number date employee category response followUp1 followUp2 followUp3 createdAt')
      .lean(),
  ]);
  const mappedCands = candidates.map((c) => ({
    ...c,
    id: c._id?.toString(),
  }));
  return collectValidJoiners(entries, mappedCands);
}

export async function evaluateAndAward(campaign, senderId, now = new Date()) {
  const today = todayIst(now);
  const weeks = getMonthWeekPeriods(campaign.monthKey);
  const bounds = monthBounds(campaign.monthKey);
  const users = await User.find({ _id: { $in: campaign.participantIds } }).lean();
  const userViews = users.map(flattenUser);
  const joiners = await loadJoinerUniverse();
  const awards = await CampaignAward.find({ campaignId: campaign._id }).lean();
  const snap = snapshotFromCampaign(campaign, userViews, joiners, awards, now);
  const derived = snap.derived;

  const usersSorted = [...userViews].sort((a, b) =>
    String(a.employee_id || a.id).localeCompare(String(b.employee_id || b.id))
  );

  for (let empIndex = 0; empIndex < usersSorted.length; empIndex += 1) {
    const u = usersSorted[empIndex];
    for (let wi = 0; wi < weeks.length; wi += 1) {
      const w = weeks[wi];
      if (today < w.startIso) continue;
      const target = derived.individualByWeek[wi]?.[empIndex] ?? 0;
      if (target <= 0) continue;
      const actual = countJoinersFor(joiners, u.name, w.startIso, w.endIso);
      if (actual < target) continue;
      const created = await insertAward({
        campaignId: campaign._id,
        type: 'weekly_bonus',
        employeeId: u.id,
        periodKey: w.weekKey,
        amount: WEEKLY_BONUS_INR,
        joiners: actual,
        target,
        weeklyWins: 1,
        meta: { monthKey: campaign.monthKey, employeeName: u.name },
      });
      if (!created) continue;
      const exceeded = actual > target;
      const statusWord = exceeded ? 'ACHIEVED / EXCEEDED' : 'ACHIEVED';
      const title = 'Weekly recruitment target achieved';
      const employeeMessage = `Congratulations ${u.name}! You achieved your weekly target of ${target} joiners this week (${w.weekKey}: ${actual}/${target}, ${statusWord}). You have earned a ₹${WEEKLY_BONUS_INR.toLocaleString('en-IN')} bonus.`;
      const leadershipMessage = `${u.name} achieved the weekly campaign target for ${w.weekKey} (${actual}/${target} joiners, ${statusWord}). Weekly bonus ₹${WEEKLY_BONUS_INR.toLocaleString('en-IN')}.`;
      await notifyLeadershipAndEmployee({
        employee: u,
        title,
        employeeMessage,
        leadershipMessage,
        eventKey: `caw:${campaign._id}:weekly:${u.id}:${w.weekKey}`,
        senderId,
      });
    }
  }

  const awards2 = await CampaignAward.find({ campaignId: campaign._id }).lean();
  const snap2 = snapshotFromCampaign(campaign, userViews, joiners, awards2, now);

  if (bounds && today > bounds.end) {
    const winner = pickEmployeeOfMonth(snap2.employees);
    if (winner) {
      const created = await insertAward({
        campaignId: campaign._id,
        type: 'eom',
        employeeId: winner.id,
        periodKey: campaign.monthKey,
        amount: EOM_BONUS_INR,
        joiners: winner.monthlyJoiners,
        target: derived.monthlyTeamTarget,
        weeklyWins: winner.weeklyWins,
        meta: { employeeName: winner.name, monthKey: campaign.monthKey },
      });
      if (created) {
        const title = 'Employee of the Month';
        const employeeMessage = `Congratulations ${winner.name}! You are the Employee of the Month for ${campaign.monthKey}. You brought the highest number of valid joiners in the team this month (${winner.monthlyJoiners}) and completed the weekly target requirement at least ${EOM_MIN_WEEKLY_WINS} times (${winner.weeklyWins} weeks). You have earned a ₹${EOM_BONUS_INR.toLocaleString('en-IN')} bonus.`;
        const leadershipMessage = `${winner.name} is Employee of the Month for ${campaign.monthKey} (${winner.monthlyJoiners} joiners, ${winner.weeklyWins} weekly targets achieved). EOM bonus ₹${EOM_BONUS_INR.toLocaleString('en-IN')}.`;
        await notifyLeadershipAndEmployee({
          employee: winner,
          title,
          employeeMessage,
          leadershipMessage,
          eventKey: `caw:${campaign._id}:eom:${campaign.monthKey}`,
          senderId,
        });
      }
    }
  }

  const awardsFinal = await CampaignAward.find({ campaignId: campaign._id }).lean();
  return snapshotFromCampaign(campaign, userViews, joiners, awardsFinal, now);
}

export { flattenUser };
