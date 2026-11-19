'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { withAppPage } from '@/components/hrms/withAppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card } from '@/components/ui';
import { currentMonthKey, deriveCampaignTargets, getMonthWeekPeriods } from '@/lib/campaign-weeks';

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function monthLabel(monthKey) {
  const [y, m] = String(monthKey || '').split('-');
  if (!y || !m) return monthKey;
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function statusTone(label) {
  if (String(label).includes('Exceeded')) return 'success';
  if (label === 'Achieved') return 'success';
  if (label === 'Pending') return 'warning';
  return 'neutral';
}

function Metric({ title, value, sub }) {
  return (
    <div className="metric-card glass-card" style={{ flex: '1 1 160px', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function CampaignHubInner({ user }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState('');
  const [monthlyTeamTarget, setMonthlyTeamTarget] = useState(160);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // View modes: 'week' | 'month' | 'matrix'
  const [viewMode, setViewMode] = useState('week');
  const [selectedWeekKey, setSelectedWeekKey] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setStatus('Login required');
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/campaigns?month=${encodeURIComponent(monthKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load Recruitment Performance');
        setStatus('Error');
        return;
      }
      setData(json);
      if (json.campaign) {
        setMonthlyTeamTarget(json.campaign.monthlyTeamTarget);
        setSelectedIds(json.campaign.participantIds || []);
      }
      setStatus('Synced');
    } catch {
      setError('Network error');
      setStatus('Offline');
    }
  }, [monthKey, token]);

  useEffect(() => {
    load();
  }, [load]);

  const weeksForMonth = useMemo(() => getMonthWeekPeriods(monthKey), [monthKey]);
  const preview = useMemo(() => {
    const d = deriveCampaignTargets(monthlyTeamTarget, weeksForMonth.length, selectedIds.length);
    return d;
  }, [monthlyTeamTarget, weeksForMonth.length, selectedIds.length]);

  const selectable = data?.selectable || [];

  const toggleId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const assign = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          monthKey,
          monthlyTeamTarget: Number(monthlyTeamTarget),
          participantIds: selectedIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not assign target');
        setSaving(false);
        return;
      }
      await load();
    } catch {
      setError('Network error while assigning');
    }
    setSaving(false);
  };

  const snap = data?.snapshot;
  const camp = snap?.campaign || data?.campaign;
  const me = (snap?.employees || []).find((e) => e.id === user?.id);
  const eomWinner = camp?.monthEnded ? snap?.eomWinner : null;

  const canManage = !!data?.canManage;
  const assigned = !!data?.assigned;

  const weeks = camp?.weeks || weeksForMonth;
  const currentWeek = camp?.currentWeek || weeks[weeks.length - 1] || null;
  const activeWeekKey = selectedWeekKey || currentWeek?.weekKey || weeks[0]?.weekKey || '';
  const activeWeekObj = weeks.find((w) => w.weekKey === activeWeekKey) || currentWeek || weeks[0];

  // Calculated stats for the active week
  const activeWeekIndex = activeWeekObj?.index ?? 0;
  const activeWeekTeamTarget = camp?.teamWeeklyByWeek?.[activeWeekIndex] ?? camp?.teamWeeklyTarget ?? 0;
  const activeWeekTeamActual = (snap?.employees || []).reduce((acc, emp) => {
    const wInfo = (emp.weekly || []).find((w) => w.weekKey === activeWeekKey);
    return acc + (wInfo?.actual || 0);
  }, 0);

  return (
    <div className="feature-page anim-fadeup">
      <PageHeader
        title="Recruitment Performance"
        purpose="Team joiner target, weekly achievement, and recruitment bonuses — calculated from existing valid joiners."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="month"
              className="form-input"
              value={monthKey}
              onChange={(e) => {
                setMonthKey(e.target.value);
                setSelectedWeekKey('');
              }}
              aria-label="Campaign month"
            />
            <span className="ui-badge">{status}</span>
          </div>
        }
      />

      {error ? (
        <Card className="mb-4">
          <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</div>
        </Card>
      ) : null}

      {canManage ? (
        <Card className="mb-4">
          <div className="section-title" style={{ marginBottom: 8 }}>Assign team target</div>
          <div className="section-sub" style={{ marginBottom: 16 }}>
            Monthly target is for the selected team. Weekly and individual targets are calculated by the server.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Target month</label>
              <div className="form-input" style={{ background: 'var(--bg-raised)' }}>{monthLabel(monthKey)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly team target (joiners)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                step={1}
                value={monthlyTeamTarget}
                onChange={(e) => setMonthlyTeamTarget(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Select employees (Includes Recruiters, Admins & Finance)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {selectable.map((u) => (
                <label key={u.id} className="card" style={{ padding: 10, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleId(u.id)}
                  />
                  <span>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.role} · {u.employee_id}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            <Metric title="Selected employees" value={selectedIds.length} />
            <Metric title="Weekly periods" value={preview.weekCount} sub="Mon–Sun weeks overlapping this month (IST)" />
            <Metric
              title="Team weekly target"
              value={preview.evenTeamWeekly ? preview.typicalTeamWeekly : (preview.teamWeeklyByWeek || []).join(' / ') || '—'}
              sub="Not editable"
            />
            <Metric
              title="Individual weekly target"
              value={
                selectedIds.length === 0
                  ? '—'
                  : preview.evenIndividual
                    ? preview.typicalIndividual
                    : 'Integer split (see table after assign)'
              }
              sub="Not editable — backend remainder split"
            />
          </div>

          <button className="btn btn-dark" style={{ marginTop: 16 }} disabled={saving || selectedIds.length === 0} onClick={assign}>
            {saving ? 'Saving…' : 'Assign Target'}
          </button>
        </Card>
      ) : null}

      {!assigned && !canManage ? (
        <Card>
          <div className="section-title">Not assigned this month</div>
          <p className="section-sub">You are not a selected participant for {monthLabel(monthKey)}. Ask HR to include you if needed.</p>
        </Card>
      ) : null}

      {assigned && camp ? (
        <>
          {/* VIEW MODE TOGGLE PILLS */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-dark' : 'btn-ghost'}`}
              style={{ borderRadius: 99, padding: '7px 18px', fontWeight: 800, fontSize: 12.5 }}
            >
              📅 Week-wise View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-dark' : 'btn-ghost'}`}
              style={{ borderRadius: 99, padding: '7px 18px', fontWeight: 800, fontSize: 12.5 }}
            >
              📊 Month-wise View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-dark' : 'btn-ghost'}`}
              style={{ borderRadius: 99, padding: '7px 18px', fontWeight: 800, fontSize: 12.5 }}
            >
              📋 All Weeks Matrix
            </button>
          </div>

          {/* ─── 1. WEEK-WISE PERFORMANCE VIEW ────────────────────────── */}
          {viewMode === 'week' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {/* Week Selector Bar */}
              <Card style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>SELECT WEEK FOR {monthLabel(camp.monthKey).toUpperCase()}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {activeWeekObj?.weekKey} ({activeWeekObj?.startIso} → {activeWeekObj?.endIso})
                      {activeWeekObj?.weekKey === currentWeek?.weekKey && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 99, border: '1px solid #A7F3D0' }}>
                          ● Current Week
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {weeks.map((w, idx) => (
                      <button
                        key={w.weekKey}
                        type="button"
                        onClick={() => setSelectedWeekKey(w.weekKey)}
                        className={`btn btn-xs ${activeWeekKey === w.weekKey ? 'btn-dark' : 'btn-ghost'}`}
                        style={{ borderRadius: 8, padding: '6px 12px', fontWeight: 700 }}
                      >
                        Week {idx + 1} ({w.weekKey})
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Weekly Highlights Metrics */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Metric
                  title={`Team Target (${activeWeekObj?.weekKey})`}
                  value={activeWeekTeamTarget}
                  sub={`Target for ${activeWeekObj?.startIso} to ${activeWeekObj?.endIso}`}
                />
                <Metric
                  title="Team Joiners Achieved"
                  value={activeWeekTeamActual}
                  sub={`Progress: ${activeWeekTeamTarget > 0 ? Math.round((activeWeekTeamActual / activeWeekTeamTarget) * 100) : 0}% of target`}
                />
                {me && (
                  <Metric
                    title="Your Weekly Status"
                    value={
                      (() => {
                        const wInfo = (me.weekly || []).find((w) => w.weekKey === activeWeekKey);
                        return `${wInfo?.actual ?? 0} / ${wInfo?.target ?? 0}`;
                      })()
                    }
                    sub={
                      (() => {
                        const wInfo = (me.weekly || []).find((w) => w.weekKey === activeWeekKey);
                        return wInfo?.bonusAwarded ? `Bonus: ${formatInr(wInfo.bonusAmount)}` : wInfo?.label || 'In progress';
                      })()
                    }
                  />
                )}
                <Metric
                  title="Weekly Bonus Potential"
                  value={formatInr(5000)}
                  sub="Instant cash reward per recruiter achieving target"
                />
              </div>

              {/* Weekly Table */}
              <Card>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  Week Performance: {activeWeekObj?.weekKey}
                </div>
                <div className="section-sub" style={{ marginBottom: 14 }}>
                  Joiners recorded between {activeWeekObj?.startIso} and {activeWeekObj?.endIso} (Mon–Sun week)
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role / ID</th>
                        <th>Target</th>
                        <th>Actual Joiners</th>
                        <th>Remaining</th>
                        <th>Week Status</th>
                        <th>Weekly Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snap?.employees || []).map((e) => {
                        const wInfo = (e.weekly || []).find((w) => w.weekKey === activeWeekKey);
                        return (
                          <tr key={e.id}>
                            <td><strong>{e.name}</strong></td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.role} · {e.employee_id}</td>
                            <td>{wInfo?.target ?? '—'}</td>
                            <td><strong style={{ fontSize: 14, color: (wInfo?.actual || 0) >= (wInfo?.target || 0) ? '#059669' : '#111827' }}>{wInfo?.actual ?? 0}</strong></td>
                            <td>{wInfo?.remaining ?? 0}</td>
                            <td><Badge tone={statusTone(wInfo?.label)}>{wInfo?.label || 'Pending'}</Badge></td>
                            <td>{wInfo?.bonusAwarded || wInfo?.achieved ? <strong style={{ color: '#059669' }}>{formatInr(wInfo.bonusAmount || 5000)}</strong> : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ─── 2. MONTH-WISE PERFORMANCE VIEW ───────────────────────── */}
          {viewMode === 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Metric title="Team Monthly Target" value={camp.monthlyTeamTarget} sub={monthLabel(camp.monthKey)} />
                <Metric title="Team Monthly Joiners" value={camp.teamMonthlyJoiners} sub={`${Math.round((camp.teamMonthlyJoiners / (camp.monthlyTeamTarget || 1)) * 100)}% achieved`} />
                <Metric title="Weeks in Month" value={camp.weekCount} sub="Overlapping ISO Mon–Sun weeks" />
                <Metric
                  title="Employee of the Month (EOM)"
                  value={
                    eomWinner
                      ? `${eomWinner.name} (${eomWinner.monthlyJoiners} joiners)`
                      : camp.monthEnded
                        ? 'No Winner'
                        : 'Finalized at Month End'
                  }
                  sub={eomWinner?.bonusAmount ? `Bonus: ${formatInr(eomWinner.bonusAmount)}` : 'Requires ≥2 weekly wins'}
                />
              </div>

              <Card>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  Monthly Cumulative Performance ({monthLabel(camp.monthKey)})
                </div>
                <div className="section-sub" style={{ marginBottom: 14 }}>
                  Team Progress: {camp.teamMonthlyJoiners} of {camp.monthlyTeamTarget} joiners completed
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role / ID</th>
                        <th>Monthly Joiners</th>
                        <th>Team Contribution</th>
                        <th>Weekly Targets Won</th>
                        <th>Total Bonus Earned</th>
                        <th>EOM Eligibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snap?.employees || []).map((e) => (
                        <tr key={e.id}>
                          <td><strong>{e.name}</strong></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.role} · {e.employee_id}</td>
                          <td><strong style={{ fontSize: 15, color: '#2563EB' }}>{e.monthlyJoiners}</strong></td>
                          <td>{camp.monthlyTeamTarget > 0 ? `${Math.round((e.monthlyJoiners / camp.monthlyTeamTarget) * 100)}%` : '0%'}</td>
                          <td><strong>{e.weeklyWins}</strong> of {camp.weekCount} weeks</td>
                          <td><strong style={{ color: e.weeklyBonusTotal > 0 ? '#059669' : 'inherit' }}>{formatInr(e.weeklyBonusTotal)}</strong></td>
                          <td>
                            <Badge tone={e.eomEligible ? 'success' : 'neutral'}>
                              {e.eomEligible ? 'Eligible' : 'Not eligible'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ─── 3. ALL WEEKS MATRIX BREAKDOWN ────────────────────────── */}
          {viewMode === 'matrix' && (
            <Card style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>
                All Weeks Joiner Performance Matrix
              </div>
              <div className="section-sub" style={{ marginBottom: 14 }}>
                Direct week-by-week actual joiners vs targets for every employee in {monthLabel(camp.monthKey)}
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      {weeks.map((w, idx) => (
                        <th key={w.weekKey} style={{ textAlign: 'center' }}>
                          Week {idx + 1}
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>{w.weekKey}</div>
                        </th>
                      ))}
                      <th style={{ textAlign: 'right' }}>Total Joiners</th>
                      <th style={{ textAlign: 'right' }}>Weeks Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(snap?.employees || []).map((e) => (
                      <tr key={e.id}>
                        <td><strong>{e.name}</strong></td>
                        {(e.weekly || []).map((w) => (
                          <td key={w.weekKey} style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              background: w.achieved ? '#D1FAE5' : '#FEF3C7',
                              color: w.achieved ? '#065F46' : '#92400E'
                            }}>
                              {w.actual} / {w.target}
                            </span>
                          </td>
                        ))}
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#2563EB' }}>
                          {e.monthlyJoiners}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          {e.weeklyWins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

export const CampaignHubView = withAppPage(CampaignHubInner);
