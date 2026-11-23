'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Download,
  Check,
  X,
  Shield,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Send,
  Building,
  Users,
} from 'lucide-react';
import { normalizeCandidateDate, formatSheetDateDisplay } from '@/lib/candidate-dates';
import { formatDateDMY } from '@/lib/date-format';

const GLOBAL_API_BASE = '/api';

function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function InvoiceApprovalsView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState('pending_me'); // 'all' | 'pending_me' | 'approved' | 'rejected'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { invoice, action: 'approve' | 'reject' }
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Read authenticated user
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('cegs_user');
        if (u) setUser(JSON.parse(u));
      } catch {}
    }
  }, []);

  const isSuperAdmin = useMemo(() => {
    return (user?.role || '').toLowerCase() === 'super_admin';
  }, [user]);

  const isRaheel = useMemo(() => {
    const empId = String(user?.employee_id || '').toUpperCase();
    const name = String(user?.name || '').toLowerCase();
    return empId === 'EMP0005' || name.includes('raheel');
  }, [user]);

  const canApprove = isSuperAdmin || isRaheel;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('cegs_token') || '' : ''}`,
    };
  }, []);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GLOBAL_API_BASE}/client-invoices`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load client invoices.');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // Focus on raised/cleared client invoices with invoiceNo
      const raisedInvoices = list.filter((inv) => inv.stage === 'raised' || inv.stage === 'cleared' || inv.invoiceNo);
      setInvoices(raisedInvoices);
    } catch (err) {
      console.error('Invoice fetch error:', err);
      setError(err.message || 'Error fetching invoices.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Determine user's individual approval status on an invoice
  const myApprovalStatus = useCallback(
    (inv) => {
      if (!canApprove) return 'viewer';
      if (isSuperAdmin) {
        return inv.approvals?.superAdmin?.status || 'pending';
      }
      if (isRaheel) {
        return inv.approvals?.recruiter?.status || 'pending';
      }
      return 'pending';
    },
    [canApprove, isSuperAdmin, isRaheel]
  );

  // Check if invoice is approved by either approver (Raheel or Super Admin)
  const isInvoiceApproved = useCallback((inv) => {
    return (
      inv.approvalStatus === 'approved' ||
      inv.approvals?.recruiter?.status === 'approved' ||
      inv.approvals?.superAdmin?.status === 'approved'
    );
  }, []);

  const isInvoiceRejected = useCallback((inv) => {
    return (
      inv.approvalStatus === 'rejected' &&
      inv.approvals?.recruiter?.status !== 'approved' &&
      inv.approvals?.superAdmin?.status !== 'approved'
    );
  }, []);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const myStatus = myApprovalStatus(inv);
      const isApproved = isInvoiceApproved(inv);
      const isRejected = isInvoiceRejected(inv);

      if (tabFilter === 'pending_me') {
        if (canApprove) {
          if (myStatus !== 'pending') return false;
        } else {
          if (isApproved) return false;
        }
      } else if (tabFilter === 'approved') {
        if (!isApproved) return false;
      } else if (tabFilter === 'rejected') {
        if (!isRejected) return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        String(inv.invoiceNo || '').toLowerCase().includes(q) ||
        String(inv.client || '').toLowerCase().includes(q) ||
        String(inv.projectMilestone || '').toLowerCase().includes(q) ||
        String(inv.candidateName || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, tabFilter, search, myApprovalStatus, canApprove, isInvoiceApproved, isInvoiceRejected]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let pendingMe = 0;
    let approved = 0;
    let rejected = 0;

    invoices.forEach((inv) => {
      const myStatus = myApprovalStatus(inv);
      const approvedOk = isInvoiceApproved(inv);
      const rejectedOk = isInvoiceRejected(inv);
      if (canApprove) {
        if (myStatus === 'pending') pendingMe++;
      } else {
        if (!approvedOk) pendingMe++;
      }
      if (approvedOk) approved++;
      if (rejectedOk) rejected++;
    });

    return { all: invoices.length, pendingMe, approved, rejected };
  }, [invoices, myApprovalStatus, canApprove, isInvoiceApproved, isInvoiceRejected]);

  // Handle Approve or Reject submission
  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { invoice, action } = actionModal;
    setSubmitting(true);
    try {
      const res = await fetch(`${GLOBAL_API_BASE}/client-invoices/${invoice.id || invoice._id}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action,
          notes: actionNotes.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit approval.');
      }

      showToast(
        action === 'approve'
          ? `✓ Invoice #${invoice.invoiceNo} successfully approved!`
          : `Invoice #${invoice.invoiceNo} rejected (changes requested).`
      );

      setActionModal(null);
      setActionNotes('');
      await fetchInvoices();
    } catch (err) {
      console.error('Submit action error:', err);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: '24px 20px', fontFamily: 'inherit' }}>
      {/* Top Banner & Title */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: 24,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 10 }}>
            <Shield size={14} /> Invoice Verification Governance
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Client Invoice Approvals & Verification
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94A3B8', maxWidth: 700 }}>
            Before the finance team can email client invoices, approval is required from either{' '}
            <strong style={{ color: '#F8FAFC' }}>Mohammed Raheel (EMP0005 • Recruiter)</strong> or{' '}
            <strong style={{ color: '#F8FAFC' }}>Super Admin</strong>. Approval from either one immediately unlocks the invoice for emailing.
          </p>
        </div>

        {/* Current User Status Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 14,
            padding: '12px 18px',
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>
            Logged In As
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={16} color={canApprove ? '#10B981' : '#F59E0B'} />
            <span>{user?.name || 'Authorized User'}</span>
          </div>
          <div style={{ fontSize: 12, color: canApprove ? '#34D399' : '#CBD5E1', marginTop: 2 }}>
            {isSuperAdmin
              ? '👑 Super Admin Approver'
              : isRaheel
              ? '🎯 Lead Recruiter Approver (EMP0005)'
              : '👀 Viewing Access Only'}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Invoices</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{tabCounts.all}</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Generated by Finance</div>
        </div>

        <div style={{ background: '#FFFBEB', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #FDE68A', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Awaiting Action
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#92400E', marginTop: 4 }}>{tabCounts.pendingMe}</div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
            {canApprove ? 'Awaiting your approval' : 'Pending approvals'}
          </div>
        </div>

        <div style={{ background: '#ECFDF5', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #A7F3D0', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> Approved (Unlocked)
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#065F46', marginTop: 4 }}>{tabCounts.approved}</div>
          <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Unlocked for emailing to client</div>
        </div>

        <div style={{ background: '#FEF2F2', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #FECACA', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <XCircle size={14} /> Changes Requested
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#991B1B', marginTop: 4 }}>{tabCounts.rejected}</div>
          <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>Sent back to Finance for revision</div>
        </div>
      </div>

      {/* Main Content Card */}
      <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Filter Bar */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          {/* Tabs */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 4, borderRadius: 12, gap: 4 }}>
            {[
              { key: 'pending_me', label: canApprove ? 'Awaiting My Review' : 'Pending Approval', count: tabCounts.pendingMe },
              { key: 'all', label: 'All Invoices', count: tabCounts.all },
              { key: 'approved', label: 'Approved (Unlocked)', count: tabCounts.approved },
              { key: 'rejected', label: 'Changes Requested', count: tabCounts.rejected },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTabFilter(tab.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: tabFilter === tab.key ? 800 : 600,
                  border: 'none',
                  background: tabFilter === tab.key ? '#FFFFFF' : 'transparent',
                  color: tabFilter === tab.key ? '#0F172A' : '#64748B',
                  boxShadow: tabFilter === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 99,
                    background: tabFilter === tab.key ? '#F1F5F9' : '#E2E8F0',
                    color: tabFilter === tab.key ? '#0F172A' : '#64748B',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px', maxWidth: 420 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search invoice #, client, milestone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="button"
              onClick={fetchInvoices}
              title="Refresh invoices"
              disabled={loading}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Invoice Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px' }}>Invoice #</th>
                <th style={{ padding: '12px 18px' }}>Client & Project</th>
                <th style={{ padding: '12px 18px' }}>Amount</th>
                <th style={{ padding: '12px 18px' }}>Due Date</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Raheel (EMP0005)</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Super Admin</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Overall Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                      <RefreshCw size={18} className="spin" /> Loading invoices for approval...
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>No invoices match this filter.</div>
                    <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
                      {tabFilter === 'pending_me'
                        ? '🎉 Great job! No invoices currently awaiting your approval.'
                        : 'No invoices found.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const recApp = inv.approvals?.recruiter || { status: 'pending' };
                  const saApp = inv.approvals?.superAdmin || { status: 'pending' };
                  const isFullyApproved = isInvoiceApproved(inv);
                  const isRejected = isInvoiceRejected(inv);
                  const userApproved =
                    (isSuperAdmin && saApp.status === 'approved') ||
                    (isRaheel && recApp.status === 'approved');

                  return (
                    <tr
                      key={inv.id || inv._id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                    >
                      {/* Invoice No */}
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={15} color="#0284C7" />
                          <span>{inv.invoiceNo || 'INV-DRAFT'}</span>
                        </div>
                        {inv.invoiceDate && (
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>
                            Date: {formatSheetDateDisplay(inv.invoiceDate) || inv.invoiceDate}
                          </div>
                        )}
                      </td>

                      {/* Client & Project */}
                      <td style={{ padding: '14px 18px', minWidth: 220 }}>
                        <div style={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building size={14} color="#64748B" />
                          <span>{inv.client || 'Client Company'}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {inv.projectMilestone || 'Placement & Seat Billing'}
                          {inv.candidateCount ? (
                            <strong style={{ color: '#0F172A', marginLeft: 4 }}>({inv.candidateCount} Seats)</strong>
                          ) : null}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        <div>{inr(inv.amount || inv.basicAmount)}</div>
                        {inv.basicAmount && inv.amount && inv.amount !== inv.basicAmount ? (
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                            Basic: {inr(inv.basicAmount)} + GST
                          </div>
                        ) : null}
                      </td>

                      {/* Due Date */}
                      <td style={{ padding: '14px 18px', color: '#475569', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {formatSheetDateDisplay(inv.dueDate) || inv.dueDate || '30 days'}
                      </td>

                      {/* Mohammed Raheel (EMP0005) Approval Badge */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {recApp.status === 'approved' ? (
                          <span
                            title={`Approved by Mohammed raheel on ${recApp.approvedAt ? formatDateDMY(recApp.approvedAt) : ''}\nNotes: ${recApp.notes || 'None'}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        ) : recApp.status === 'rejected' ? (
                          <span
                            title={`Changes requested: ${recApp.notes || 'None'}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FEF2F2',
                              color: '#991B1B',
                              border: '1px solid #FECACA',
                            }}
                          >
                            <XCircle size={13} /> Rejected
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <Clock size={13} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Super Admin Approval Badge */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {saApp.status === 'approved' ? (
                          <span
                            title={`Approved by Super Admin on ${saApp.approvedAt ? formatDateDMY(saApp.approvedAt) : ''}\nNotes: ${saApp.notes || 'None'}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        ) : saApp.status === 'rejected' ? (
                          <span
                            title={`Changes requested: ${saApp.notes || 'None'}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FEF2F2',
                              color: '#991B1B',
                              border: '1px solid #FECACA',
                            }}
                          >
                            <XCircle size={13} /> Rejected
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 9px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <Clock size={13} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isFullyApproved ? (
                          <span
                            title="Approved! Email option unlocked for finance team."
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 800,
                              background: '#059669',
                              color: '#FFFFFF',
                            }}
                          >
                            <CheckCircle2 size={13} /> Ready to Email
                          </span>
                        ) : isRejected ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 800,
                              background: '#DC2626',
                              color: '#FFFFFF',
                            }}
                          >
                            <XCircle size={13} /> Changes Needed
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 99,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <Clock size={13} /> Awaiting Approval
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Analyse Button */}
                          <button
                            type="button"
                            onClick={() => setAnalysisModal(inv)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Analyse full invoice breakdown and candidate placements"
                          >
                            <Eye size={13} />
                            <span>Analyse</span>
                          </button>

                          {/* Approval Actions for Raheel or Super Admin */}
                          {canApprove && (
                            <>
                              {!userApproved ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionModal({ invoice: inv, action: 'approve' });
                                      setActionNotes('');
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 8,
                                      border: 'none',
                                      background: '#059669',
                                      color: '#FFFFFF',
                                      fontSize: 12,
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                                    }}
                                  >
                                    <Check size={13} />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionModal({ invoice: inv, action: 'reject' });
                                      setActionNotes('');
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: 8,
                                      border: '1px solid #FCA5A5',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <X size={13} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionModal({ invoice: inv, action: 'reject' });
                                    setActionNotes('');
                                  }}
                                  title="Change decision / request revisions"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid #E2E8F0',
                                    background: '#F8FAFC',
                                    color: '#64748B',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Modal (Examine Full Candidates & GST Breakdown) */}
      {analysisModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setAnalysisModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#38BDF8', fontWeight: 700 }}>
                  Detailed Placement Analysis
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>
                  Invoice #{analysisModal.invoiceNo || 'INV'} · {analysisModal.client}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnalysisModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Financial & GST Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  background: '#F8FAFC',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>CLIENT GSTIN</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {analysisModal.clientGstin || 'Unspecified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>BASIC AMOUNT</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {inr(analysisModal.basicAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>SGST + CGST (18%)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                    {inr((analysisModal.sgstAmount || 0) + (analysisModal.cgstAmount || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>TOTAL INVOICE AMOUNT</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#059669', marginTop: 2 }}>
                    {inr(analysisModal.amount || analysisModal.basicAmount)}
                  </div>
                </div>
              </div>

              {/* Placements Candidate Table */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} color="#0284C7" />
                  <span>Candidate Placements & Seats ({analysisModal.items?.length || analysisModal.candidateCount || 0} Total)</span>
                </div>

                {Array.isArray(analysisModal.items) && analysisModal.items.length > 0 ? (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                          <th style={{ padding: '8px 12px' }}>#</th>
                          <th style={{ padding: '8px 12px' }}>Employee Name</th>
                          <th style={{ padding: '8px 12px' }}>Emp Code</th>
                          <th style={{ padding: '8px 12px' }}>Process / LOB</th>
                          <th style={{ padding: '8px 12px' }}>DOJ</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisModal.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>{it.employeeName || it.name || 'Candidate'}</td>
                            <td style={{ padding: '8px 12px', color: '#64748B' }}>{it.empId || '—'}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{it.processLob || it.designation || 'Customer Support'}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{formatSheetDateDisplay(it.doj) || it.doj || '—'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{inr(it.ratePerSeat || it.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, fontSize: 12.5, color: '#64748B', border: '1px dashed #CBD5E1' }}>
                    Standard placement billing of {analysisModal.candidateCount || 1} seat(s) under milestone: <strong>{analysisModal.projectMilestone}</strong>.
                  </div>
                )}
              </div>

              {/* Approval History Box */}
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 10 }}>
                  Approval Audit History
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Mohammed Raheel (EMP0005)</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: analysisModal.approvals?.recruiter?.status === 'approved' ? '#059669' : '#B45309' }}>
                      Status: {analysisModal.approvals?.recruiter?.status?.toUpperCase() || 'PENDING'}
                    </div>
                    {analysisModal.approvals?.recruiter?.approvedAt && (
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        At: {formatDateDMY(analysisModal.approvals.recruiter.approvedAt)} {new Date(analysisModal.approvals.recruiter.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {analysisModal.approvals?.recruiter?.notes && (
                      <div style={{ fontSize: 11.5, color: '#334155', marginTop: 4, fontStyle: 'italic' }}>
                        &ldquo;{analysisModal.approvals.recruiter.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Super Admin</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: analysisModal.approvals?.superAdmin?.status === 'approved' ? '#059669' : '#B45309' }}>
                      Status: {analysisModal.approvals?.superAdmin?.status?.toUpperCase() || 'PENDING'}
                    </div>
                    {analysisModal.approvals?.superAdmin?.approvedAt && (
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        At: {formatDateDMY(analysisModal.approvals.superAdmin.approvedAt)} {new Date(analysisModal.approvals.superAdmin.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {analysisModal.approvals?.superAdmin?.notes && (
                      <div style={{ fontSize: 11.5, color: '#334155', marginTop: 4, fontStyle: 'italic' }}>
                        &ldquo;{analysisModal.approvals.superAdmin.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a
                href={`/api/client-invoices/download-pdf?invoiceNo=${encodeURIComponent(analysisModal.invoiceNo || '')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#0284C7',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Download size={14} /> Download Official PDF
              </a>

              <button
                type="button"
                onClick={() => setAnalysisModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
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

      {/* Approve / Reject Decision Modal */}
      {actionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !submitting && setActionModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 22px',
                background:
                  actionModal.action === 'approve'
                    ? 'linear-gradient(135deg, #065F46 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #991B1B 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {actionModal.action === 'approve' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                    {actionModal.action === 'approve' ? 'Approve Invoice' : 'Request Changes / Reject'}
                  </h4>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    Invoice #{actionModal.invoice.invoiceNo} · {actionModal.invoice.client}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setActionModal(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {actionModal.action === 'approve' ? 'Approval Remarks (Optional)' : 'Reason for Rejection / Changes Needed *'}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionModal.action === 'approve'
                    ? 'e.g. Candidate placements and seat billing verified.'
                    : 'e.g. Please correct Shaista Riyaz process rate before billing.'
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ padding: '14px 22px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActionModal(null)}
                style={{ padding: '8px 16px', borderRadius: 99, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (actionModal.action === 'reject' && !actionNotes.trim())}
                onClick={handleActionSubmit}
                style={{
                  padding: '8px 20px',
                  borderRadius: 99,
                  border: 'none',
                  background: actionModal.action === 'approve' ? '#059669' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: actionModal.action === 'approve' ? '0 4px 12px rgba(5,150,105,0.3)' : '0 4px 12px rgba(220,38,38,0.3)',
                }}
              >
                {submitting ? 'Submitting...' : actionModal.action === 'approve' ? 'Confirm Approval' : 'Send Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999999,
            padding: '12px 20px',
            borderRadius: 14,
            background: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

