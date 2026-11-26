'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Plus,
  ArrowRight,
  CheckCircle,
  Building,
  X,
  Info,
  RefreshCw,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  inr,
  calculateDraftInvoice,
  getClientPocs,
  getClientPayouts,
  getCurrentMonthKey,
  formatMonthLabel,
} from '@/lib/finance-data';
import {
  COMPANY_PAYOUT_CONFIG,
  getCompanyPayoutDays,
  getCompanyProcesses,
  resolveJoinerPayoutInfo,
} from '@/lib/company-process-payouts';
import { addDaysIso } from '@/lib/campaign-weeks';
import { formatSheetDateDisplay } from '@/lib/candidate-dates';

function todayDayMonth() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function filterWeeklyCandidates(list, { searchQuery, selectedClient, selectedStatus, selectedMonth }) {
  const q = String(searchQuery || '').toLowerCase().trim();
  return (list || []).filter((item) => {
    const matchSearch =
      !q ||
      item.candidateName?.toLowerCase().includes(q) ||
      item.phone?.includes(q) ||
      item.process?.toLowerCase().includes(q) ||
      item.client?.toLowerCase().includes(q) ||
      item.recruiter?.toLowerCase().includes(q) ||
      item.empId?.toLowerCase().includes(q);
    const matchClient = selectedClient === 'ALL' || item.client?.toLowerCase() === selectedClient.toLowerCase();
    const matchStatus = selectedStatus === 'ALL' || item.billingStatus?.toLowerCase() === selectedStatus.toLowerCase();
    const matchMonth = selectedMonth === 'ALL' || item.monthKey === selectedMonth;
    return matchSearch && matchClient && matchStatus && matchMonth;
  });
}

