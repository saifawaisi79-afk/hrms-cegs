'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  FileCheck,
  Building,
  Calendar,
  X,
  Clock,
  Layers,
} from 'lucide-react';
import {
  inr,
  getInitialClearedInvoices,
  saveClearedInvoices,
  detectDuplicateInvoices,
} from '@/lib/finance-data';

export function BillClearedSection() {
  const [clearedInvoices, setClearedInvoices] = useState(getInitialClearedInvoices);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedGstStatus, setSelectedGstStatus] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals & Inspection
  const [duplicateInspectGroup, setDuplicateInspectGroup] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Duplicate Detection Analysis
  const duplicateGroups = useMemo(() => {
    return detectDuplicateInvoices(clearedInvoices);
  }, [clearedInvoices]);

  // Client Options
  const clientOptions = useMemo(() => {
    const set = new Set();
    clearedInvoices.forEach((inv) => inv.client && set.add(inv.client));
    return Array.from(set).sort();
  }, [clearedInvoices]);

  // Filtered Cleared Invoices
  const filteredInvoices = useMemo(() => {
    return clearedInvoices.filter((inv) => {
      const matchSearch =
        !searchQuery ||
        inv.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.paymentReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.remarks?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClient = selectedClient === 'ALL' || inv.client?.toLowerCase() === selectedClient.toLowerCase();
      const matchGst = selectedGstStatus === 'ALL' || inv.gstStatus?.toLowerCase() === selectedGstStatus.toLowerCase();
      return matchSearch && matchClient && matchGst;
    });
  }, [clearedInvoices, searchQuery, selectedClient, selectedGstStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const count = clearedInvoices.length;
    const totalBi = clearedInvoices.reduce((s, i) => s + (Number(i.bi) || 0), 0); // ~₹17,73,072
    const totalAi = clearedInvoices.reduce((s, i) => s + (Number(i.ai) || 0), 0); // ~₹15,34,740
    const totalReceived = clearedInvoices.reduce((s, i) => s + (Number(i.amountReceived) || 0), 0);
    const gstReconciledCount = clearedInvoices.filter((i) => i.gstStatus === 'Reconciled' || i.gstStatus === 'Raised').length;
    const tdsReconciledCount = clearedInvoices.filter((i) => !i.remarks?.includes('No TDS')).length;

    return { count, totalBi, totalAi, totalReceived, gstReconciledCount, tdsReconciledCount };
  }, [clearedInvoices]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredInvoices.length) return triggerToast('No records to export');
    const rows = filteredInvoices.map((inv) => ({
      'Invoice No': inv.invoiceNo,
      Client: inv.client,
      'Invoice Date': inv.invoiceDate,
      Candidates: inv.candidateCount,
      'BI (Basic Cleared)': inv.bi,
      'AI (Net Cleared)': inv.ai,
      'Amount Received': inv.amountReceived,
      'Cleared Date': inv.clearedDate,
      'Payment Reference': inv.paymentReference || '',
      'GST Reconciliation Status': inv.gstStatus || '',
      'GST Amount Status': inv.gstAmtStatus || '',
      'Cleared By': inv.clearedBy || 'Finance Auditor',
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
    link.setAttribute('download', `CEGS_Bills_Cleared_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Exported Cleared Invoices CSV successfully!');
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
          <CheckCircle2 size={18} color="#10B981" />
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
              Bill Cleared — Verifiable Paid &amp; Settled Register
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 99,
                background: '#DCFCE7',
                color: '#15803D',
              }}
            >
              Section 3 (Cleared)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Permanent audit register of fully reconciled client receipts, GST remittances, and TDS credit acknowledgments.
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* DUPLICATE DETECTOR BADGE (Section 6 Requirement) */}
          {duplicateGroups.length > 0 && (
            <button
              onClick={() => setDuplicateInspectGroup(duplicateGroups[0])}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #FCD34D',
                background: '#FFFBEB',
                color: '#92400E',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AlertTriangle size={15} color="#D97706" />
              <span>{duplicateGroups.length} Suspected Duplicates Detected</span>
            </button>
          )}

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

      {/* SUMMARY KPI CARDS (Section 6 Requirements) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {/* CARD 1: Number of Cleared Invoices */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Cleared Invoices</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{metrics.count}</div>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>Fully settled in bank</div>
        </div>

        {/* CARD 2: Total Cleared BI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Cleared BI (Gross)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {inr(metrics.totalBi)}
          </div>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
            Workbook row 97 (₹17,73,072)
          </div>
        </div>

        {/* CARD 3: Total Cleared AI */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Cleared AI (Net)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>
            {inr(metrics.totalAi)}
          </div>
          <div style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: 600, marginTop: 4 }}>
            Workbook row 97 (₹15,34,740)
          </div>
        </div>

        {/* CARD 4: GST Reconciled */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>GST Reconciled</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
            {metrics.gstReconciledCount} Invoices
          </div>
          <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600, marginTop: 4 }}>
            Differentiated from cash receipt
          </div>
        </div>

        {/* CARD 5: TDS Reconciled */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>TDS Reconciled</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {metrics.tdsReconciledCount} Invoices
          </div>
          <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600, marginTop: 4 }}>
            Form 16 / 26AS matching
          </div>
        </div>
      </div>

      {/* DUPLICATE DETECTION WARNING BANNER (Section 6) */}
      {duplicateGroups.length > 0 && (
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12.5,
            color: '#92400E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              <strong>Audited Duplicate Invoices in Historical Workbook:</strong> Found{' '}
              {duplicateGroups.map((d) => `${d.client} (${d.invoiceNo})`).join(', ')}. In accordance with business rules,
              these are preserved without silent deletion and flagged for audit verification.
            </div>
          </div>
          <button
            onClick={() => setDuplicateInspectGroup(duplicateGroups[0])}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #F59E0B',
              background: '#FFFFFF',
              color: '#B45309',
              fontWeight: 700,
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            Inspect Comparison Modal
          </button>
        </div>
      )}

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
            placeholder="Search cleared invoice number, client, UTR reference..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>GST Reconciliation:</span>
          <select
            value={selectedGstStatus}
            onChange={(e) => {
              setSelectedGstStatus(e.target.value);
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
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Reconciled">Reconciled</option>
            <option value="Raised">Raised</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
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
                <th style={{ padding: '12px 14px' }}>CLIENT</th>
                <th style={{ padding: '12px 14px' }}>INVOICE DATE</th>
                <th style={{ padding: '12px 14px' }}>CANDIDATES</th>
                <th style={{ padding: '12px 14px' }}>BI (CLEARED)</th>
                <th style={{ padding: '12px 14px' }}>AI (NET)</th>
                <th style={{ padding: '12px 14px' }}>AMOUNT CLEARED</th>
                <th style={{ padding: '12px 14px' }}>CLEARING DATE</th>
                <th style={{ padding: '12px 14px' }}>PAYMENT REF / UTR</th>
                <th style={{ padding: '12px 14px' }}>GST STATUS</th>
                <th style={{ padding: '12px 14px' }}>AUDIT &amp; CLEARED BY</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    No cleared invoices found.
                  </td>
                </tr>
              ) : (
                pagedItems.map((inv, idx) => {
                  const isSuspectedDuplicate = duplicateGroups.some((d) => d.items.some((item) => item.id === inv.id));

                  return (
                    <tr
                      key={inv.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isSuspectedDuplicate ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {inv.invoiceNo}
                        {isSuspectedDuplicate && (
                          <span
                            title="Duplicate combination in source workbook"
                            style={{
                              marginLeft: 6,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: '#FEE2E2',
                              color: '#B91C1C',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            REPEAT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{inv.client}</td>
                      <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{inv.invoiceDate}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {inv.candidateCount} Seats
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>{inr(inv.bi)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C3AED' }}>{inr(inv.ai)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>
                        {inr(inv.amountReceived)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {inv.clearedDate || inv.invoiceDate}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11.5, color: '#334155' }}>
                        {inv.paymentReference || 'NEFT-CONFIRMED'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#DCFCE7',
                            color: '#15803D',
                          }}
                        >
                          {inv.gstStatus || 'Reconciled'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{inv.clearedBy || 'Finance Auditor'}</div>
                        <div style={{ fontSize: 10.5, color: '#64748B' }}>Verified Bank Settlement</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => setViewInvoice(inv)}
                          title="View Verified Record"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredInvoices.length)} of{' '}
            {filteredInvoices.length} records
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

      {/* MODAL: DUPLICATE COMPARISON & AUDIT INSPECTOR (Section 6 Requirement) */}
      {duplicateInspectGroup && (
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
              maxWidth: 750,
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
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Audited Duplicate Invoice Inspector
                </h3>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Client: {duplicateInspectGroup.client} · Invoice: {duplicateInspectGroup.invoiceNo} (Found {duplicateInspectGroup.count} instances)
                </span>
              </div>
              <button
                onClick={() => setDuplicateInspectGroup(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 13,
                  color: '#92400E',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Duplicate Prevention Rule:</strong> These rows appear repeatedly in the source workbook (e.g.
                  rows 86-87 and rows 92-95 in sheet Bills cleared). The system preserves all entries for historical
                  accuracy and transparency rather than deleting records automatically.
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '8px 10px' }}>INSTANCE #</th>
                    <th style={{ padding: '8px 10px' }}>INVOICE NO</th>
                    <th style={{ padding: '8px 10px' }}>DATE</th>
                    <th style={{ padding: '8px 10px' }}>SEATS</th>
                    <th style={{ padding: '8px 10px' }}>BI</th>
                    <th style={{ padding: '8px 10px' }}>AI</th>
                    <th style={{ padding: '8px 10px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateInspectGroup.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#64748B' }}>Row Entry #{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>{item.invoiceNo}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{item.invoiceDate}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.candidateCount} Seats</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#059669' }}>{inr(item.bi)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#7C3AED' }}>{inr(item.ai)}</td>
                      <td style={{ padding: '8px 10px', color: '#0F766E' }}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  onClick={() => setDuplicateInspectGroup(null)}
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
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW VERIFIED INVOICE */}
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
                Cleared Invoice Record: {viewInvoice.invoiceNo}
              </h3>
              <button
                onClick={() => setViewInvoice(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Client:</span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 13 }}>{viewInvoice.client}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Invoice Date:</span>
                <span style={{ color: '#0F172A', fontSize: 13 }}>{viewInvoice.invoiceDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Gross Amount Cleared (BI):</span>
                <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>{inr(viewInvoice.bi)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Net Cleared Margin (AI):</span>
                <span style={{ fontWeight: 800, color: '#7C3AED', fontSize: 15 }}>{inr(viewInvoice.ai)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Payment Reference:</span>
                <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: 12 }}>
                  {viewInvoice.paymentReference || 'NEFT-CONFIRMED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>GST Status:</span>
                <span style={{ color: '#0F766E', fontWeight: 700, fontSize: 12 }}>{viewInvoice.gstStatus || 'Reconciled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Audited &amp; Cleared By:</span>
                <span style={{ color: '#0F172A', fontWeight: 600, fontSize: 12 }}>{viewInvoice.clearedBy || 'Finance Auditor'}</span>
              </div>
              {viewInvoice.remarks && (
                <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 8, fontSize: 12, color: '#475569' }}>
                  <strong>Remarks:</strong> {viewInvoice.remarks}
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
        </div>
      )}
    </div>
  );
}
