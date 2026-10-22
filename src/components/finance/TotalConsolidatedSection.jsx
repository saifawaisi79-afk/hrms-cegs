'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Download,
  Calendar,
  Building,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  inr,
  TOTAL_ABCD_METRICS,
  WORKBOOK_DISCREPANCIES,
  CLIENT_WISE_SUMMARY,
} from '@/lib/finance-data';

export function TotalConsolidatedSection({ onDrillDownTab }) {
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [expandedDiscrepancy, setExpandedDiscrepancy] = useState('disc-1');
  const [bDetailMode, setBDetailMode] = useState('summary'); // 'summary' (₹2,29,760) vs 'detail' (₹2,82,860)

  // Computed metrics depending on toggle
  const currentB = bDetailMode === 'summary' ? TOTAL_ABCD_METRICS.B_raised_awaiting.summaryAi : TOTAL_ABCD_METRICS.B_raised_awaiting.detailAi;
  const currentGrandTotal =
    TOTAL_ABCD_METRICS.A_to_be_raised.ai +
    currentB +
    TOTAL_ABCD_METRICS.C_gst_to_receive.amount +
    TOTAL_ABCD_METRICS.D_tds_to_receive.amount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER & PERIOD SELECTION */}
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
              Total (A+B+C+D) — Consolidated Financial &amp; Tax Reconciliation
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 99,
                background: '#F3E8FF',
                color: '#7E22CE',
              }}
            >
              Section 4 (Consolidated)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Consolidates to-be-raised receivables, issued invoices awaiting credit, recoverable GST ledgers, and audited TDS balances.
          </p>
        </div>

        {/* PERIOD DROPDOWN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Consolidated Periods (2024 – 2026)</option>
            <option value="2026">Financial Year 2025-2026</option>
            <option value="2025">Financial Year 2024-2025</option>
            <option value="OCT26">October 2026 Active Cycle</option>
          </select>
        </div>
      </div>

      {/* 4 CORE COMPONENT CARDS (A, B, C, D) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
        }}
      >
        {/* CARD A: To Be Raised */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '20px 22px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: '#0D9488',
            }}
          />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0F766E', textTransform: 'uppercase' }}>
                Component A
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#FEF3C7',
                  color: '#B45309',
                }}
              >
                Provisional
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>To Be Raised Invoices</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F766E', marginTop: 8 }}>
              {inr(TOTAL_ABCD_METRICS.A_to_be_raised.ai)}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
              BI: {inr(TOTAL_ABCD_METRICS.A_to_be_raised.bi)} (147 Candidates)
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={() => onDrillDownTab && onDrillDownTab('weekly')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0D9488',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span>Drill down to Weekly Update (A)</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* CARD B: Raised & Awaiting Receipt */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '20px 22px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: '#D97706',
            }}
          />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                Component B
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#FEE2E2',
                  color: '#B91C1C',
                }}
              >
                Needs Review
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
              Raised &amp; Awaiting Receipt
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#B45309', marginTop: 8 }}>
              {inr(bDetailMode === 'summary' ? TOTAL_ABCD_METRICS.B_raised_awaiting.summaryAi : TOTAL_ABCD_METRICS.B_raised_awaiting.detailAi)}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
              BI: {inr(bDetailMode === 'summary' ? TOTAL_ABCD_METRICS.B_raised_awaiting.summaryBi : TOTAL_ABCD_METRICS.B_raised_awaiting.detailBi)} (8 Invoices)
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={() => onDrillDownTab && onDrillDownTab('raised')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#D97706',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span>Drill down to Bill Raised (B)</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* CARD C: GST to Be Received */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '20px 22px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: '#2563EB',
            }}
          />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
                Component C
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#DCFCE7',
                  color: '#15803D',
                }}
              >
                Reconciled
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>GST to Be Received</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 8 }}>
              {inr(TOTAL_ABCD_METRICS.C_gst_to_receive.amount)}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
              Across 11 client GST statement sheets
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11.5, color: '#64748B' }}>Excludes cash invoice value</span>
          </div>
        </div>

        {/* CARD D: TDS to Be Received */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '20px 22px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: '#7C3AED',
            }}
          />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase' }}>
                Component D
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#DCFCE7',
                  color: '#15803D',
                }}
              >
                Reconciled
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>TDS to Be Received</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED', marginTop: 8 }}>
              {inr(TOTAL_ABCD_METRICS.D_tds_to_receive.amount)}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
              1st April 2024 to 31st March 2026
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11.5, color: '#64748B' }}>To claim via Form 16 / 26AS</span>
          </div>
        </div>
      </div>

      {/* CONSOLIDATED GRAND TOTAL BANNER (Section 7 Formula) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 99,
                background: '#0D9488',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              FORMULA: Total(A[AI] + B[AI] + C + D)
            </span>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>Grand Financial Position</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 8, color: '#38BDF8' }}>
            {inr(currentGrandTotal)}
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 4 }}>
            Subtotal AI (A + B): <strong>{inr(TOTAL_ABCD_METRICS.A_to_be_raised.ai + currentB)}</strong> · Tax Components (C + D):{' '}
            <strong>{inr(TOTAL_ABCD_METRICS.subtotal_tax)}</strong>
          </div>
        </div>

        {/* TOGGLE FOR SUMMARY VS DETAIL RECONCILIATION */}
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: '12px 16px',
            maxWidth: 340,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', marginBottom: 6 }}>
            Component B Valuation View:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setBDetailMode('summary')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: bDetailMode === 'summary' ? '#38BDF8' : 'rgba(255,255,255,0.12)',
                color: bDetailMode === 'summary' ? '#0F172A' : '#E2E8F0',
              }}
            >
              Source Summary ({inr(TOTAL_ABCD_METRICS.grand_total)})
            </button>
            <button
              onClick={() => setBDetailMode('detail')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: bDetailMode === 'detail' ? '#38BDF8' : 'rgba(255,255,255,0.12)',
                color: bDetailMode === 'detail' ? '#0F172A' : '#E2E8F0',
              }}
            >
              Detail Ledger (+₹53.1K)
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            Toggle reconciles the ₹53,100 Invoice 246 delta between Summary sheet and Detail sheet.
          </div>
        </div>
      </div>

      {/* RECONCILIATION & DISCREPANCIES AUDIT PANEL (Mandatory Section 7 Requirement) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <AlertTriangle size={20} color="#D97706" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
            Workbook Source Audit &amp; Reconciliation Discrepancy Register
          </h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
          As required by the Finance &amp; Invoices architecture specification, all 4 material discrepancies from the
          client financial workbooks are surfaced transparently with status indicators and drill-down links.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WORKBOOK_DISCREPANCIES.map((disc) => {
            const isExpanded = expandedDiscrepancy === disc.id;

            return (
              <div
                key={disc.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  onClick={() => setExpandedDiscrepancy(isExpanded ? null : disc.id)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: disc.severity === 'warning' ? '#FEF3C7' : '#E0F2FE',
                        color: disc.severity === 'warning' ? '#B45309' : '#0369A1',
                      }}
                    >
                      {disc.section}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{disc.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{disc.summary}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', fontSize: 12.5, color: '#334155' }}>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Audit Findings:</strong> {disc.detail}
                    </div>
                    <div style={{ fontSize: 12, color: '#0D9488', fontWeight: 600 }}>
                      ✓ <strong>System Safeguard:</strong> {disc.action}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CLIENT-WISE CONSOLIDATED SUMMARY TABLE */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              Client-Wise Financial Position &amp; Reconciliation Table
            </h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Click on any client total to drill down into the underlying records
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              background: '#EEF2FF',
              color: '#4338CA',
            }}
          >
            {CLIENT_WISE_SUMMARY.length} Tied-Up Clients
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}>CLIENT / COMPANY</th>
                <th style={{ padding: '12px 14px' }}>TO BE RAISED (A) BI</th>
                <th style={{ padding: '12px 14px' }}>TO BE RAISED (A) AI</th>
                <th style={{ padding: '12px 14px' }}>RAISED (B) BI</th>
                <th style={{ padding: '12px 14px' }}>RAISED (B) AI</th>
                <th style={{ padding: '12px 14px' }}>GST PENDING (C)</th>
                <th style={{ padding: '12px 14px' }}>TDS PENDING (D)</th>
                <th style={{ padding: '12px 14px' }}>CLEARED TOTAL</th>
                <th style={{ padding: '12px 14px' }}>RECONCILIATION</th>
                <th style={{ padding: '12px 14px' }}>LAST UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {CLIENT_WISE_SUMMARY.map((c, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    background: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{c.client}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{c.poc}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F766E' }}>{inr(c.toBeRaisedBi)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F766E' }}>{inr(c.toBeRaisedAi)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#B45309' }}>
                    {c.raisedAwaitingBi > 0 ? inr(c.raisedAwaitingBi) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#B45309' }}>
                    {c.raisedAwaitingAi > 0 ? inr(c.raisedAwaitingAi) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>
                    {c.gstPending > 0 ? inr(c.gstPending) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C3AED' }}>
                    {c.tdsPending > 0 ? inr(c.tdsPending) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>{inr(c.clearedTotal)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        background: c.reconciliation === 'Reconciled' ? '#DCFCE7' : '#FEF3C7',
                        color: c.reconciliation === 'Reconciled' ? '#15803D' : '#B45309',
                      }}
                    >
                      {c.reconciliation}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{c.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
