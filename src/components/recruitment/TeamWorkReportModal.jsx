'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { normalizeCandidateDate, todayIsoDate, formatSheetDateDisplay } from '@/lib/candidate-dates';
import { employeeNamesMatch } from '@/lib/recruiter-names';

export function TeamWorkReportModal({
  isOpen,
  onClose,
  user,
  db,
  candidates: currentDayCandidates = [],
  employeeList = [],
  isSA = false,
  isHR = false,
  isFinance = false,
}) {
  // Default date range: 10 days span (e.g. Oct 10 to Oct 20, or last 10 days up to today)
  const today = todayIsoDate();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 9);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => today);
  const [selectedRecruiter, setSelectedRecruiter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [rangeCandidates, setRangeCandidates] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // Fetch all candidate records in the specified date range from MongoDB Atlas
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchRange = async () => {
      setLoading(true);
      setFetchError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;

      try {
        const url = `/api/candidates?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(url, { headers });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setRangeCandidates(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Range fetch fallback:', err);
      }

      // Fallback: Filter candidates available in memory/local
      if (!cancelled) {
        const filtered = (currentDayCandidates || []).filter((c) => {
          const cDate = normalizeCandidateDate(c.date || c.createdAt);
          if (!cDate) return true;
          return cDate >= fromDate && cDate <= toDate;
        });
        setRangeCandidates(filtered);
        setLoading(false);
      }
    };

    fetchRange();
    return () => {
      cancelled = true;
    };
  }, [isOpen, fromDate, toDate, currentDayCandidates]);

  // Quick Presets
  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const d = todayIsoDate();
      setFromDate(d);
      setToDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const iso = y.toISOString().slice(0, 10);
      setFromDate(iso);
      setToDate(iso);
    } else if (preset === 'last7') {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      setFromDate(s.toISOString().slice(0, 10));
      setToDate(todayIsoDate());
    } else if (preset === 'last30') {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      setFromDate(s.toISOString().slice(0, 10));
      setToDate(todayIsoDate());
    } else if (preset === 'octExample') {
      const year = new Date().getFullYear();
      setFromDate(`${year}-10-10`);
      setToDate(`${year}-10-20`);
    } else if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(start.toISOString().slice(0, 10));
      setToDate(todayIsoDate());
    } else if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(start.toISOString().slice(0, 10));
      setToDate(end.toISOString().slice(0, 10));
    }
  };

  // Helper: Categorize tasks matching the 5 performance tasks
  const candidateMatches = (cand, task) => {
    if (task === 'calls') {
      const status = (cand.callStatus || '').trim().toLowerCase();
      return status === 'connected' || status.includes('connect');
    }
    const text = `${cand.response || ''} ${cand.followUp1 || ''} ${cand.followUp2 || ''} ${cand.followUp3 || ''}`.toLowerCase();
    if (task === 'interviews') return text.includes('interview') || text.includes('scheduled') || /\bschedule\b/.test(text);
    if (task === 'walkins') return /walk\s*-?\s*in/.test(text) || text.includes('walkin') || text.includes('visited');
    if (task === 'selected') return text.includes('selected') || text.includes('hired');
    if (task === 'joined') return text.includes('joined') || text.includes('joining') || String(cand.category || '').toLowerCase() === 'joined';
    return false;
  };

  // Build aggregate summary per recruiter over the date range
  const teamReportData = useMemo(() => {
    const list = selectedRecruiter === 'ALL'
      ? employeeList
      : employeeList.filter((e) => employeeNamesMatch(e, selectedRecruiter));

    // Map each recruiter with stats
    const rows = list.map((empName, index) => {
      const empCands = rangeCandidates.filter((c) => employeeNamesMatch(c.employee, empName));

      // Aggregate calls, interviews, walkins, selections, joinings
      const calls = empCands.filter((c) => candidateMatches(c, 'calls')).length;
      const itvs = empCands.filter((c) => candidateMatches(c, 'interviews')).length;
      const walks = empCands.filter((c) => candidateMatches(c, 'walkins')).length;
      const sels = empCands.filter((c) => candidateMatches(c, 'selected')).length;
      const jnds = empCands.filter((c) => candidateMatches(c, 'joined')).length;

      // Group by distinct active days to calculate daily targets & average achievement
      const activeDates = new Set(
        empCands
          .map((c) => normalizeCandidateDate(c.date || c.createdAt))
          .filter(Boolean)
      );
      const activeDaysCount = Math.max(1, activeDates.size);

      // Standard recruiter daily targets: 80 calls, 15 itvs, 5 walks, 3 sels, 1 join
      const callsTarget = 80 * activeDaysCount;
      const itvsTarget = 15 * activeDaysCount;
      const walksTarget = 5 * activeDaysCount;
      const selsTarget = 3 * activeDaysCount;
      const jndsTarget = 1 * activeDaysCount;

      const cS = Math.min(20, Math.round((calls / callsTarget) * 20));
      const iS = Math.min(20, Math.round((itvs / itvsTarget) * 20));
      const wS = Math.min(20, Math.round((walks / walksTarget) * 20));
      const sS = Math.min(20, Math.round((sels / selsTarget) * 20));
      const jS = Math.min(20, Math.round((jnds / jndsTarget) * 20));
      const score = cS + iS + wS + sS + jS;

      let status = 'Done (>=60%)';
      let statusColor = '#059669';
      if (score < 40) {
        status = 'Half-Day Absent Risk (<40%)';
        statusColor = '#DC2626';
      } else if (score < 60) {
        status = 'At Risk (40-59%)';
        statusColor = '#D97706';
      }

      return {
        slNo: index + 1,
        name: empName,
        activeDays: activeDaysCount,
        totalEntries: empCands.length,
        calls,
        callsTarget,
        itvs,
        itvsTarget,
        walks,
        walksTarget,
        sels,
        selsTarget,
        jnds,
        jndsTarget,
        score,
        status,
        statusColor,
      };
    });

    // Calculate totals across whole team
    const totalCalls = rows.reduce((acc, r) => acc + r.calls, 0);
    const totalItvs = rows.reduce((acc, r) => acc + r.itvs, 0);
    const totalWalks = rows.reduce((acc, r) => acc + r.walks, 0);
    const totalSels = rows.reduce((acc, r) => acc + r.sels, 0);
    const totalJnds = rows.reduce((acc, r) => acc + r.jnds, 0);
    const totalCandidatesLogged = rangeCandidates.length;
    const avgScore = rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + r.score, 0) / rows.length) : 0;

    return {
      rows,
      totals: {
        calls: totalCalls,
        itvs: totalItvs,
        walks: totalWalks,
        sels: totalSels,
        jnds: totalJnds,
        candidates: totalCandidatesLogged,
        avgScore,
        recruitersCount: rows.length,
      },
    };
  }, [employeeList, selectedRecruiter, rangeCandidates]);

  // Date-wise breakdown (each day in the range)
  const dailyDateBreakdown = useMemo(() => {
    const datesMap = new Map();

    rangeCandidates.forEach((cand) => {
      const d = normalizeCandidateDate(cand.date || cand.createdAt) || 'Unknown';
      if (!datesMap.has(d)) {
        datesMap.set(d, {
          date: d,
          calls: 0,
          itvs: 0,
          walks: 0,
          sels: 0,
          jnds: 0,
          total: 0,
          recruiters: new Set(),
        });
      }
      const dayObj = datesMap.get(d);
      dayObj.total++;
      if (cand.employee) dayObj.recruiters.add(cand.employee);
      if (candidateMatches(cand, 'calls')) dayObj.calls++;
      if (candidateMatches(cand, 'interviews')) dayObj.itvs++;
      if (candidateMatches(cand, 'walkins')) dayObj.walks++;
      if (candidateMatches(cand, 'selected')) dayObj.sels++;
      if (candidateMatches(cand, 'joined')) dayObj.jnds++;
    });

    return Array.from(datesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        recruitersActive: item.recruiters.size,
      }));
  }, [rangeCandidates]);

  // Action: Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Team Performance Summary
      const summaryRows = teamReportData.rows.map((r) => ({
        'SL No': r.slNo,
        'Recruiter Name': r.name,
        'Active Days': r.activeDays,
        'Calls Made': r.calls,
        'Calls Target': r.callsTarget,
        'Interviews Scheduled': r.itvs,
        'Interviews Target': r.itvsTarget,
        'Walk-ins Today': r.walks,
        'Walk-ins Target': r.walksTarget,
        'Selected Today': r.sels,
        'Selected Target': r.selsTarget,
        'Joined Today': r.jnds,
        'Joined Target': r.jndsTarget,
        'Performance Score (%)': `${r.score}%`,
        'Performance Status': r.status,
      }));

      // Append Total Row
      summaryRows.push({
        'SL No': 'TOTAL',
        'Recruiter Name': `Whole Team (${teamReportData.totals.recruitersCount} Recruiters)`,
        'Active Days': '-',
        'Calls Made': teamReportData.totals.calls,
        'Calls Target': '-',
        'Interviews Scheduled': teamReportData.totals.itvs,
        'Interviews Target': '-',
        'Walk-ins Today': teamReportData.totals.walks,
        'Walk-ins Target': '-',
        'Selected Today': teamReportData.totals.sels,
        'Selected Target': '-',
        'Joined Today': teamReportData.totals.jnds,
        'Joined Target': '-',
        'Performance Score (%)': `${teamReportData.totals.avgScore}% Avg`,
        'Performance Status': teamReportData.totals.avgScore >= 60 ? 'Target Achieved' : 'Review Required',
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Team Performance Summary');

      // Sheet 2: Date-wise Daily Totals
      const dailyRows = dailyDateBreakdown.map((d) => ({
        'Date': formatSheetDateDisplay(d.date) || d.date,
        'Active Recruiters': d.recruitersActive,
        'Calls Made': d.calls,
        'Interviews Scheduled': d.itvs,
        'Walk-ins': d.walks,
        'Selected': d.sels,
        'Joined': d.jnds,
        'Total Candidates Logged': d.total,
      }));
      const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Date-Wise Log');

      // Sheet 3: Candidate Master Intake Register
      const candidateRows = rangeCandidates.map((c, i) => ({
        'SL No': i + 1,
        'Date': c.date || normalizeCandidateDate(c.createdAt),
        'Time': c.time || '',
        'Recruiter': c.employee || 'Unassigned',
        'Candidate Name': c.name || '',
        'Phone Number': c.number || '',
        'Languages': c.languages || '',
        'Qualification': c.qualification || '',
        'Company': c.company || '',
        'Call Status': c.callStatus || '',
        'Response / Remarks': c.response || '',
        'Follow-up 1': c.followUp1 || '',
        'Follow-up 2': c.followUp2 || '',
        'Follow-up 3': c.followUp3 || '',
        'Category': c.category || '',
      }));
      const wsCandidates = XLSX.utils.json_to_sheet(candidateRows);
      XLSX.utils.book_append_sheet(wb, wsCandidates, 'Candidate Master Register');

      // Filename
      const fileName = `CEGS_Team_Performance_Report_${fromDate}_to_${toDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Error generating Excel file: ' + err.message);
    }
  };

  // Action: Export & Print PDF Report
  const handleExportPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to open and print the PDF report.');
        return;
      }

      const generatedOn = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>CEGS Whole Team Performance Report (${fromDate} to ${toDate})</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1E3A8A;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .logo-title-group h1 {
              font-size: 18px;
              font-weight: 900;
              color: #1E3A8A;
              margin: 0 0 2px 0;
              letter-spacing: -0.3px;
            }
            .logo-title-group .sub {
              font-size: 11px;
              color: #4B5563;
              font-weight: 600;
              margin: 0;
            }
            .meta-box {
              text-align: right;
              font-size: 10px;
              color: #4B5563;
              line-height: 1.4;
            }
            .meta-box strong {
              color: #111827;
            }
            .badge {
              display: inline-block;
              background: #EFF6FF;
              color: #1E3A8A;
              border: 1px solid #BFDBFE;
              border-radius: 99px;
              padding: 2px 10px;
              font-weight: 800;
              font-size: 9.5px;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 8px;
              margin-bottom: 16px;
            }
            .kpi-card {
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 8px 10px;
              text-align: center;
            }
            .kpi-card .val {
              font-size: 16px;
              font-weight: 900;
              color: #111827;
            }
            .kpi-card .lbl {
              font-size: 9px;
              color: #6B7280;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              font-size: 10px;
            }
            th {
              background: #1E3A8A;
              color: #FFFFFF;
              font-weight: 800;
              text-align: left;
              padding: 6px 8px;
              border: 1px solid #1E3A8A;
            }
            td {
              padding: 5px 8px;
              border: 1px solid #E5E7EB;
            }
            tr:nth-child(even) {
              background: #F9FAFB;
            }
            tr.total-row {
              background: #EFF6FF;
              font-weight: 900;
              border-top: 2px solid #1E3A8A;
            }
            .status-done {
              background: #ECFDF5;
              color: #065F46;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .status-risk {
              background: #FEF3C7;
              color: #92400E;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .status-danger {
              background: #FEE2E2;
              color: #991B1B;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #E5E7EB;
              font-size: 9px;
              color: #6B7280;
            }
            .sign-box {
              text-align: center;
              width: 180px;
              border-top: 1px dashed #9CA3AF;
              padding-top: 6px;
              font-weight: 700;
              color: #374151;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-title-group">
              <h1>CAREER EXPERTS GLOBAL SOLUTIONS (CEGS)</h1>
              <div class="sub">Recruiter &amp; Staff Whole Team Performance Audit Report</div>
              <span class="badge">Scope: ${selectedRecruiter === 'ALL' ? 'Entire Team Overview' : selectedRecruiter}</span>
            </div>
            <div class="meta-box">
              <div><strong>Period:</strong> ${fromDate} to ${toDate}</div>
              <div><strong>Generated On:</strong> ${generatedOn} IST</div>
              <div><strong>Generated By:</strong> ${user?.name || 'Administrator'} (${user?.role || 'Admin'})</div>
              <div><strong>Total Records:</strong> ${teamReportData.totals.candidates} candidate interactions</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="val">${teamReportData.totals.calls}</div>
              <div class="lbl">Total Calls Made</div>
            </div>
            <div class="kpi-card">
              <div class="val">${teamReportData.totals.itvs}</div>
              <div class="lbl">Interviews Scheduled</div>
            </div>
            <div class="kpi-card">
              <div class="val">${teamReportData.totals.walks}</div>
              <div class="lbl">Walk-ins Completed</div>
            </div>
            <div class="kpi-card">
              <div class="val">${teamReportData.totals.sels}</div>
              <div class="lbl">Selected Today</div>
            </div>
            <div class="kpi-card">
              <div class="val">${teamReportData.totals.jnds}</div>
              <div class="lbl">Joinings Realized</div>
            </div>
            <div class="kpi-card" style="background: ${teamReportData.totals.avgScore >= 60 ? '#ECFDF5' : '#FEF3C7'};">
              <div class="val" style="color: ${teamReportData.totals.avgScore >= 60 ? '#059669' : '#D97706'};">${teamReportData.totals.avgScore}%</div>
              <div class="lbl">Team Avg Score</div>
            </div>
          </div>

          <h3 style="font-size: 12px; margin: 0 0 6px 0; color: #1F2937;">1. Individual Recruiter Breakdown (Min 60% Required · &lt;40% Half-Day Absent Risk)</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Recruiter Name</th>
                <th style="text-align: center;">Active Days</th>
                <th style="text-align: center;">Calls</th>
                <th style="text-align: center;">Interviews</th>
                <th style="text-align: center;">Walk-ins</th>
                <th style="text-align: center;">Selected</th>
                <th style="text-align: center;">Joined</th>
                <th style="text-align: center;">Score</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${teamReportData.rows.map((r) => `
                <tr>
                  <td>${r.slNo}</td>
                  <td style="font-weight: 700;">${r.name}</td>
                  <td style="text-align: center;">${r.activeDays}d</td>
                  <td style="text-align: center;">${r.calls} / ${r.callsTarget}</td>
                  <td style="text-align: center;">${r.itvs} / ${r.itvsTarget}</td>
                  <td style="text-align: center;">${r.walks} / ${r.walksTarget}</td>
                  <td style="text-align: center;">${r.sels} / ${r.selsTarget}</td>
                  <td style="text-align: center;">${r.jnds} / ${r.jndsTarget}</td>
                  <td style="text-align: center; font-weight: 800;">${r.score}%</td>
                  <td style="text-align: center;">
                    <span class="${r.score >= 60 ? 'status-done' : r.score < 40 ? 'status-danger' : 'status-risk'}">
                      ${r.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">TOTAL (Team Aggregation)</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: center;">${teamReportData.totals.calls}</td>
                <td style="text-align: center;">${teamReportData.totals.itvs}</td>
                <td style="text-align: center;">${teamReportData.totals.walks}</td>
                <td style="text-align: center;">${teamReportData.totals.sels}</td>
                <td style="text-align: center;">${teamReportData.totals.jnds}</td>
                <td style="text-align: center;">${teamReportData.totals.avgScore}%</td>
                <td style="text-align: center;">${teamReportData.totals.avgScore >= 60 ? 'Passed' : 'At Risk'}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="font-size: 12px; margin: 12px 0 6px 0; color: #1F2937;">2. Date-Wise Daily Activity Totals</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style="text-align: center;">Active Staff</th>
                <th style="text-align: center;">Calls</th>
                <th style="text-align: center;">Interviews</th>
                <th style="text-align: center;">Walk-ins</th>
                <th style="text-align: center;">Selected</th>
                <th style="text-align: center;">Joined</th>
                <th style="text-align: center;">Total Logged</th>
              </tr>
            </thead>
            <tbody>
              ${dailyDateBreakdown.map((d) => `
                <tr>
                  <td style="font-weight: 700;">${formatSheetDateDisplay(d.date) || d.date}</td>
                  <td style="text-align: center;">${d.recruitersActive} recruiters</td>
                  <td style="text-align: center;">${d.calls}</td>
                  <td style="text-align: center;">${d.itvs}</td>
                  <td style="text-align: center;">${d.walks}</td>
                  <td style="text-align: center;">${d.sels}</td>
                  <td style="text-align: center;">${d.jnds}</td>
                  <td style="text-align: center; font-weight: 800;">${d.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>
              CEGS OS Enterprise HRMS • Generated Automatically • Confidential • Page 1 of 1
            </div>
            <div class="sign-box">
              Authorized Signatory<br>
              CEGS Operations / HR
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to trigger PDF export:', err);
      alert('Error printing PDF: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          maxWidth: 780,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📊</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                Export Whole Team Work Report (Date-Wise)
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 32px', fontSize: 12, color: '#BFDBFE', fontWeight: 500 }}>
              Download official recruiter team performance, call logs, interviews, and walk-ins across any custom date range.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 99,
              width: 32,
              height: 32,
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* 1. Date Range Controls */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Select Date Range
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  FROM DATE (Start)
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  TO DATE (End)
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  RECRUITER / STAFF SCOPE
                </label>
                <select
                  value={selectedRecruiter}
                  onChange={(e) => setSelectedRecruiter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Entire Team ({employeeList.length} Staff)</option>
                  {employeeList.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginRight: 4 }}>Quick Range:</span>
              {[
                { label: 'Oct 10 - Oct 20', preset: 'octExample' },
                { label: 'Today', preset: 'today' },
                { label: 'Yesterday', preset: 'yesterday' },
                { label: 'Last 7 Days', preset: 'last7' },
                { label: 'This Month', preset: 'thisMonth' },
                { label: 'Last Month', preset: 'lastMonth' },
                { label: 'Last 30 Days', preset: 'last30' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.preset)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 99,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Live Data Status & Metrics Preview */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1E293B' }}>
                Summary for Period: {fromDate} to {toDate}
              </div>
              {loading && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>
                  ⏳ Loading records from database...
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#1E3A8A' }}>{teamReportData.totals.calls}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#3B82F6', marginTop: 2 }}>CALLS MADE</div>
              </div>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#166534' }}>{teamReportData.totals.itvs}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>INTERVIEWS</div>
              </div>
              <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#854D0E' }}>{teamReportData.totals.walks}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#CA8A04', marginTop: 2 }}>WALK-INS</div>
              </div>
              <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#6B21A8' }}>{teamReportData.totals.sels}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9333EA', marginTop: 2 }}>SELECTED</div>
              </div>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#9A3412' }}>{teamReportData.totals.jnds}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#EA580C', marginTop: 2 }}>JOINED</div>
              </div>
              <div style={{ background: teamReportData.totals.avgScore >= 60 ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${teamReportData.totals.avgScore >= 60 ? '#A7F3D0' : '#FECACA'}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: teamReportData.totals.avgScore >= 60 ? '#065F46' : '#991B1B' }}>
                  {teamReportData.totals.avgScore}%
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: teamReportData.totals.avgScore >= 60 ? '#059669' : '#DC2626', marginTop: 2 }}>
                  AVG SCORE
                </div>
              </div>
            </div>
          </div>

          {/* 3. Recruiter Preview List */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: '#F1F5F9', padding: '8px 14px', fontSize: 11, fontWeight: 800, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
              <span>Staff Breakdown ({teamReportData.rows.length} Recruiters)</span>
              <span>{teamReportData.totals.candidates} total candidate rows</span>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {teamReportData.rows.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
                  No recruiter activity found for this period.
                </div>
              ) : (
                teamReportData.rows.map((r) => (
                  <div
                    key={r.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 14px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{r.name}</span>
                      <span style={{ fontSize: 10.5, color: '#64748B', marginLeft: 8 }}>
                        ({r.calls} calls · {r.itvs} itvs · {r.walks} walks · {r.sels} sel · {r.jnds} jnd)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: r.score >= 60 ? '#059669' : r.score < 40 ? '#DC2626' : '#D97706' }}>
                        {r.score}%
                      </span>
                      <span
                        style={{
                          background: r.score >= 60 ? '#ECFDF5' : r.score < 40 ? '#FEE2E2' : '#FEF3C7',
                          color: r.score >= 60 ? '#065F46' : r.score < 40 ? '#991B1B' : '#92400E',
                          borderRadius: 99,
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {r.score >= 60 ? 'Done' : r.score < 40 ? 'Half-day risk' : 'At risk'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with 2 Primary Action Buttons */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* DOWNLOAD EXCEL BUTTON */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <span>📗</span>
              <span>Download Excel (.xlsx)</span>
            </button>

            {/* DOWNLOAD / PRINT PDF BUTTON */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <span>📕</span>
              <span>Download / Print PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

