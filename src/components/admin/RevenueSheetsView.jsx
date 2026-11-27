'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { withAppPage } from '@/components/hrms/withAppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatSheetDateDisplay } from '@/lib/candidate-dates';
import { employeeNamesMatch } from '@/lib/recruiter-names';
import {
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  ShieldAlert,
  Building2,
  Users,
  Calendar,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';

function formatInr(amount) {
  const n = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function RevenueSheetsInner({ user }) {
  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'super_admin';

  const [monthKey, setMonthKey] = useState('2026-11');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('daily_weekly'); // 'daily_weekly' | 'company_recruiter' | 'audit'
  const [dayOrder, setDayOrder] = useState('desc'); // 'desc' | 'asc'
  const [hideEmptyDays, setHideEmptyDays] = useState(false);
  const [recruiterFilter, setRecruiterFilter] = useState('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCompanyFilter, setLedgerCompanyFilter] = useState('ALL');
  const [showInactiveLedger, setShowInactiveLedger] = useState(false);

  const loadData = useCallback(
    async (targetMonth = monthKey) => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
      if (!token) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/admin/revenue-sheets?month=${encodeURIComponent(targetMonth || '')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Failed to load revenue sheets.');
        } else {
          setData(json);
          if (json.monthKey && json.monthKey !== monthKey) {
            setMonthKey(json.monthKey);
          }
        }
      } catch (err) {
        console.error('Revenue Sheets load error:', err);
        setError('Network error while loading live revenue data.');
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, monthKey]
  );

  useEffect(() => {
    // Initialize to current month if >= 2026-11, else 2026-11
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const initial = curYm >= '2026-11' ? curYm : '2026-11';
    setMonthKey(initial);
    loadData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Ordered & filtered daily sheets
  const displayedDailySheets = useMemo(() => {
    if (!data?.dailySheets) return [];
    let list = data.dailySheets.map((ds) => {
      if (recruiterFilter === 'ALL') return ds;
      const filteredRows = ds.rows.filter((r) => employeeNamesMatch(r.recruiterName, recruiterFilter));
      return {
        ...ds,
        rows: filteredRows.map((r, i) => ({ ...r, slNo: i + 1 })),
        totals: {
          walkins: filteredRows.reduce((s, r) => s + r.walkins, 0),
          selections: filteredRows.reduce((s, r) => s + r.selections, 0),
          joiners: filteredRows.reduce((s, r) => s + r.joiners, 0),
          revenue: filteredRows.reduce((s, r) => s + r.revenue, 0),
        },
      };
    });

    if (hideEmptyDays) {
      list = list.filter(
        (d) =>
          d.totals.walkins > 0 ||
          d.totals.selections > 0 ||
          d.totals.joiners > 0 ||
          d.totals.revenue > 0
      );
    }

    if (dayOrder === 'asc') {
      list = [...list].reverse();
    }
    return list;
  }, [data, dayOrder, hideEmptyDays, recruiterFilter]);

  const weeklyDisplay = useMemo(() => {
    if (!data?.weeklySummaries) return [];
    if (recruiterFilter === 'ALL') return data.weeklySummaries;

    // Recompute weekly totals for selected recruiter from daily sheets
    const revByDate = new Map();
    displayedDailySheets.forEach((ds) => revByDate.set(ds.date, ds.totals));
    return data.weeklySummaries.map((wk) => {
      const days = wk.days.map((d) => {
        const t = revByDate.get(d.date) || { walkins: 0, selections: 0, joiners: 0, revenue: 0 };
        return { ...d, ...t };
      });
      return {
        ...wk,
        days,
        totalWalkins: days.reduce((s, r) => s + r.walkins, 0),
        totalSelections: days.reduce((s, r) => s + r.selections, 0),
        totalJoiners: days.reduce((s, r) => s + r.joiners, 0),
        totalRevenue: days.reduce((s, r) => s + r.revenue, 0),
      };
    });
  }, [data, recruiterFilter, displayedDailySheets]);

  const filteredActiveLedger = useMemo(() => {
    const list = data?.activeJoinerLedger || [];
    const q = ledgerSearch.trim().toLowerCase();
    return list.filter((j) => {
      if (recruiterFilter !== 'ALL' && !employeeNamesMatch(j.recruiterName, recruiterFilter)) {
        return false;
      }
      if (ledgerCompanyFilter !== 'ALL' && j.canonicalCompany !== ledgerCompanyFilter) {
        return false;
      }
      if (!q) return true;
      return (
        j.name.toLowerCase().includes(q) ||
        j.phone.toLowerCase().includes(q) ||
        j.canonicalCompany.toLowerCase().includes(q) ||
        j.matchedProcess.toLowerCase().includes(q) ||
        j.recruiterName.toLowerCase().includes(q)
      );
    });
  }, [data, recruiterFilter, ledgerCompanyFilter, ledgerSearch]);

  const filteredInactiveLedger = useMemo(() => {
    const list = data?.inactiveJoinerLedger || [];
    const q = ledgerSearch.trim().toLowerCase();
    return list.filter((j) => {
      if (recruiterFilter !== 'ALL' && !employeeNamesMatch(j.recruiterName, recruiterFilter)) {
        return false;
      }
      if (ledgerCompanyFilter !== 'ALL' && j.canonicalCompany !== ledgerCompanyFilter) {
        return false;
      }
      if (!q) return true;
      return (
        j.name.toLowerCase().includes(q) ||
        j.phone.toLowerCase().includes(q) ||
        j.canonicalCompany.toLowerCase().includes(q) ||
        j.matchedProcess.toLowerCase().includes(q) ||
        j.recruiterName.toLowerCase().includes(q)
      );
    });
  }, [data, recruiterFilter, ledgerCompanyFilter, ledgerSearch]);

  // Excel Export matching the user's multi-section spreadsheet
  const handleExportExcel = () => {
    if (!data) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Daily Breakdown (Excel reference structure stacked by day)
      const dailySheetAoA = [];
      [...displayedDailySheets]
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((ds) => {
          dailySheetAoA.push(['S.NO', 'Date', 'Recruiter', 'Walk-ins', 'Selection', 'Joiners', 'Revenue (INR)']);
          ds.rows.forEach((r, idx) => {
            dailySheetAoA.push([
              r.slNo,
              idx === 0 ? ds.date : '',
              r.recruiterName,
              r.walkins,
              r.selections,
              r.joiners,
              r.revenue,
            ]);
          });
          dailySheetAoA.push([
            '',
            '',
            'Total',
            ds.totals.walkins,
            ds.totals.selections,
            ds.totals.joiners,
            ds.totals.revenue,
          ]);
          dailySheetAoA.push([]);
        });
      const wsDaily = XLSX.utils.aoa_to_sheet(dailySheetAoA);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Revenue Sheet');

      // Sheet 2: Weekly Summary
      const weeklyAoA = [];
      weeklyDisplay.forEach((wk) => {
        weeklyAoA.push([`Week ${wk.weekNumber} (${wk.startIso} to ${wk.endIso})`]);
        weeklyAoA.push(['S.No', 'Date', 'Walk-ins', 'Selections', 'Joiners', 'Revenue (INR)']);
        wk.days.forEach((d) => {
          weeklyAoA.push([d.slNo, d.date, d.walkins, d.selections, d.joiners, d.revenue]);
        });
        weeklyAoA.push(['', 'Weekly Total', wk.totalWalkins, wk.totalSelections, wk.totalJoiners, wk.totalRevenue]);
        weeklyAoA.push([]);
      });
      const wsWeekly = XLSX.utils.aoa_to_sheet(weeklyAoA);
      XLSX.utils.book_append_sheet(wb, wsWeekly, 'Weekly Revenue');

      // Sheet 3: Monthly Company & Recruiter Summary
      const compRows = (data.companySummary || []).map((c) => ({
        'S.No': c.slNo,
        Month: data.monthLabel,
        'Company Name': c.company,
        'Active Joiners': c.joiners,
        'Inactive Deducted': c.inactiveJoiners,
        'Revenue (INR)': c.revenue,
        'Process Mix': c.processes.map((p) => `${p.process} (${p.joiners} × ₹${p.rate})`).join(', '),
      }));
      compRows.push({
        'S.No': 'TOTAL',
        Month: data.monthLabel,
        'Company Name': 'ALL COMPANIES',
        'Active Joiners': data.totals.joiners,
        'Inactive Deducted': data.totals.inactiveJoiners,
        'Revenue (INR)': data.totals.revenue,
        'Process Mix': '',
      });
      const wsComp = XLSX.utils.json_to_sheet(compRows);
      XLSX.utils.book_append_sheet(wb, wsComp, 'Monthly Company Summary');

      const recRows = (data.recruiterSummary || []).map((r) => ({
        'S.No': r.slNo,
        Recruiter: r.recruiterName,
        'Walk-ins': r.walkins,
        Selections: r.selections,
        'Active Joiners': r.joiners,
        'Inactive Deducted': r.inactiveJoiners,
        'Revenue (INR)': r.revenue,
        'Share (%)': `${r.sharePct}%`,
      }));
      const wsRec = XLSX.utils.json_to_sheet(recRows);
      XLSX.utils.book_append_sheet(wb, wsRec, 'Recruiter Monthly Summary');

      // Sheet 4: Active Joiner Payout Ledger
      const ledgerRows = filteredActiveLedger.map((j, idx) => ({
        'S.No': idx + 1,
        DOJ: formatSheetDateDisplay(j.isoDate) || j.isoDate,
        'Candidate Name': j.name,
        Phone: j.phone,
        Recruiter: j.recruiterName,
        Company: j.canonicalCompany,
        Process: j.matchedProcess,
        'Payout Rate (INR)': j.rate,
        Source: j.source,
      }));
      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Joiner Revenue Ledger');

      XLSX.writeFile(wb, `CEGS_Revenue_Sheet_${data.monthKey}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Failed to export Excel: ' + err.message);
    }
  };

  // Printable Executive PDF Report
  const handlePrintPdf = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to print or save the Revenue Sheet PDF.');
      return;
    }
    const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>CEGS Revenue Sheet - ${data.monthLabel}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; font-size: 11px; margin: 0; padding: 0; }
          .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px; margin-bottom: 14px; }
          .hdr h1 { margin: 0; font-size: 18px; color: #1E3A8A; font-weight: 900; }
          .hdr p { margin: 2px 0 0 0; font-size: 11px; color: #475569; font-weight: 600; }
          .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
          .kpi { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; background: #F8FAFC; break-inside: avoid; page-break-inside: avoid; }
          .kpi .v { font-size: 16px; font-weight: 900; color: #0F172A; }
          .kpi .l { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-top: 2px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; break-inside: avoid; }
          h3 { font-size: 12px; margin: 0 0 6px 0; color: #1E293B; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
          th { background: #1E3A8A; color: #fff; padding: 6px 8px; text-align: left; border: 1px solid #1E3A8A; }
          td { padding: 5px 8px; border: 1px solid #E2E8F0; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          tr:nth-child(even) td { background: #F8FAFC; }
          tr.tot td { background: #EFF6FF; font-weight: 900; border-top: 2px solid #1E3A8A; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .ctr { text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="hdr">
          <div>
            <h1>CAREER EXPERTS GLOBAL SOLUTIONS — REVENUE SHEET</h1>
            <p>${data.monthLabel} · Confidential Super Admin Financial Statement (Active Joiners Only)</p>
          </div>
          <div style="text-align:right; font-size:10px; color:#475569;">
            <div><strong>Generated:</strong> ${generatedAt} IST</div>
            <div><strong>Scope:</strong> Live Data Sheet &amp; Joiner Sheet</div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi"><div class="v" style="color:#059669;">${formatInr(data.totals.revenue)}</div><div class="l">Total Monthly Revenue</div></div>
          <div class="kpi"><div class="v">${data.totals.joiners}</div><div class="l">Active Joiners (${data.totals.inactiveJoiners} dropped excl.)</div></div>
          <div class="kpi"><div class="v">${formatInr(data.totals.avgRevenuePerJoiner)}</div><div class="l">Avg Revenue / Joiner</div></div>
          <div class="kpi"><div class="v">${data.totals.walkins}</div><div class="l">Total Walk-ins</div></div>
          <div class="kpi"><div class="v">${data.totals.selections}</div><div class="l">Total Selections</div></div>
        </div>

        <div class="grid2">
          <div>
            <h3>1. Company-Wise Revenue (${data.monthLabel})</h3>
            <table>
              <thead><tr><th>S.No</th><th>Company</th><th class="ctr">Joiners</th><th class="num">Revenue</th></tr></thead>
              <tbody>
                ${(data.companySummary || [])
                  .map(
                    (c) => `<tr><td>${c.slNo}</td><td style="font-weight:700;">${c.company}</td><td class="ctr">${c.joiners}</td><td class="num" style="font-weight:700;color:#059669;">${formatInr(c.revenue)}</td></tr>`
                  )
                  .join('')}
                <tr class="tot"><td colspan="2">TOTAL</td><td class="ctr">${data.totals.joiners}</td><td class="num">${formatInr(data.totals.revenue)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3>2. Recruiter-Wise Revenue (${data.monthLabel})</h3>
            <table>
              <thead><tr><th>S.No</th><th>Recruiter</th><th class="ctr">Walk-ins</th><th class="ctr">Sel</th><th class="ctr">Joiners</th><th class="num">Revenue</th></tr></thead>
              <tbody>
                ${(data.recruiterSummary || [])
                  .map(
                    (r) => `<tr><td>${r.slNo}</td><td style="font-weight:700;">${r.recruiterName}</td><td class="ctr">${r.walkins}</td><td class="ctr">${r.selections}</td><td class="ctr">${r.joiners}</td><td class="num" style="font-weight:700;color:#059669;">${formatInr(r.revenue)}</td></tr>`
                  )
                  .join('')}
                <tr class="tot"><td colspan="2">TOTAL</td><td class="ctr">${data.totals.walkins}</td><td class="ctr">${data.totals.selections}</td><td class="ctr">${data.totals.joiners}</td><td class="num">${formatInr(data.totals.revenue)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3>3. Weekly Revenue Summary (${data.monthLabel})</h3>
        <table>
          <thead><tr><th>Week</th><th>Date Range</th><th class="ctr">Walk-ins</th><th class="ctr">Selections</th><th class="ctr">Active Joiners</th><th class="num">Weekly Revenue</th></tr></thead>
          <tbody>
            ${weeklyDisplay
              .map(
                (w) => `<tr><td style="font-weight:700;">Week ${w.weekNumber}</td><td>${formatSheetDateDisplay(w.startIso)} – ${formatSheetDateDisplay(w.endIso)}</td><td class="ctr">${w.totalWalkins}</td><td class="ctr">${w.totalSelections}</td><td class="ctr">${w.totalJoiners}</td><td class="num" style="font-weight:800;color:#059669;">${formatInr(w.totalRevenue)}</td></tr>`
              )
              .join('')}
            <tr class="tot"><td colspan="2">MONTH TOTAL</td><td class="ctr">${data.totals.walkins}</td><td class="ctr">${data.totals.selections}</td><td class="ctr">${data.totals.joiners}</td><td class="num">${formatInr(data.totals.revenue)}</td></tr>
          </tbody>
        </table>
        <script>window.onload = function(){ window.print(); };</script>
      </body>
      </html>
    `;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (!isSuperAdmin) {
    return (
      <div className="feature-page anim-fadeup" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            background: '#fff',
            padding: '36px 28px',
            borderRadius: 20,
            border: '1px solid #FECACA',
            boxShadow: '0 8px 24px rgba(220,38,38,0.08)',
          }}
        >
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: 99, background: '#FEF2F2', color: '#DC2626', marginBottom: 14 }}>
            <ShieldAlert size={34} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Super Admin Access Only
          </h2>
          <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
            Revenue Sheets contain confidential company &amp; process payout analytics and are strictly restricted to Super Admin accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-page anim-fadeup" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader
        title="Revenue Sheets"
        purpose="Live daily, weekly, and monthly revenue calculated automatically from Data Sheet & active Joiner Sheet (November 2026 onwards)."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <select
              className="form-input filter-control"
              value={monthKey}
              onChange={(e) => {
                setMonthKey(e.target.value);
                loadData(e.target.value);
              }}
              style={{
                borderRadius: 99,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 800,
                background: '#EFF6FF',
                borderColor: '#2563EB',
                color: '#1D4ED8',
                cursor: 'pointer',
              }}
              aria-label="Select month"
            >
              {(data?.availableMonths?.length ? data.availableMonths : [{ key: '2026-11', label: 'November 2026' }]).map(
                (m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-export-stretch"
              onClick={() => loadData(monthKey)}
              disabled={loading}
              style={{ borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-success-solid btn-export-stretch"
              onClick={handleExportExcel}
              disabled={loading || !data}
              style={{
                borderRadius: 99,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#fff',
                border: 'none',
                cursor: loading || !data ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(16,185,129,0.28)',
              }}
            >
              <Download size={14} />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              className="btn btn-export-stretch"
              onClick={handlePrintPdf}
              disabled={loading || !data}
              style={{
                borderRadius: 99,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                color: '#fff',
                border: 'none',
                cursor: loading || !data ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(37,99,235,0.28)',
              }}
            >
              <Printer size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="r-kpi-4">
        <div
          className="glass-card"
          style={{
            borderRadius: 18,
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1px solid #A7F3D0',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Monthly Revenue ({data?.monthLabel || 'Nov 2026'})
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#064E3B', marginTop: 4 }}>
            {loading ? '—' : formatInr(data?.totals?.revenue || 0)}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', marginTop: 4 }}>
            Active joiners payout total
          </div>
        </div>

        <div className="glass-card" style={{ borderRadius: 18, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Joiners
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {loading ? '—' : data?.totals?.joiners ?? 0}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: data?.totals?.inactiveJoiners ? '#DC2626' : '#64748B', marginTop: 4 }}>
            {data?.totals?.inactiveJoiners || 0} inactive/dropped deducted
          </div>
        </div>

        <div className="glass-card" style={{ borderRadius: 18, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Avg Revenue / Joiner
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1E3A8A', marginTop: 4 }}>
            {loading ? '—' : formatInr(data?.totals?.avgRevenuePerJoiner || 0)}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginTop: 4 }}>
            Across {data?.companySummary?.length || 0} client companies
          </div>
        </div>

        <div className="glass-card" style={{ borderRadius: 18, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Walk-ins &amp; Selections
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {loading ? '—' : `${data?.totals?.walkins ?? 0} / ${data?.totals?.selections ?? 0}`}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginTop: 4 }}>
            Over {data?.totals?.workingDays || 0} working days
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs + Filters */}
      <div
        className="glass-card"
        style={{
          borderRadius: 18,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'daily_weekly', label: 'Daily & Weekly Sheet', icon: Calendar },
            { id: 'company_recruiter', label: 'Company & Recruiter Summary', icon: Building2 },
            { id: 'audit', label: `Joiner Payout Ledger (${data?.totals?.joiners ?? 0})`, icon: FileSpreadsheet },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  borderRadius: 99,
                  padding: '8px 16px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  border: active ? '2px solid #1E40AF' : '1px solid #E2E8F0',
                  background: active ? '#1E40AF' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-input filter-control"
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            style={{ borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 40 }}
            aria-label="Filter by recruiter"
          >
            <option value="ALL">All Recruiters</option>
            {(data?.recruiterSummary || []).map((r) => (
              <option key={r.recruiterName} value={r.recruiterName}>
                {r.recruiterName}
              </option>
            ))}
          </select>

          {activeTab === 'daily_weekly' && (
            <>
              <button
                type="button"
                onClick={() => setDayOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                style={{
                  borderRadius: 99,
                  minHeight: 40,
                  padding: '6px 14px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Order: {dayOrder === 'desc' ? 'Latest First' : '1st → End'}
              </button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hideEmptyDays}
                  onChange={(e) => setHideEmptyDays(e.target.checked)}
                />
                Hide 0-activity days
              </label>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ borderRadius: 20, padding: 48, textAlign: 'center', color: '#64748B', fontWeight: 700 }}>
          Calculating live daily, weekly &amp; company revenue for {monthKey}...
        </div>
      ) : activeTab === 'daily_weekly' ? (
        /* TAB 1: DAILY & WEEKLY SHEETS SIDE BY SIDE (MATCHING EXCEL REFERENCE) */
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          {/* Left: Day-by-Day Tables */}
          <div style={{ flex: '2 1 580px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayedDailySheets.length === 0 ? (
              <div className="glass-card" style={{ borderRadius: 18, padding: 36, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                No working days with records found for {data?.monthLabel}.
              </div>
            ) : (
              displayedDailySheets.map((ds) => (
                <div
                  key={ds.date}
                  className="glass-card glass-card-flush"
                  style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #E2E8F0', padding: 0 }}
                >
                  <div
                    style={{
                      background: '#F8FAFC',
                      padding: '10px 16px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13.5, color: '#1E3A8A' }}>
                      {formatSheetDateDisplay(ds.date) || ds.date}
                      <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 700, marginLeft: 8 }}>
                        ({ds.date})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11.5, fontWeight: 800 }}>
                      <span style={{ color: '#475569' }}>Walk-ins: {ds.totals.walkins}</span>
                      <span style={{ color: '#7C3AED' }}>Selection: {ds.totals.selections}</span>
                      <span style={{ color: '#2563EB' }}>Joiners: {ds.totals.joiners}</span>
                      <span style={{ color: '#059669' }}>Revenue: {formatInr(ds.totals.revenue)}</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#1E40AF', color: '#FFFFFF', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', width: 54 }}>S.NO</th>
                          <th style={{ padding: '8px 10px', width: 100 }}>Date</th>
                          <th style={{ padding: '8px 10px' }}>Recruiter</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>Walk-ins</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: 84 }}>Selection</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: 76 }}>Joiners</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', width: 120 }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ds.rows.map((r, idx) => (
                          <tr
                            key={r.recruiterName}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              background: r.revenue > 0 ? 'rgba(236, 253, 245, 0.35)' : idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                            }}
                          >
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: '#64748B' }}>{r.slNo}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: '#334155' }}>
                              {idx === 0 ? ds.date : ''}
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0F172A' }}>{r.recruiterName}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: r.walkins ? '#0F172A' : '#94A3B8' }}>
                              {r.walkins}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: r.selections ? '#6D28D9' : '#94A3B8' }}>
                              {r.selections}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 800, color: r.joiners ? '#2563EB' : '#94A3B8' }}>
                              {r.joiners}
                            </td>
                            <td
                              style={{
                                padding: '7px 10px',
                                textAlign: 'right',
                                fontWeight: r.revenue > 0 ? 800 : 600,
                                color: r.revenue > 0 ? '#059669' : '#94A3B8',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {r.revenue > 0 ? formatInr(r.revenue) : '₹0'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#EFF6FF', borderTop: '2px solid #93C5FD', fontWeight: 900 }}>
                          <td colSpan={3} style={{ padding: '8px 10px', color: '#1E3A8A' }}>
                            Total
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1E3A8A' }}>{ds.totals.walkins}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1E3A8A' }}>{ds.totals.selections}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1E3A8A' }}>{ds.totals.joiners}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                            {formatInr(ds.totals.revenue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Weekly Revenue Cards + Company Quick Summary */}
          <div className="revenue-sticky-sidebar" style={{ flex: '1 1 310px', minWidth: 'min(100%, 280px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="glass-card" style={{ borderRadius: 18, padding: 16, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                Weekly Revenue Rollup ({data?.monthLabel})
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                {formatInr(weeklyDisplay.reduce((s, w) => s + w.totalRevenue, 0))}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                Sum of {weeklyDisplay.length} Mon–Sat weeks · {weeklyDisplay.reduce((s, w) => s + w.totalJoiners, 0)} joiners
              </div>
            </div>

            {weeklyDisplay.map((wk) => (
              <div
                key={wk.weekKey}
                className="glass-card glass-card-flush"
                style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #E2E8F0', padding: 0 }}
              >
                <div
                  style={{
                    background: '#1E3A8A',
                    color: '#FFFFFF',
                    padding: '9px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>Weekly Revenue · Wk {wk.weekNumber}</span>
                  <span style={{ color: '#A7F3D0' }}>{formatInr(wk.totalRevenue)}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>S.no</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Jnd</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wk.days.map((d) => (
                      <tr key={d.date} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#64748B' }}>{d.slNo}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0F172A' }}>{d.date}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: d.joiners ? '#2563EB' : '#94A3B8' }}>
                          {d.joiners}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            textAlign: 'right',
                            fontWeight: d.revenue > 0 ? 800 : 600,
                            color: d.revenue > 0 ? '#059669' : '#94A3B8',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatInr(d.revenue)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#EFF6FF', borderTop: '2px solid #93C5FD', fontWeight: 900 }}>
                      <td colSpan={2} style={{ padding: '7px 10px', color: '#1E3A8A' }}>
                        Total
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#1E3A8A' }}>{wk.totalJoiners}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                        {formatInr(wk.totalRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'company_recruiter' ? (
        /* TAB 2: COMPANY-WISE & RECRUITER-WISE MONTHLY SUMMARY */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16, alignItems: 'start' }}>
          {/* Company-Wise Monthly Table */}
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} style={{ color: '#2563EB' }} />
                  <span>Company-Wise Monthly Revenue ({data?.monthLabel})</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                  Payout computed by exact client company &amp; process slab rates (active joiners only).
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#1E40AF', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '9px 10px' }}>S.NO</th>
                    <th style={{ padding: '9px 10px' }}>Company Name &amp; Process Mix</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Active Joiners</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.companySummary || []).map((c) => (
                    <tr key={c.company} style={{ borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#64748B' }}>{c.slNo}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13 }}>{c.company}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                          {c.processes.map((p) => (
                            <span
                              key={`${p.process}-${p.rate}`}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: '#F1F5F9',
                                color: '#334155',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              {p.process}: {p.joiners} × {formatInr(p.rate)} = {formatInr(p.revenue)}
                            </span>
                          ))}
                          {c.inactiveJoiners > 0 && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                              }}
                            >
                              {c.inactiveJoiners} dropped/inactive excluded
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#2563EB', fontSize: 13.5 }}>
                        {c.joiners}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                        {formatInr(c.revenue)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#EFF6FF', borderTop: '2px solid #1E3A8A', fontWeight: 900 }}>
                    <td colSpan={2} style={{ padding: '10px', color: '#1E3A8A' }}>
                      Total ({data?.monthLabel})
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#1E3A8A', fontSize: 14 }}>
                      {data?.totals?.joiners ?? 0}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#065F46', fontSize: 14.5, fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totals?.revenue || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recruiter-Wise Monthly Table */}
          <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: '#059669' }} />
                <span>Recruiter-Wise Monthly Revenue ({data?.monthLabel})</span>
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                Total Walk-ins, Selections, Active Joiners, and Generated Revenue per recruiter.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#1E40AF', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '9px 10px' }}>S.NO</th>
                    <th style={{ padding: '9px 10px' }}>Recruiter</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Walk-ins</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Sel</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Joiners</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Revenue</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recruiterSummary || []).map((r) => (
                    <tr key={r.recruiterName} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#64748B' }}>{r.slNo}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{r.recruiterName}</div>
                        {r.inactiveJoiners > 0 && (
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#DC2626' }}>
                            {r.inactiveJoiners} dropped excluded
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>{r.walkins}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#6D28D9' }}>{r.selections}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: '#2563EB' }}>{r.joiners}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                        {formatInr(r.revenue)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 800,
                            background: r.sharePct > 0 ? '#EFF6FF' : '#F1F5F9',
                            color: r.sharePct > 0 ? '#1D4ED8' : '#64748B',
                          }}
                        >
                          {r.sharePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#EFF6FF', borderTop: '2px solid #1E3A8A', fontWeight: 900 }}>
                    <td colSpan={2} style={{ padding: '10px', color: '#1E3A8A' }}>
                      Total
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#1E3A8A' }}>{data?.totals?.walkins ?? 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#1E3A8A' }}>{data?.totals?.selections ?? 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#1E3A8A' }}>{data?.totals?.joiners ?? 0}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totals?.revenue || 0)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#1E3A8A' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: JOINER PAYOUT AUDIT LEDGER */
        <div className="glass-card" style={{ borderRadius: 20, padding: 20, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} style={{ color: '#2563EB' }} />
                <span>Joiner-Level Payout Audit Ledger ({data?.monthLabel})</span>
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                Line-by-line verification of every active joiner and the company/process rate applied.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-input filter-control"
                value={ledgerCompanyFilter}
                onChange={(e) => setLedgerCompanyFilter(e.target.value)}
                style={{ borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 40 }}
              >
                <option value="ALL">All Companies</option>
                {(data?.companySummary || []).map((c) => (
                  <option key={c.company} value={c.company}>
                    {c.company} ({c.joiners})
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', maxWidth: '100%', flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, color: '#94A3B8' }} />
                <input
                  className="form-input"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search candidate, process..."
                  style={{ borderRadius: 99, padding: '6px 12px 6px 30px', fontSize: 12, width: '100%', minWidth: 180, maxWidth: 260, minHeight: 40 }}
                />
              </div>

              {(data?.inactiveJoinerLedger?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInactiveLedger((v) => !v)}
                  style={{
                    borderRadius: 99,
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: 800,
                    background: showInactiveLedger ? '#FEE2E2' : '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    cursor: 'pointer',
                  }}
                >
                  {showInactiveLedger ? 'Hide' : 'View'} Excluded Inactive ({data.inactiveJoinerLedger.length})
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1E40AF', color: '#FFFFFF', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>S.NO</th>
                  <th style={{ padding: '8px 10px' }}>DOJ</th>
                  <th style={{ padding: '8px 10px' }}>Candidate Name</th>
                  <th style={{ padding: '8px 10px' }}>Recruiter</th>
                  <th style={{ padding: '8px 10px' }}>Company</th>
                  <th style={{ padding: '8px 10px' }}>Process</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Applied Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveLedger.map((j, idx) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                      {formatSheetDateDisplay(j.isoDate) || j.isoDate}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{j.name}</div>
                      {j.phone && <div style={{ fontSize: 10.5, color: '#64748B' }}>{j.phone}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1E293B' }}>{j.recruiterName}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1E40AF' }}>{j.canonicalCompany}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#334155' }}>
                      {j.matchedProcess}
                      {j.rawProcess && j.matchedProcess.toLowerCase() !== j.rawProcess.toLowerCase() && (
                        <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 5 }}>({j.rawProcess})</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(j.rate)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#ECFDF5',
                          color: '#065F46',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      >
                        <CheckCircle2 size={11} /> Active
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#EFF6FF', borderTop: '2px solid #1E3A8A', fontWeight: 900 }}>
                  <td colSpan={6} style={{ padding: '9px 10px', color: '#1E3A8A' }}>
                    Filtered Active Joiners ({filteredActiveLedger.length})
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                    {formatInr(filteredActiveLedger.reduce((s, j) => s + j.rate, 0))}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {showInactiveLedger && filteredInactiveLedger.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '2px dashed #FECACA' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 800, color: '#991B1B' }}>
                Excluded Inactive / Dropped Joiners (Deducted from Revenue)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#FEE2E2', color: '#991B1B', textAlign: 'left' }}>
                      <th style={{ padding: '7px 10px' }}>DOJ</th>
                      <th style={{ padding: '7px 10px' }}>Candidate Name</th>
                      <th style={{ padding: '7px 10px' }}>Recruiter</th>
                      <th style={{ padding: '7px 10px' }}>Company / Process</th>
                      <th style={{ padding: '7px 10px' }}>Follow-up Reason</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Deducted Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInactiveLedger.map((j) => (
                      <tr key={j.id} style={{ borderBottom: '1px solid #FEE2E2', background: '#FEF2F2' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#991B1B' }}>
                          {formatSheetDateDisplay(j.isoDate) || j.isoDate}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 800, color: '#7F1D1D' }}>{j.name}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#7F1D1D' }}>{j.recruiterName}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#991B1B' }}>
                          {j.canonicalCompany} · {j.matchedProcess}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#DC2626' }}>{j.inactiveReason}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#DC2626', textDecoration: 'line-through' }}>
                          {formatInr(j.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const RevenueSheetsView = withAppPage(RevenueSheetsInner);
