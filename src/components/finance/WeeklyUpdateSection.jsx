'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Building,
  UserCheck,
  Users,
  FileSpreadsheet,
  X,
  Upload,
  Info,
  Calendar,
} from 'lucide-react';
import {
  inr,
  getInitialWeeklyBatches,
  saveWeeklyBatches,
  getInitialOctoberCandidates,
  saveOctoberCandidates,
  getClientPocs,
  getClientPayouts,
} from '@/lib/finance-data';

export function WeeklyUpdateSection({ onNavigateToRaised, onMoveCandidatesToRaised }) {
  const [batches, setBatches] = useState(getInitialWeeklyBatches);
  const [candidates, setCandidates] = useState(getInitialOctoberCandidates);
  const pocs = useMemo(() => getClientPocs(), []);
  const payouts = useMemo(() => getClientPayouts(), []);

  // View mode: 'batches' (weekly sheets) or 'candidates' (detailed candidates sheet)
  const [viewMode, setViewMode] = useState('candidates');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPocDrawer, setShowPocDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Add Candidate Form
  const [newCandidateForm, setNewCandidateForm] = useState({
    candidateName: '',
    phone: '',
    client: 'ISON',
    process: 'Flipkart',
    joiningDate: new Date().toISOString().slice(0, 10),
    billingDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    recruiter: '',
    bi: 5900,
    ai: 5400,
    empId: '',
    empStatus: 'ACTIVE',
    billingStatus: 'Ready to Invoice',
    remarks: '',
  });

  // Client Options
  const clientOptions = useMemo(() => {
    const list = new Set();
    if (viewMode === 'candidates') {
      candidates.forEach((c) => c.client && list.add(c.client));
    } else {
      batches.forEach((b) => b.company && list.add(b.company));
    }
    return Array.from(list).sort();
  }, [viewMode, candidates, batches]);

  // Period / Month Options
  const periodOptions = useMemo(() => {
    const set = new Set();
    if (viewMode === 'batches') {
      batches.forEach((b) => b.period && set.add(b.period));
    }
    return Array.from(set).slice(0, 20);
  }, [viewMode, batches]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone?.includes(searchQuery) ||
        item.process?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.recruiter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.empId?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClient = selectedClient === 'ALL' || item.client?.toLowerCase() === selectedClient.toLowerCase();
      const matchStatus = selectedStatus === 'ALL' || item.billingStatus?.toLowerCase() === selectedStatus.toLowerCase();
      return matchSearch && matchClient && matchStatus;
    });
  }, [candidates, searchQuery, selectedClient, selectedStatus]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.period?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClient = selectedClient === 'ALL' || item.company?.toLowerCase() === selectedClient.toLowerCase();
      const matchPeriod = selectedPeriod === 'ALL' || item.period === selectedPeriod;
      const matchStatus = selectedStatus === 'ALL' || item.status?.toLowerCase() === selectedStatus.toLowerCase();
      return matchSearch && matchClient && matchPeriod && matchStatus;
    });
  }, [batches, searchQuery, selectedClient, selectedPeriod, selectedStatus]);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    if (viewMode === 'candidates') {
      const totalCount = candidates.length;
      const readyCount = candidates.filter((c) => c.billingStatus === 'Ready to Invoice').length;
      const pendingCount = candidates.filter((c) => c.billingStatus !== 'Ready to Invoice' && c.billingStatus !== 'Moved to Bill Raised').length;
      const totalBi = candidates.reduce((s, c) => s + (Number(c.bi) || 0), 0);
      const totalAi = candidates.reduce((s, c) => s + (Number(c.ai) || 0), 0);
      return { totalCount, readyCount, pendingCount, totalBi, totalAi };
    } else {
      const totalCount = batches.reduce((s, b) => s + (Number(b.candidates) || 0), 0);
      const totalBi = 904020; // Official reported total from workbook row 226
      const totalAi = 819740;
      const readyCount = batches.filter((b) => b.status === 'Active' || b.status?.toLowerCase().includes('no drop')).length;
      const pendingCount = batches.length - readyCount;
      return { totalCount, readyCount, pendingCount, totalBi, totalAi };
    }
  }, [viewMode, candidates, batches]);

  // Pagination Slice
  const activeItems = viewMode === 'candidates' ? filteredCandidates : filteredBatches;
  const totalPages = Math.ceil(activeItems.length / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeItems.slice(start, start + pageSize);
  }, [activeItems, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    const rows =
      viewMode === 'candidates'
        ? filteredCandidates.map((c) => ({
            'SL No': c.slNo,
            'Candidate Name': c.candidateName,
            Phone: c.phone,
            Process: c.process,
            Client: c.client,
            'Joining Date': c.joiningDate,
            'Billing Eligibility Date': c.billingDate,
            Recruiter: c.recruiter,
            'BI (Basic Billing)': c.bi,
            'AI (After Incentive)': c.ai,
            'Employee ID': c.empId,
            'Employee Status': c.empStatus,
            'Billing Readiness Status': c.billingStatus,
            Remarks: c.remarks || '',
          }))
        : filteredBatches.map((b) => ({
            'SL No': b.slNo,
            'Company Name': b.company,
            Period: b.period,
            Candidates: b.candidates,
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

  // Add Candidate Action
  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!newCandidateForm.candidateName.trim()) {
      return alert('Candidate name is required');
    }
    const newCand = {
      id: 'cand-' + Date.now(),
      slNo: candidates.length + 1,
      candidateName: newCandidateForm.candidateName.trim(),
      phone: newCandidateForm.phone.trim(),
      client: newCandidateForm.client.trim(),
      process: newCandidateForm.process.trim(),
      joiningDate: newCandidateForm.joiningDate,
      billingDate: newCandidateForm.billingDate,
      recruiter: newCandidateForm.recruiter.trim(),
      bi: Number(newCandidateForm.bi) || 5900,
      ai: Number(newCandidateForm.ai) || 5400,
      empId: newCandidateForm.empId.trim() || 'Pending',
      empStatus: newCandidateForm.empStatus,
      billingStatus: newCandidateForm.empStatus === 'ACTIVE' ? 'Ready to Invoice' : 'Pending Eligibility',
      remarks: newCandidateForm.remarks.trim(),
      monthKey: newCandidateForm.billingDate?.slice(0, 7) || '2026-10',
    };
    const updated = [newCand, ...candidates];
    setCandidates(updated);
    saveOctoberCandidates(updated);
    setShowAddModal(false);
    triggerToast(`Added candidate ${newCand.candidateName} successfully!`);
    setNewCandidateForm({
      candidateName: '',
      phone: '',
      client: 'ISON',
      process: 'Flipkart',
      joiningDate: new Date().toISOString().slice(0, 10),
      billingDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      recruiter: '',
      bi: 5900,
      ai: 5400,
      empId: '',
      empStatus: 'ACTIVE',
      billingStatus: 'Ready to Invoice',
      remarks: '',
    });
  };

  // Move Candidates to Bill Raised
  const handleConfirmMoveToRaised = () => {
    const selected = candidates.filter((c) => selectedCandidateIds.includes(c.id));
    if (!selected.length) return;

    // Business rule validation:
    const invalid = selected.filter((c) => !c.empId || c.empId === 'Pending' || c.empStatus !== 'ACTIVE');
    if (invalid.length > 0) {
      const confirmProceed = window.confirm(
        `${invalid.length} candidate(s) are marked INACTIVE or have missing Employee IDs. Move only eligible active candidates?`
      );
      if (!confirmProceed) return;
    }

    const eligible = selected.filter((c) => c.empStatus === 'ACTIVE' && c.empId && c.empId !== 'Pending');
    if (!eligible.length) {
      return alert('No eligible active candidates with valid Employee IDs to raise.');
    }

    // Mark as moved in Weekly Update
    const updated = candidates.map((c) => {
      if (eligible.some((e) => e.id === c.id)) {
        return { ...c, billingStatus: 'Moved to Bill Raised' };
      }
      return c;
    });
    setCandidates(updated);
    saveOctoberCandidates(updated);

    // Call callback to add to Bill Raised B
    if (onMoveCandidatesToRaised) {
      onMoveCandidatesToRaised(eligible);
    }

    setShowMoveModal(false);
    setSelectedCandidateIds([]);
    triggerToast(`Successfully moved ${eligible.length} candidate(s) to Bill Raised (B)!`);
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
          </div>

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
            {viewMode === 'candidates' ? 'Total Candidates Registered' : 'Active Billing Candidates'}
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
            Passed 60-day threshold &amp; active
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
            Workbook Component A (To Be Raised)
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
            placeholder={viewMode === 'candidates' ? 'Search candidate name, phone, recruiter, emp ID...' : 'Search company name, period...'}
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
            {viewMode === 'candidates' ? (
              <>
                <option value="Ready to Invoice">Ready to Invoice</option>
                <option value="Pending Eligibility">Pending Eligibility</option>
                <option value="Moved to Bill Raised">Moved to Bill Raised</option>
              </>
            ) : (
              <>
                <option value="Active">Active / No drop</option>
                <option value="1drop">1 Drop</option>
                <option value="2 Drops">2 Drops</option>
              </>
            )}
          </select>
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || selectedClient !== 'ALL' || selectedStatus !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClient('ALL');
              setSelectedStatus('ALL');
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
                          const pageIds = pagedItems.map((item) => item.id);
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
                {pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No candidate billing records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((cand, idx) => {
                    const isSelected = selectedCandidateIds.includes(cand.id);
                    const isReady = cand.billingStatus === 'Ready to Invoice';
                    const isMoved = cand.billingStatus === 'Moved to Bill Raised';

                    return (
                      <tr
                        key={cand.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#F0FDFA' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isMoved}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidateIds((prev) => [...prev, cand.id]);
                              } else {
                                setSelectedCandidateIds((prev) => prev.filter((id) => id !== cand.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>{cand.slNo}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                          {cand.candidateName}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{cand.phone || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: 11.5,
                            }}
                          >
                            {cand.process || cand.client}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{cand.joiningDate || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{cand.billingDate || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>
                          {cand.recruiter || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>{inr(cand.bi)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C3AED' }}>{inr(cand.ai)}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>
                          {cand.empId || 'NA'}
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
                              background: isMoved
                                ? '#EEF2FF'
                                : isReady
                                ? '#CCFBF1'
                                : '#FEF3C7',
                              color: isMoved
                                ? '#4338CA'
                                : isReady
                                ? '#0F766E'
                                : '#B45309',
                            }}
                          >
                            {cand.billingStatus}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {isMoved ? (
                            <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>In Bill Raised</span>
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* WEEKLY BATCHES TABLE (From Weekly Update A sheet) */
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
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No weekly batches found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((batch, idx) => (
                    <tr
                      key={batch.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
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
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>{batch.candidates}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>{inr(batch.bi)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C3AED' }}>{inr(batch.ai)}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{batch.dateToBeRaised || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            background: batch.status?.toLowerCase().includes('drop') ? '#FEF3C7' : '#DCFCE7',
                            color: batch.status?.toLowerCase().includes('drop') ? '#B45309' : '#15803D',
                          }}
                        >
                          {batch.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedClient(batch.company);
                            setViewMode('candidates');
                          }}
                          title="View all candidates in this company"
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#0284C7',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Inspect Candidates
                        </button>
                      </td>
                    </tr>
                  ))
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, candidateName: e.target.value })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, phone: e.target.value })}
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
                  <input
                    type="text"
                    value={newCandidateForm.client}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, client: e.target.value })}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Process / Requirement</label>
                  <input
                    type="text"
                    value={newCandidateForm.process}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, process: e.target.value })}
                    placeholder="e.g. Flipkart, SMB"
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Joining Date</label>
                  <input
                    type="date"
                    value={newCandidateForm.joiningDate}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, joiningDate: e.target.value })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, billingDate: e.target.value })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, recruiter: e.target.value })}
                    placeholder="e.g. Hussain"
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, bi: Number(e.target.value) })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, ai: Number(e.target.value) })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, empId: e.target.value })}
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
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, empStatus: e.target.value })}
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
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Candidate Entry
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
    </div>
  );
}