export function WeeklyUpdateSection({ onNavigateToRaised, onMoveCandidatesToRaised, onCountChange }) {
  const [batches, setBatches] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [deletedCandidates, setDeletedCandidates] = useState([]);
  const [availableMonthsFromApi, setAvailableMonthsFromApi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [recyclingId, setRecyclingId] = useState('');
  const [confirmPermanentCand, setConfirmPermanentCand] = useState(null);

  const pocs = useMemo(() => getClientPocs(), []);
  const payouts = useMemo(() => getClientPayouts(), []);

  // View mode: 'candidates' (detailed candidates sheet), 'batches' (weekly sheets), or 'recycle' (deleted register)
  const [viewMode, setViewMode] = useState('candidates');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const loadLiveTracker = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      setLoadError('Please log in to view live Joiner Sheet billing data.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/finance/weekly-tracker', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || 'Failed to load live billing tracker.');
      } else {
        const nextCandidates = Array.isArray(data.candidates) ? data.candidates : [];
        const nextDeleted = Array.isArray(data.deletedCandidates) ? data.deletedCandidates : [];
        setCandidates(nextCandidates);
        setDeletedCandidates(nextDeleted);
        setBatches(Array.isArray(data.batches) ? data.batches : []);
        setAvailableMonthsFromApi(Array.isArray(data.availableMonths) ? data.availableMonths : []);
        if (onCountChange) onCountChange(nextCandidates.length);
      }
    } catch (err) {
      console.error('Weekly tracker fetch error:', err);
      setLoadError('Network error while loading live Joiner Sheet data.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  const handleRecycleAction = async (cand, action) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      triggerToast('Please log in to update Weekly Update records.');
      return;
    }
    setRecyclingId(cand.id);
    try {
      const res = await fetch('/api/finance/weekly-tracker/recycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          overlayId: cand.overlayId || '',
          candidateId: cand.candidateId || '',
          candidateName: cand.candidateName || '',
          phone: cand.phone || '',
          company: cand.rawClient || cand.client || '',
          process: cand.rawProcess || cand.process || '',
          joiningDate: cand.joiningIso || cand.joiningDate || '',
          recruiter: cand.recruiter || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerToast(data.error || 'Failed to update Recycle Bin');
      } else {
        setSelectedCandidateIds((prev) => prev.filter((id) => id !== cand.id));
        setConfirmPermanentCand(null);
        await loadLiveTracker();
        if (action === 'delete') {
          triggerToast(`${cand.candidateName} moved to Recycle Bin.`);
        } else if (action === 'restore') {
          triggerToast(`${cand.candidateName} restored to Weekly Update (A).`);
        } else {
          triggerToast(`${cand.candidateName} permanently deleted.`);
        }
      }
    } catch (err) {
      console.error('Recycle bin error:', err);
      triggerToast('Network error while updating Recycle Bin.');
    } finally {
      setRecyclingId('');
    }
  };

  // 1. URL search parameter detection for instant redirection from Joiner Sheet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) {
        setViewMode('candidates');
        setSearchQuery(decodeURIComponent(search));
      }
    }
  }, []);

  // 2. Load live tracker from MongoDB + refresh on cross-component storage updates
  useEffect(() => {
    loadLiveTracker();
    const handleStorageUpdate = () => {
      loadLiveTracker();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('finance_storage_update', handleStorageUpdate);
      return () => window.removeEventListener('finance_storage_update', handleStorageUpdate);
    }
  }, [loadLiveTracker]);
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPocDrawer, setShowPocDrawer] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const makeDefaultForm = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const defaultClient = 'iSON';
    const defaultProcess = 'Flipkart';
    const payout = resolveJoinerPayoutInfo(defaultClient, defaultProcess);
    const tax = calculateDraftInvoice(payout.rate, 0.18, 0.10);
    const days = getCompanyPayoutDays(defaultClient);
    return {
      candidateName: '',
      phone: '',
      client: defaultClient,
      process: defaultProcess,
      joiningDate: todayIso,
      billingDate: addDaysIso(todayIso, days),
      recruiter: '',
      bi: tax.totalInvoiceValue,
      ai: tax.expectedReceipt,
      empId: '',
      empStatus: 'ACTIVE',
      remarks: '',
    };
  };

  // Add Candidate Form
  const [newCandidateForm, setNewCandidateForm] = useState(makeDefaultForm);

  // Client Options
  const clientOptions = useMemo(() => {
    const list = new Set();
    if (viewMode === 'candidates') {
      candidates.forEach((c) => c.client && list.add(c.client));
    } else if (viewMode === 'recycle') {
      deletedCandidates.forEach((c) => c.client && list.add(c.client));
    } else {
      batches.forEach((b) => b.company && list.add(b.company));
    }
    return Array.from(list).sort();
  }, [viewMode, candidates, deletedCandidates, batches]);

  // Available Months for Monthly Filter (Excluding July 2025, July 2026, August 2026; newest first)
  const availableMonths = useMemo(() => {
    const excludedMonths = new Set(['2025-07', '2026-07', '2026-08']);
    if (availableMonthsFromApi.length > 0) {
      return availableMonthsFromApi.filter((m) => !excludedMonths.has(m));
    }
    const set = new Set([getCurrentMonthKey()]);
    candidates.forEach((c) => c.monthKey && !excludedMonths.has(c.monthKey) && set.add(c.monthKey));
    batches.forEach((b) => b.monthKey && !excludedMonths.has(b.monthKey) && set.add(b.monthKey));
    return Array.from(set).filter((m) => !excludedMonths.has(m)).sort().reverse();
  }, [availableMonthsFromApi, candidates, batches]);

  const filterParams = { searchQuery, selectedClient, selectedStatus, selectedMonth };

  // Filtered Candidates (live, newest joining date first)
  const filteredCandidates = useMemo(
    () => filterWeeklyCandidates(candidates, filterParams),
    [candidates, searchQuery, selectedClient, selectedStatus, selectedMonth]
  );

  // Filtered Recycle Bin Candidates
  const filteredDeletedCandidates = useMemo(
    () => filterWeeklyCandidates(deletedCandidates, filterParams),
    [deletedCandidates, searchQuery, selectedClient, selectedStatus, selectedMonth]
  );

  // Filtered Batches (live Company x Week batches, newest week first)
  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return batches.filter((item) => {
      const matchSearch =
        !q ||
        item.company?.toLowerCase().includes(q) ||
        item.period?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q);
      const matchClient = selectedClient === 'ALL' || item.company?.toLowerCase() === selectedClient.toLowerCase();
      const matchPeriod = selectedPeriod === 'ALL' || item.period === selectedPeriod;
      let matchStatus = true;
      if (selectedStatus !== 'ALL') {
        const stLower = String(item.status || '').toLowerCase();
        if (selectedStatus === 'Has Drops') matchStatus = (item.droppedCount || 0) > 0;
        else matchStatus = stLower.includes(selectedStatus.toLowerCase());
      }
      const matchMonth = selectedMonth === 'ALL' || item.monthKey === selectedMonth;
      return matchSearch && matchClient && matchPeriod && matchStatus && matchMonth;
    });
  }, [batches, searchQuery, selectedClient, selectedPeriod, selectedStatus, selectedMonth]);

  // Summary KPI Metrics (dynamically computed from live records; inactive/dropped & deleted excluded from active totals)
  const metrics = useMemo(() => {
    if (viewMode === 'candidates' || viewMode === 'recycle') {
      const scope = viewMode === 'recycle' ? filteredDeletedCandidates : filteredCandidates;
      const activeList = scope.filter((c) => c.empStatus === 'ACTIVE');
      const totalCount = scope.length;
      const readyCount = scope.filter((c) => c.billingStatus === 'Ready to Invoice').length;
      const pendingCount = scope.filter(
        (c) => c.billingStatus !== 'Ready to Invoice' && c.billingStatus !== 'Moved to Bill Raised'
      ).length;
      const totalBi = activeList.reduce((s, c) => s + (Number(c.bi) || 0), 0);
      const totalAi = activeList.reduce((s, c) => s + (Number(c.ai) || 0), 0);
      return { totalCount, activeCount: activeList.length, readyCount, pendingCount, totalBi, totalAi };
    } else {
      const scope = filteredBatches;
      const totalCount = scope.reduce((s, b) => s + (Number(b.candidates) || 0), 0);
      const readyCount = scope.reduce((s, b) => s + (Number(b.readyCount) || 0), 0);
      const droppedTotal = scope.reduce((s, b) => s + (Number(b.droppedCount) || 0), 0);
      const pendingCount = Math.max(0, totalCount - readyCount) + droppedTotal;
      const totalBi = scope.reduce((s, b) => s + (Number(b.bi) || 0), 0);
      const totalAi = scope.reduce((s, b) => s + (Number(b.ai) || 0), 0);
      return { totalCount, activeCount: totalCount, readyCount, pendingCount, totalBi, totalAi };
    }
  }, [viewMode, filteredCandidates, filteredDeletedCandidates, filteredBatches]);

  // Pagination Slice
  const activeItems =
    viewMode === 'candidates'
      ? filteredCandidates
      : viewMode === 'recycle'
      ? filteredDeletedCandidates
      : filteredBatches;
  const totalPages = Math.ceil(activeItems.length / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeItems.slice(start, start + pageSize);
  }, [activeItems, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    const rows =
      viewMode === 'candidates' || viewMode === 'recycle'
        ? (viewMode === 'recycle' ? filteredDeletedCandidates : filteredCandidates).map((c) => ({
            'SL No': c.slNo,
            'Candidate Name': c.candidateName,
            Phone: c.phone,
            Client: c.client,
            Process: c.process,
            'Joining Date': c.joiningDate,
            'Billing Eligibility Date': c.billingDate,
            Recruiter: c.recruiter,
            'BI (Basic Billing)': c.bi,
            'AI (After Incentive)': c.ai,
            'Employee ID': c.empId,
            'Employee Status': c.empStatus,
            'Billing Readiness Status': c.billingStatus,
            ...(viewMode === 'recycle'
              ? { 'Deleted At': c.deletedAt || '', 'Deleted By': c.deletedBy || '' }
              : {}),
            Remarks: c.remarks || '',
          }))
        : filteredBatches.map((b) => ({
            'SL No': b.slNo,
            'Company Name': b.company,
            Period: b.period,
            'Active Candidates': b.candidates,
            'Dropped Candidates': b.droppedCount || 0,
            'BI (Basic)': b.bi,
            'AI (After Incentive)': b.ai,
            'Date to be Raised': b.dateToBeRaised,
            Status: b.status,
          }));

    if (!rows.length) return triggerToast('No records to export');
    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CEGS_Weekly_Update_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Exported CSV successfully!');
  };

  // Update Company/Process/Date in Add Candidate form & auto-recalculate BI, AI, Billing Date
  const updateCandidateFormField = (patch) => {
    setNewCandidateForm((prev) => {
      const next = { ...prev, ...patch };
      if ('client' in patch && !('process' in patch)) {
        const procs = getCompanyProcesses(next.client);
        next.process = procs[0]?.name || '';
      }
      if ('client' in patch || 'process' in patch || 'joiningDate' in patch) {
        const payout = resolveJoinerPayoutInfo(next.client, next.process);
        const tax = calculateDraftInvoice(payout.rate, 0.18, 0.10);
        const days = getCompanyPayoutDays(next.client);
        if (!('bi' in patch)) next.bi = tax.totalInvoiceValue;
        if (!('ai' in patch)) next.ai = tax.expectedReceipt;
        if (next.joiningDate && !('billingDate' in patch)) {
          next.billingDate = addDaysIso(next.joiningDate, days);
        }
      }
      return next;
    });
  };

  // Persist Add Candidate directly to MongoDB (/api/joiners) and sync live
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidateForm.candidateName.trim()) {
      return alert('Candidate name is required');
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      return alert('Please log in to add candidates.');
    }
    setSavingCandidate(true);
    try {
      const dm = todayDayMonth();
      const isInactive = newCandidateForm.empStatus === 'INACTIVE';
      const payload = {
        name: newCandidateForm.candidateName.trim().toUpperCase(),
        phone: newCandidateForm.phone.trim(),
        company: newCandidateForm.client.trim().toUpperCase(),
        process: newCandidateForm.process.trim().toUpperCase(),
        dateOfJoining: formatSheetDateDisplay(newCandidateForm.joiningDate) || newCandidateForm.joiningDate,
        billingDate: formatSheetDateDisplay(newCandidateForm.billingDate) || newCandidateForm.billingDate,
        employeeCode: newCandidateForm.empId.trim().toUpperCase(),
        recruiterName: newCandidateForm.recruiter.trim().toUpperCase(),
        week1: isInactive ? `Inactive (${dm})` : `Active (${dm})`,
      };

      const res = await fetch('/api/joiners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to save candidate to Joiner Sheet.');
        return;
      }

      setShowAddModal(false);
      setNewCandidateForm(makeDefaultForm());
      triggerToast(`Saved ${payload.name} to Joiner Sheet & Weekly Tracker!`);
      await loadLiveTracker();
    } catch (err) {
      console.error('Failed to add candidate:', err);
      alert('Network error while saving candidate.');
    } finally {
      setSavingCandidate(false);
    }
  };

  // Move Candidates to Bill Raised
  const handleConfirmMoveToRaised = () => {
    const selected = candidates.filter((c) => selectedCandidateIds.includes(c.id));
    if (!selected.length) return;

    const inactive = selected.filter((c) => c.empStatus !== 'ACTIVE');
    if (inactive.length > 0) {
      return alert(`${inactive.length} candidate(s) are INACTIVE / DROPPED in Joiner Sheet and cannot be billed.`);
    }

    const missingId = selected.filter((c) => !c.empId || c.empId === 'Pending');
    if (missingId.length > 0) {
      const confirmProceed = window.confirm(
        `${missingId.length} candidate(s) do not have an Employee ID yet. Proceed to Payments & Invoices anyway?`
      );
      if (!confirmProceed) return;
    }

    if (onMoveCandidatesToRaised) {
      onMoveCandidatesToRaised(selected);
    }

    setShowMoveModal(false);
    setSelectedCandidateIds([]);
    triggerToast(`Moved ${selected.length} active candidate(s) to Payments & Invoices!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* TOAST FEEDBACK */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle size={18} color="#10B981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP SECTION HEADER & CONTROLS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Weekly Update (A) — Billing Readiness Tracker
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 99,
                background: '#E0F2FE',
                color: '#0284C7',
              }}
            >
              Section 1 (A)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Operational recruitment pipeline, joining verification, 60-day billing eligibility, and readiness before raising invoices.
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* VIEW MODE TOGGLE */}
          <div
            style={{
              display: 'inline-flex',
              background: '#F1F5F9',
              padding: 4,
              borderRadius: 12,
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              onClick={() => {
                setViewMode('candidates');
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: viewMode === 'candidates' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'candidates' ? '#0F172A' : '#64748B',
                boxShadow: viewMode === 'candidates' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Candidate Detail ({candidates.length})
            </button>
            <button
              onClick={() => {
                setViewMode('batches');
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: viewMode === 'batches' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'batches' ? '#0F172A' : '#64748B',
                boxShadow: viewMode === 'batches' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Weekly Batches ({batches.length})
            </button>
            <button
              onClick={() => {
                setViewMode('recycle');
                setCurrentPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: viewMode === 'recycle' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'recycle' ? '#DC2626' : '#64748B',
                boxShadow: viewMode === 'recycle' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={13} />
              <span>Recycle Bin ({deletedCandidates.length})</span>
            </button>
          </div>

          {/* REFRESH BUTTON */}
          <button
            onClick={loadLiveTracker}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {/* CLIENT POCs BUTTON */}
          <button
            onClick={() => setShowPocDrawer(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Building size={14} />
            <span>Client POCs ({pocs.length})</span>
          </button>

          {/* EXPORT CSV */}
          <button
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* ADD CANDIDATE BUTTON */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#0D9488',
              color: '#FFFFFF',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Plus size={15} />
            <span>+ Add Candidate</span>
          </button>

          {/* MOVE TO BILL RAISED (ACTIVE WHEN CANDIDATES SELECTED) */}
          {selectedCandidateIds.length > 0 && (
            <button
              onClick={() => setShowMoveModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              <span>Move to Bill Raised ({selectedCandidateIds.length})</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY KPI CARDS (Section 4 requirements) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        {/* CARD 1: Total Candidates */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            {viewMode === 'candidates'
              ? 'Total Candidates Registered'
              : viewMode === 'recycle'
              ? 'Candidates in Recycle Bin'
              : 'Active Billing Candidates'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {metrics.totalCount}
          </div>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
            Across {clientOptions.length} corporate clients
          </div>
        </div>

        {/* CARD 2: Ready to Invoice */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Ready to Invoice</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0D9488', marginTop: 4 }}>
            {metrics.readyCount}
          </div>
          <div style={{ fontSize: 11.5, color: '#0D9488', fontWeight: 600, marginTop: 4 }}>
            Passed payout threshold &amp; Emp ID ready
          </div>
        </div>

        {/* CARD 3: Pending Confirmation */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Pending Confirmation / Drop</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {metrics.pendingCount}
          </div>
          <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600, marginTop: 4 }}>
            Awaiting emp ID or notice period
          </div>
        </div>

        {/* CARD 4: Total BI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total BI (Gross Billing)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
            {inr(metrics.totalBi)}
          </div>
          <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600, marginTop: 4 }}>
            Live Joiner Sheet active gross (+18% GST)
          </div>
        </div>

        {/* CARD 5: Total AI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total AI (Net / After Incentive)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>
            {inr(metrics.totalAi)}
          </div>
          <div style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: 600, marginTop: 4 }}>
            Net revenue expected post incentive
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: '1 1 240px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={16} color="#94A3B8" />
          <input
            type="text"
            placeholder={
              viewMode === 'candidates'
                ? 'Search candidate name, phone, recruiter, emp ID...'
                : viewMode === 'recycle'
                ? 'Search deleted candidate name, phone, recruiter, client...'
                : 'Search company name, period...'
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              width: '100%',
              color: '#0F172A',
            }}
          />
        </div>

        {/* Client Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Client:</span>
          <select
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: 12.5,
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Clients ({clientOptions.length})</option>
            {clientOptions.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: 12.5,
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            {viewMode === 'candidates' || viewMode === 'recycle' ? (
              <>
                <option value="Ready to Invoice">Ready to Invoice</option>
                <option value="Pending Emp ID">Pending Emp ID</option>
                <option value="In Notice Period">In Notice Period</option>
                <option value="Dropped / Inactive">Dropped / Inactive</option>
                <option value="Moved to Bill Raised">Moved to Bill Raised</option>
              </>
            ) : (
              <>
                <option value="Ready to Raise">Ready to Raise</option>
                <option value="Notice Period">In Notice Period</option>
                <option value="Has Drops">Has Drops</option>
              </>
            )}
          </select>
        </div>

        {/* Month Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: 12.5,
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)} {m === getCurrentMonthKey() ? '• Current' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || selectedClient !== 'ALL' || selectedStatus !== 'ALL' || selectedMonth !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClient('ALL');
              setSelectedStatus('ALL');
              setSelectedMonth('ALL');
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#F1F5F9',
              color: '#475569',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {loadError}
        </div>
      )}

      {/* DATA TABLE CONTAINER */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          {viewMode === 'candidates' ? (
            /* CANDIDATE DETAIL REGISTER TABLE */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={
                        pagedItems.length > 0 &&
                        pagedItems.every((item) => selectedCandidateIds.includes(item.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const pageIds = pagedItems.filter((item) => item.empStatus === 'ACTIVE').map((item) => item.id);
                          setSelectedCandidateIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                        } else {
                          const pageIds = pagedItems.map((item) => item.id);
                          setSelectedCandidateIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px' }}>SL NO</th>
                  <th style={{ padding: '12px 14px' }}>CANDIDATE NAME</th>
                  <th style={{ padding: '12px 14px' }}>PHONE</th>
                  <th style={{ padding: '12px 14px' }}>PROCESS / CLIENT</th>
                  <th style={{ padding: '12px 14px' }}>JOINING DATE</th>
                  <th style={{ padding: '12px 14px' }}>BILLING DATE</th>
                  <th style={{ padding: '12px 14px' }}>RECRUITER</th>
                  <th style={{ padding: '12px 14px' }}>BI (BASIC)</th>
                  <th style={{ padding: '12px 14px' }}>AI (NET)</th>
                  <th style={{ padding: '12px 14px' }}>EMP ID</th>
                  <th style={{ padding: '12px 14px' }}>EMP STATUS</th>
                  <th style={{ padding: '12px 14px' }}>READINESS</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading && pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: 40, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                      Loading live Joiner Sheet billing records...
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No candidate billing records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((cand, idx) => {
                    const isSelected = selectedCandidateIds.includes(cand.id);
                    const isDropped = cand.empStatus !== 'ACTIVE' || cand.billingStatus === 'Dropped / Inactive';
                    const isReady = cand.billingStatus === 'Ready to Invoice';
                    const isMoved = cand.billingStatus === 'Moved to Bill Raised';
                    const isNotice = cand.billingStatus === 'In Notice Period';

                    return (
                      <tr
                        key={cand.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isDropped
                            ? '#FEF2F2'
                            : isSelected
                            ? '#F0FDFA'
                            : idx % 2 === 0
                            ? '#FFFFFF'
                            : '#FAFCFF',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isMoved || isDropped}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidateIds((prev) => [...prev, cand.id]);
                              } else {
                                setSelectedCandidateIds((prev) => prev.filter((id) => id !== cand.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: isDropped ? '#DC2626' : '#64748B' }}>
                          {cand.slNo}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: isDropped ? '#991B1B' : '#0F172A' }}>
                          {cand.candidateName}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{cand.phone || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 11.5 }}>{cand.client}</div>
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: 2,
                              padding: '1px 7px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {cand.process || cand.client}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{cand.joiningDate || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{cand.billingDate || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>
                          {cand.recruiter || '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 700,
                            color: isDropped ? '#94A3B8' : '#2563EB',
                            textDecoration: isDropped ? 'line-through' : 'none',
                          }}
                        >
                          {inr(cand.bi)}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 700,
                            color: isDropped ? '#94A3B8' : '#7C3AED',
                            textDecoration: isDropped ? 'line-through' : 'none',
                          }}
                        >
                          {inr(cand.ai)}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>
                          {cand.empId || 'Pending'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              background: cand.empStatus === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                              color: cand.empStatus === 'ACTIVE' ? '#15803D' : '#B91C1C',
                            }}
                          >
                            {cand.empStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              background: isDropped
                                ? '#FEE2E2'
                                : isMoved
                                ? '#EEF2FF'
                                : isReady
                                ? '#CCFBF1'
                                : isNotice
                                ? '#F1F5F9'
                                : '#FEF3C7',
                              color: isDropped
                                ? '#991B1B'
                                : isMoved
                                ? '#4338CA'
                                : isReady
                                ? '#0F766E'
                                : isNotice
                                ? '#475569'
                                : '#B45309',
                            }}
                          >
                            {cand.billingStatus}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {isMoved ? (
                              <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>In Bill Raised</span>
                            ) : isDropped ? (
                              <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Dropped</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedCandidateIds([cand.id]);
                                  setShowMoveModal(true);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#0F766E',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Raise
                              </button>
                            )}
                            <button
                              onClick={() => handleRecycleAction(cand, 'delete')}
                              disabled={recyclingId === cand.id}
                              title="Move entry to Recycle Bin"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 9px',
                                borderRadius: 8,
                                border: '1px solid #FECACA',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: recyclingId === cand.id ? 'wait' : 'pointer',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>{recyclingId === cand.id ? '...' : 'Delete'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : viewMode === 'recycle' ? (
            /* RECYCLE BIN TABLE (Soft-deleted entries with Restore & Permanent Delete) */
            <div>
              <div
                style={{
                  padding: '10px 16px',
                  background: '#FEF2F2',
                  borderBottom: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span>
                  Deleted entries are excluded from active Weekly Update (A), Weekly Batches, and BI/AI billing totals.
                  Restore to bring them back, or Permanent Delete to remove them permanently.
                </span>
                <span style={{ fontWeight: 800 }}>{filteredDeletedCandidates.length} in Recycle Bin</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px' }}>SL NO</th>
                    <th style={{ padding: '12px 14px' }}>CANDIDATE NAME</th>
                    <th style={{ padding: '12px 14px' }}>PHONE</th>
                    <th style={{ padding: '12px 14px' }}>PROCESS / CLIENT</th>
                    <th style={{ padding: '12px 14px' }}>JOINING DATE</th>
                    <th style={{ padding: '12px 14px' }}>RECRUITER</th>
                    <th style={{ padding: '12px 14px' }}>BI / AI</th>
                    <th style={{ padding: '12px 14px' }}>DELETED BY</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                        Loading Recycle Bin...
                      </td>
                    </tr>
                  ) : pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                        Recycle Bin is empty.
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((cand, idx) => (
                      <tr
                        key={cand.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFD',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>{cand.slNo}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{cand.candidateName}</td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{cand.phone || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 11.5 }}>{cand.client}</div>
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: 2,
                              padding: '1px 7px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {cand.process || cand.client}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{cand.joiningDate || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>{cand.recruiter || '—'}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#2563EB' }}>{inr(cand.bi)}</div>
                          <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>{inr(cand.ai)}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#64748B' }}>
                          <div style={{ fontWeight: 700, color: '#334155' }}>{cand.deletedBy || 'Finance'}</div>
                          <div>{cand.deletedAt ? String(cand.deletedAt).slice(0, 10) : '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleRecycleAction(cand, 'restore')}
                              disabled={recyclingId === cand.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: '1px solid #A7F3D0',
                                background: '#ECFDF5',
                                color: '#047857',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: recyclingId === cand.id ? 'wait' : 'pointer',
                              }}
                            >
                              <RotateCcw size={12} />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => setConfirmPermanentCand(cand)}
                              disabled={recyclingId === cand.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#DC2626',
                                color: '#FFFFFF',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: recyclingId === cand.id ? 'wait' : 'pointer',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Permanent Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* WEEKLY BATCHES TABLE (Live Company x Week from Joiner Sheet) */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px' }}>SL NO</th>
                  <th style={{ padding: '12px 14px' }}>COMPANY / CLIENT</th>
                  <th style={{ padding: '12px 14px' }}>REPORTING PERIOD / MONTH</th>
                  <th style={{ padding: '12px 14px' }}>CANDIDATES</th>
                  <th style={{ padding: '12px 14px' }}>BI (BASIC BILLING)</th>
                  <th style={{ padding: '12px 14px' }}>AI (AFTER INCENTIVE)</th>
                  <th style={{ padding: '12px 14px' }}>DATE TO BE RAISED</th>
                  <th style={{ padding: '12px 14px' }}>STATUS / DROPS</th>
                </tr>
              </thead>
              <tbody>
                {loading && pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                      Analysing Joiner Sheet weekly batches...
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No weekly batches found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((batch, idx) => {
                    const stLower = String(batch.status || '').toLowerCase();
                    const isAllDropped = batch.candidates === 0 && (batch.droppedCount || 0) > 0;
                    const isReadyBatch = stLower.includes('ready');
                    return (
                      <tr
                        key={batch.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isAllDropped ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>{batch.slNo}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{batch.company}</td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              fontWeight: 600,
                              fontSize: 11.5,
                            }}
                          >
                            {batch.period}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>
                          {batch.candidates}
                          {batch.droppedCount > 0 && (
                            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginLeft: 6 }}>
                              (+{batch.droppedCount} drop)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>{inr(batch.bi)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C3AED' }}>{inr(batch.ai)}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{batch.dateToBeRaised || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isAllDropped
                                ? '#FEE2E2'
                                : stLower.includes('drop')
                                ? '#FEF3C7'
                                : isReadyBatch
                                ? '#DCFCE7'
                                : '#EFF6FF',
                              color: isAllDropped
                                ? '#991B1B'
                                : stLower.includes('drop')
                                ? '#B45309'
                                : isReadyBatch
                                ? '#15803D'
                                : '#1D4ED8',
                            }}
                          >
                            {batch.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            fontSize: 12.5,
            color: '#64748B',
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, activeItems.length)} of{' '}
            {activeItems.length} records
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: currentPage === 1 ? '#94A3B8' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ padding: '5px 10px', fontWeight: 700, color: '#0F172A' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: currentPage === totalPages ? '#94A3B8' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD CANDIDATE */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 600,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                Add New Candidate Billing Entry (Weekly Update A)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Candidate Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.candidateName}
                    onChange={(e) => updateCandidateFormField({ candidateName: e.target.value })}
                    placeholder="e.g. Shaik Ansar Basha"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Phone Number</label>
                  <input
                    type="text"
                    value={newCandidateForm.phone}
                    onChange={(e) => updateCandidateFormField({ phone: e.target.value })}
                    placeholder="e.g. 7095143067"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Client / Company *</label>
                  <select
                    value={newCandidateForm.client}
                    onChange={(e) => updateCandidateFormField({ client: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                      background: '#FFFFFF',
                    }}
                  >
                    {Object.keys(COMPANY_PAYOUT_CONFIG).map((compName) => (
                      <option key={compName} value={compName}>
                        {compName}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Process / Requirement</label>
                  <input
                    type="text"
                    list="weekly-add-process-options"
                    value={newCandidateForm.process}
                    onChange={(e) => updateCandidateFormField({ process: e.target.value })}
                    placeholder="e.g. Flipkart, AirTel Black, Traya"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                  <datalist id="weekly-add-process-options">
                    {getCompanyProcesses(newCandidateForm.client).map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} (₹{p.rate})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Joining Date</label>
                  <input
                    type="date"
                    value={newCandidateForm.joiningDate}
                    onChange={(e) => updateCandidateFormField({ joiningDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Billing Eligibility Date</label>
                  <input
                    type="date"
                    value={newCandidateForm.billingDate}
                    onChange={(e) => updateCandidateFormField({ billingDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Recruiter</label>
                  <input
                    type="text"
                    value={newCandidateForm.recruiter}
                    onChange={(e) => updateCandidateFormField({ recruiter: e.target.value })}
                    placeholder="e.g. Ashwin P"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>BI (Basic Billing)</label>
                  <input
                    type="number"
                    value={newCandidateForm.bi}
                    onChange={(e) => updateCandidateFormField({ bi: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>AI (Net / Payout)</label>
                  <input
                    type="number"
                    value={newCandidateForm.ai}
                    onChange={(e) => updateCandidateFormField({ ai: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Client Employee ID</label>
                  <input
                    type="text"
                    value={newCandidateForm.empId}
                    onChange={(e) => updateCandidateFormField({ empId: e.target.value })}
                    placeholder="e.g. ISBL08782"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Employee Status</label>
                  <select
                    value={newCandidateForm.empStatus}
                    onChange={(e) => updateCandidateFormField({ empStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCandidate}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: savingCandidate ? 'wait' : 'pointer',
                    opacity: savingCandidate ? 0.7 : 1,
                  }}
                >
                  {savingCandidate ? 'Saving to Joiner Sheet...' : 'Save Candidate Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE TO BILL RAISED (Section 4 Rule: Audited move with validation) */}
      {showMoveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 550,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                Move Candidate(s) to Bill Raised (B)
              </h3>
              <button
                onClick={() => setShowMoveModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div
                style={{
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 13,
                  color: '#3730A3',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Business Rule Check:</strong> Only candidates with confirmed <strong>ACTIVE</strong> status
                  and allocated <strong>Employee IDs</strong> can be moved to an issued invoice. Candidates moved here will
                  automatically reflect in <strong>Bill Raised (B)</strong> without duplication.
                </div>
              </div>

              <p style={{ fontSize: 13.5, color: '#334155', margin: '0 0 12px' }}>
                You have selected <strong>{selectedCandidateIds.length} candidate(s)</strong> to raise:
              </p>

              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: 10,
                  background: '#F8FAFC',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {candidates
                  .filter((c) => selectedCandidateIds.includes(c.id))
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        background: '#FFFFFF',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{c.candidateName}</span>
                      <span style={{ color: '#64748B' }}>Emp ID: {c.empId || 'NA'}</span>
                      <span style={{ fontWeight: 700, color: '#0D9488' }}>{inr(c.bi)}</span>
                    </div>
                  ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setShowMoveModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMoveToRaised}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  Confirm &amp; Move to Bill Raised
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: CLIENT POCs & BILLING TERMS (From Reference 4) */}
      {showPocDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 800,
              maxHeight: '90vh',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Client HR &amp; Billing Points of Contact (POC)
                </h3>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Reference 4: HR POC &amp; Billing POC details and CEGS clients payouts
                </span>
              </div>
              <button
                onClick={() => setShowPocDrawer(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 12px' }}>CLIENT</th>
                    <th style={{ padding: '10px 12px' }}>HR POC(s)</th>
                    <th style={{ padding: '10px 12px' }}>HR CONTACT</th>
                    <th style={{ padding: '10px 12px' }}>BILLS CLEARANCE POC</th>
                    <th style={{ padding: '10px 12px' }}>FINANCE EMAIL / PHONE</th>
                  </tr>
                </thead>
                <tbody>
                  {pocs.map((poc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0F172A' }}>{poc.client}</td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{poc.hrPocName || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>{poc.hrPocPhone || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#0F766E', fontWeight: 700 }}>{poc.billingPocName || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569', wordBreak: 'break-all' }}>{poc.billingPocContact || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                  Candidate Payout Rules by Process (CEGS Clients Payouts)
                </h4>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', color: '#475569', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 10px' }}>CLIENT</th>
                        <th style={{ padding: '8px 10px' }}>PROCESS / REQUIREMENT</th>
                        <th style={{ padding: '8px 10px' }}>PAYOUT DAYS</th>
                        <th style={{ padding: '8px 10px' }}>PAYOUT AMOUNT</th>
                        <th style={{ padding: '8px 10px' }}>INVOICE SUBMISSION</th>
                        <th style={{ padding: '8px 10px' }}>CLEARANCE TIMELINE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.slice(0, 30).map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0F172A' }}>{p.client}</td>
                          <td style={{ padding: '6px 10px', color: '#334155' }}>{p.process}</td>
                          <td style={{ padding: '6px 10px', color: '#64748B' }}>{p.payoutDays}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 800, color: '#059669' }}>{inr(p.payoutAmount)}</td>
                          <td style={{ padding: '6px 10px', color: '#64748B' }}>{p.invoiceDateRule}</td>
                          <td style={{ padding: '6px 10px', color: '#64748B' }}>{p.clearanceTimeline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', textAlign: 'right' }}>
              <button
                onClick={() => setShowPocDrawer(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM PERMANENT DELETE FROM RECYCLE BIN */}
      {confirmPermanentCand && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 40px rgba(0,0,0,0.28)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Permanently Delete Entry?
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  This cannot be undone from the Recycle Bin.
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
              You are about to permanently remove <strong>{confirmPermanentCand.candidateName}</strong>
              {confirmPermanentCand.client ? ` (${confirmPermanentCand.client})` : ''} from Weekly Update (A).
              {confirmPermanentCand.candidateId ? (
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
                  Note: Recruiter Targets history remains intact, while this entry will be permanently hidden from Weekly Update (A).
                </div>
              ) : null}
            </div>
            <div
              style={{
                padding: '12px 20px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => setConfirmPermanentCand(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRecycleAction(confirmPermanentCand, 'permanent_delete')}
                disabled={recyclingId === confirmPermanentCand.id}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: recyclingId === confirmPermanentCand.id ? 'wait' : 'pointer',
                }}
              >
                {recyclingId === confirmPermanentCand.id ? 'Deleting...' : 'Permanent Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
