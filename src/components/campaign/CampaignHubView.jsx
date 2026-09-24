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

  return (
    <div className="feature-page anim-fadeup">
      <PageHeader
        title="Recruitment Performance"
        purpose="Team joiner target, weekly achievement, and recruitment bonuses — calculated from existing valid joiners."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="month"
              className="form-input"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
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
            <label className="form-label">Select employees</label>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Metric title="Team monthly target" value={camp.monthlyTeamTarget} sub={monthLabel(camp.monthKey)} />
            <Metric title="Team weekly target" value={camp.teamWeeklyTarget} sub={camp.currentWeek ? camp.currentWeek.weekKey : ''} />
            {me ? <Metric title="Your weekly target" value={me.thisWeek?.target ?? '—'} /> : null}
            <Metric title="Current week" value={camp.currentWeek?.weekKey || '—'} sub={camp.currentWeek ? `${camp.currentWeek.startIso} → ${camp.currentWeek.endIso}` : ''} />
          </div>

          {me ? (
            <Card className="mb-4">
              <div className="section-title" style={{ marginBottom: 12 }}>Your week</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Metric title="This week's joiners" value={`${me.thisWeek?.actual ?? 0} / ${me.thisWeek?.target ?? 0}`} />
                <Metric title="This week's status" value={me.thisWeek?.label || '—'} sub={me.thisWeek?.bonusAwarded ? formatInr(me.thisWeek.bonusAmount) : 'No bonus yet'} />
                <Metric title="This month's joiners" value={me.monthlyJoiners} />
                <Metric title="Monthly progress" value={`${me.monthlyJoiners} / ${camp.monthlyTeamTarget}`} sub="Your joiners vs team monthly target" />
                <Metric title="Weekly targets completed" value={`${me.weeklyWins} / ${camp.weekCount}`} />
              </div>
            </Card>
          ) : null}

          {canManage ? (
            <Card>
              <div className="section-title" style={{ marginBottom: 8 }}>Team performance</div>
              <div className="section-sub" style={{ marginBottom: 12 }}>
                Team this month: {camp.teamMonthlyJoiners} / {camp.monthlyTeamTarget}
                {camp.monthEnded && eomWinner
                  ? ` · Employee of the Month: ${eomWinner.name}${eomWinner.awarded ? ` (${formatInr(eomWinner.bonusAmount)})` : ''}`
                  : camp.monthEnded
                    ? ' · No Employee of the Month (eligibility not met)'
                    : ' · Employee of the Month is finalized after the month ends'}
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Weekly target</th>
                      <th>This week</th>
                      <th>Weekly status</th>
                      <th>Monthly joiners</th>
                      <th>Weekly targets completed</th>
                      <th>Weekly bonus</th>
                      <th>EOM eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(snap?.employees || []).map((e) => (
                      <tr key={e.id}>
                        <td><strong>{e.name}</strong></td>
                        <td>{e.thisWeek?.target ?? '—'}</td>
                        <td>{e.thisWeek?.actual ?? 0}</td>
                        <td><Badge tone={statusTone(e.thisWeek?.label)}>{e.thisWeek?.label}</Badge></td>
                        <td>{e.monthlyJoiners}</td>
                        <td>{e.weeklyWins}</td>
                        <td>{e.thisWeek?.bonusAwarded ? formatInr(e.thisWeek.bonusAmount) : '—'}</td>
                        <td>{e.eomEligible ? 'Eligible' : 'Not eligible'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export const CampaignHubView = withAppPage(CampaignHubInner);
