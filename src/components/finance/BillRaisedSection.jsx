'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  Eye,
  Edit3,
  CheckCircle,
  Clock,
  History,
  FileText,
  DollarSign,
  Filter,
  X,
  AlertTriangle,
  Building,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  inr,
  calculateDraftInvoice,
  getInitialRaisedInvoices,
  saveRaisedInvoices,
  getClientPocs,
  extractMonthKey,
  getCurrentMonthKey,
  formatMonthLabel,
  sortItemsByCurrentMonthFirst,
} from '@/lib/finance-data';

export function BillRaisedSection({ onInvoiceCleared, onNavigateToCleared }) {
  const [invoices, setInvoices] = useState(getInitialRaisedInvoices);
  const pocs = useMemo(() => getClientPocs(), []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Modals
  const [viewInvoice, setViewInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [recordPaymentModal, setRecordPaymentModal] = useState(null);
  const [revisionModal, setRevisionModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [newRevisionNumber, setNewRevisionNumber] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Client Options
  const clientOptions = useMemo(() => {
    const set = new Set();
    invoices.forEach((inv) => inv.client && set.add(inv.client));
    return Array.from(set).sort();
  }, [invoices]);

  // Available billing months from invoices
  const availableMonths = useMemo(() => {
    const set = new Set();
    const curKey = getCurrentMonthKey();
    set.add(curKey);
    invoices.forEach((inv) => {
      const k = extractMonthKey(inv.invoiceDate || inv.dueDate);
      if (k) set.add(k);
    });
    return Array.from(set).sort().reverse();
  }, [invoices]);

  // Filtered Invoices (Current Month entries shown first)
  const filteredInvoices = useMemo(() => {
    const list = invoices.filter((inv) => {
      const matchSearch =
        !searchQuery ||
        inv.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.remarks?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClient = selectedClient === 'ALL' || inv.client?.toLowerCase() === selectedClient.toLowerCase();
      const matchStatus = selectedStatus === 'ALL' || inv.status?.toLowerCase() === selectedStatus.toLowerCase();
      const invMonth = extractMonthKey(inv.invoiceDate || inv.dueDate);
      const matchMonth = selectedMonth === 'ALL' || invMonth === selectedMonth;
      return matchSearch && matchClient && matchStatus && matchMonth;
    });

    return sortItemsByCurrentMonthFirst(list, (inv) => inv.invoiceDate || inv.dueDate);
  }, [invoices, searchQuery, selectedClient, selectedStatus, selectedMonth]);

  // Metrics
  const metrics = useMemo(() => {
    const count = invoices.length;
    const totalBi = invoices.reduce((s, i) => s + (Number(i.bi) || 0), 0);
    const totalAi = invoices.reduce((s, i) => s + (Number(i.ai) || 0), 0);
    const totalReceived = invoices.reduce((s, i) => s + (Number(i.actualReceipt) || 0), 0);
    const totalPending = invoices.reduce((s, i) => s + (Number(i.outstandingBalance) || 0), 0);
    const overdueCount = invoices.filter((i) => i.status === 'Overdue' || (Number(i.outstandingBalance) > 0 && i.dueDate?.includes('Past'))).length;

    return { count, totalBi, totalAi, totalReceived, totalPending, overdueCount };
  }, [invoices]);

  // Client POC Lookup
  const getPocForClient = (clientName) => {
    if (!clientName) return null;
    const normalized = clientName.toLowerCase();
    return (
      pocs.find((p) => normalized.includes(p.client.toLowerCase()) || p.client.toLowerCase().includes(normalized)) || null
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredInvoices.length) return triggerToast('No records to export');
    const rows = filteredInvoices.map((inv) => ({
      'Invoice No': inv.invoiceNo,
      Client: inv.client,
      'Invoice Date': inv.invoiceDate,
      Candidates: inv.candidateCount,
      'BI (Basic)': inv.bi,
      'AI (Net)': inv.ai,
      'Basic Amount': inv.basicAmount,
      'GST (18%)': inv.gstAmount,
      'Total Value': inv.totalInvoiceValue,
      'TDS (10%)': inv.tdsAmount,
      'Expected Receipt': inv.expectedReceipt,
      'Actual Receipt': inv.actualReceipt,
      'Outstanding Balance': inv.outstandingBalance,
      'Due Date': inv.dueDate,
      Status: inv.status,
      'GST Status': inv.gstStatus,
      'TDS Status': inv.tdsStatus,
      'Revised Requested': inv.revisedRequested,
      'Revised Sent': inv.revisedSent,
      Remarks: inv.remarks || '',
    }));

    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CEGS_Bill_Raised_B_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Exported CSV successfully!');
  };

  // Record Payment Handler
  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!recordPaymentModal) return;
    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) return alert('Enter a valid payment amount');

    const updated = invoices.map((inv) => {
      if (inv.id === recordPaymentModal.id) {
        const prevReceipt = Number(inv.actualReceipt) || 0;
        const newReceipt = prevReceipt + amt;
        const newBal = Math.max(0, (Number(inv.expectedReceipt) || 0) - newReceipt);
        const isFullyCleared = newBal === 0;

        const updatedInv = {
          ...inv,
          actualReceipt: newReceipt,
          outstandingBalance: newBal,
          status: isFullyCleared ? 'Cleared' : 'Partially Paid',
          paymentReference: paymentRef || inv.paymentReference || 'NEFT-' + Date.now(),
        };

        // If fully cleared, notify parent callback to move to Bill Cleared
        if (isFullyCleared && onInvoiceCleared) {
          onInvoiceCleared(updatedInv);
        }

        return updatedInv;
      }
      return inv;
    });

    setInvoices(updated);
    saveRaisedInvoices(updated);
    setRecordPaymentModal(null);
    setPaymentAmount('');
    setPaymentRef('');
    triggerToast(`Recorded payment of ${inr(amt)} successfully!`);
  };

  // Create Revised Invoice Handler
  const handleCreateRevision = (e) => {
    e.preventDefault();
    if (!revisionModal) return;
    const revNo = newRevisionNumber.trim() || `${revisionModal.invoiceNo}-R1`;

    const updated = invoices.map((inv) => {
      if (inv.id === revisionModal.id) {
        const history = inv.revisionHistory ? [...inv.revisionHistory] : [];
        history.push(`Revised to ${revNo} on ${new Date().toISOString().slice(0, 10)}: ${revisionNotes}`);

        return {
          ...inv,
          invoiceNo: revNo,
          revisedRequested: new Date().toISOString().slice(0, 10),
          revisedSent: new Date().toISOString().slice(0, 10),
          status: 'Revised Invoice Issued',
          remarks: revisionNotes ? `${inv.remarks ? inv.remarks + ' | ' : ''}Revised: ${revisionNotes}` : inv.remarks,
          revisionHistory: history,
        };
      }
      return inv;
    });

    setInvoices(updated);
    saveRaisedInvoices(updated);
    setRevisionModal(null);
    setRevisionNotes('');
    setNewRevisionNumber('');
    triggerToast(`Created revision ${revNo} successfully! Previous version preserved in audit history.`);
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

      {/* HEADER & CONTROLS */}
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
              Bill Raised (B) — Invoices Issued &amp; Outstanding Register
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 99,
                background: '#FEF3C7',
                color: '#B45309',
              }}
            >
              Section 2 (B)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Tracks generated client tax invoices, GST &amp; TDS deductions, payment settlements, and audited version revisions.
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* SUMMARY KPI CARDS (Section 5 requirements) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {/* CARD 1: Number of Invoices Raised */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Invoices Raised</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{metrics.count}</div>
          <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Active issued invoices</div>
        </div>

        {/* CARD 2: Total BI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total BI (Basic Invoice)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{inr(metrics.totalBi)}</div>
          <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600, marginTop: 4 }}>
            Detail sheet total (₹2,82,860)
          </div>
        </div>

        {/* CARD 3: Total AI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total AI (Net Margin)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>{inr(metrics.totalAi)}</div>
          <div style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: 600, marginTop: 4 }}>
            Net earnings post incentive
          </div>
        </div>

        {/* CARD 4: Total Amount Received */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Amount Received</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {inr(metrics.totalReceived)}
          </div>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>Direct bank credit</div>
        </div>

        {/* CARD 5: Total Pending Amount */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Outstanding Balance</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {inr(metrics.totalPending)}
          </div>
          <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600, marginTop: 4 }}>Awaiting client clearance</div>
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
            placeholder="Search invoice number, client, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Client:</span>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: 12.5,
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
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

        {/* Month Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: 12.5,
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Raised">Raised</option>
            <option value="Revised">Revised</option>
            <option value="Cleared">Cleared</option>
          </select>
        </div>

        {(searchQuery || selectedClient !== 'ALL' || selectedStatus !== 'ALL' || selectedMonth !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClient('ALL');
              setSelectedStatus('ALL');
              setSelectedMonth('ALL');
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

      {/* INVOICES DATA TABLE */}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}>INVOICE NO</th>
                <th style={{ padding: '12px 14px' }}>CLIENT &amp; POC</th>
                <th style={{ padding: '12px 14px' }}>INVOICE DATE</th>
                <th style={{ padding: '12px 14px' }}>CANDIDATES</th>
                <th style={{ padding: '12px 14px' }}>BASIC AMOUNT</th>
                <th style={{ padding: '12px 14px' }}>GST @ 18%</th>
                <th style={{ padding: '12px 14px' }}>TOTAL VALUE</th>
                <th style={{ padding: '12px 14px' }}>TDS @ 10%</th>
                <th style={{ padding: '12px 14px' }}>EXPECTED RECEIPT</th>
                <th style={{ padding: '12px 14px' }}>ACTUAL RECEIPT</th>
                <th style={{ padding: '12px 14px' }}>OUTSTANDING</th>
                <th style={{ padding: '12px 14px' }}>STATUS</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    No raised invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const poc = getPocForClient(inv.client);
                  const isCleared = inv.status === 'Cleared';
                  const hasRevision = Boolean(inv.revisedRequested || inv.revisedSent || inv.revisionHistory?.length);

                  return (
                    <tr
                      key={inv.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {inv.invoiceNo}
                        {hasRevision && (
                          <span
                            title="Invoice has revisions"
                            style={{
                              marginLeft: 6,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: '#FEF3C7',
                              color: '#92400E',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            REV
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{inv.client}</div>
                        {poc && (
                          <div style={{ fontSize: 11, color: '#0F766E', marginTop: 2 }}>
                            POC: {poc.billingPocName || poc.hrPocName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{inv.invoiceDate}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {inv.candidateCount} Seats
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>{inr(inv.basicAmount)}</td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>{inr(inv.gstAmount)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>
                        {inr(inv.totalInvoiceValue)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#D97706' }}>{inr(inv.tdsAmount)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0D9488' }}>
                        {inr(inv.expectedReceipt)}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>
                        {inr(inv.actualReceipt)}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          fontWeight: 800,
                          color: inv.outstandingBalance > 0 ? '#DC2626' : '#15803D',
                        }}
                      >
                        {inr(inv.outstandingBalance)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isCleared ? '#DCFCE7' : '#FEF3C7',
                            color: isCleared ? '#15803D' : '#B45309',
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {/* VIEW DETAILS */}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            title="View Invoice Details"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          {/* RECORD PAYMENT */}
                          <button
                            onClick={() => {
                              setRecordPaymentModal(inv);
                              setPaymentAmount(inv.outstandingBalance || inv.expectedReceipt);
                            }}
                            title="Record Payment / Settle"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #C7D2FE',
                              background: '#EEF2FF',
                              color: '#4338CA',
                              fontWeight: 700,
                              fontSize: 11.5,
                              cursor: 'pointer',
                            }}
                          >
                            Pay
                          </button>

                          {/* REVISION BUTTON */}
                          <button
                            onClick={() => {
                              setRevisionModal(inv);
                              setNewRevisionNumber(`${inv.invoiceNo}-R1`);
                            }}
                            title="Create Audited Revision"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#64748B',
                              cursor: 'pointer',
                            }}
                          >
                            <History size={13} />
                          </button>
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

      {/* MODAL: RECORD PAYMENT */}
      {recordPaymentModal && (
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
              maxWidth: 480,
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
                Record Payment for {recordPaymentModal.invoiceNo}
              </h3>
              <button
                onClick={() => setRecordPaymentModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Client:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{recordPaymentModal.client}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>Expected Receipt:</span>
                  <span style={{ fontWeight: 700, color: '#0D9488' }}>{inr(recordPaymentModal.expectedReceipt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Current Outstanding:</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>{inr(recordPaymentModal.outstandingBalance)}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Payment Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    marginTop: 4,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Payment Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. NEFT-HDFC-9918239"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setRecordPaymentModal(null)}
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
                    background: '#059669',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE REVISED INVOICE */}
      {revisionModal && (
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
              maxWidth: 500,
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
                Create Revised Invoice for {revisionModal.invoiceNo}
              </h3>
              <button
                onClick={() => setRevisionModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRevision} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>New Revised Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={newRevisionNumber}
                  onChange={(e) => setNewRevisionNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Revision Reason / Audit Remarks *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Client requested candidate seat adjustment from 7 to 6 seats per email confirmation."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setRevisionModal(null)}
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
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Revision &amp; Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW INVOICE DETAILS */}
      {viewInvoice && (
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
              maxWidth: 580,
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
                Invoice Details: {viewInvoice.invoiceNo}
              </h3>
              <button
                onClick={() => setViewInvoice(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>CLIENT</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{viewInvoice.client}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>INVOICE DATE</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{viewInvoice.invoiceDate}</div>
                </div>
              </div>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  padding: 14,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: '#64748B' }}>Basic Amount</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#2563EB', marginTop: 2 }}>
                    {inr(viewInvoice.basicAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>GST @ 18%</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginTop: 2 }}>
                    {inr(viewInvoice.gstAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>TDS @ 10%</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#D97706', marginTop: 2 }}>
                    {inr(viewInvoice.tdsAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>Gross Value</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginTop: 2 }}>
                    {inr(viewInvoice.totalInvoiceValue)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>Expected Receipt</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0D9488', marginTop: 2 }}>
                    {inr(viewInvoice.expectedReceipt)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>Outstanding</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#DC2626', marginTop: 2 }}>
                    {inr(viewInvoice.outstandingBalance)}
                  </div>
                </div>
              </div>

              {viewInvoice.revisionHistory?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Revision &amp; Audit History:
                  </div>
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 12,
                      color: '#92400E',
                    }}
                  >
                    {viewInvoice.revisionHistory.map((h, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        • {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewInvoice.remarks && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Remarks:</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{viewInvoice.remarks}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  onClick={() => setViewInvoice(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
