'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatSheetDateDisplay } from '@/lib/candidate-dates';
import { gstBreakdown } from '@/lib/client-invoice-rules';

const TABS = [
  { id: 'to_raise', label: 'To be raised' },
  { id: 'raised', label: 'Bill Raised' },
  { id: 'cleared', label: 'Bills cleared' },
  { id: 'gst', label: 'GST' },
];

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cegs_token') : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function groupByClient(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.client || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return [...map.entries()];
}

export function FinanceInvoicesView() {
  const [tab, setTab] = useState('to_raise');
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState('');
  const [gstClient, setGstClient] = useState('ALL');
  const [selected, setSelected] = useState([]);
  const [raiseForm, setRaiseForm] = useState({
    invoiceDate: '',
    invoiceNo: '',
    revisedRequested: '',
    revisedSent: '',
    status: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client-invoices', { headers: authHeaders() });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(data.error || 'Could not load invoices');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => {
    const keys = new Set(
      rows.filter((r) => r.stage === 'to_raise' && r.monthKey).map((r) => r.monthKey)
    );
    return [...keys].sort();
  }, [rows]);

  useEffect(() => {
    if (!month && months.length) setMonth(months[months.length - 1]);
  }, [month, months]);

  const openToRaise = useMemo(
    () =>
      rows.filter(
        (r) => r.stage === 'to_raise' && !r.invoiceId && (!month || r.monthKey === month)
      ),
    [rows, month]
  );
  const raised = useMemo(() => rows.filter((r) => r.stage === 'raised'), [rows]);
  const cleared = useMemo(() => rows.filter((r) => r.stage === 'cleared'), [rows]);
  const gstRows = useMemo(() => {
    const list = rows.filter((r) => r.stage === 'raised' || r.stage === 'cleared');
    if (gstClient === 'ALL') return list;
    return list.filter((r) => (r.client || '') === gstClient);
  }, [rows, gstClient]);
  const gstClients = useMemo(
    () => [...new Set(rows.filter((r) => r.stage !== 'to_raise').map((r) => r.client || '—'))],
    [rows]
  );

  const patch = async (id, body) => {
    const res = await fetch(`/api/client-invoices/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
      return;
    }
    const updated = await res.json();
    setRows((prev) => prev.map((r) => (String(r.id) === String(id) ? { ...r, ...updated } : r)));
  };

  const raise = async () => {
    setError('');
    const res = await fetch('/api/client-invoices', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'raise', ids: selected, ...raiseForm }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not raise invoice');
      return;
    }
    setSelected([]);
    setRaiseForm({ invoiceDate: '', invoiceNo: '', revisedRequested: '', revisedSent: '', status: '' });
    setTab('raised');
    await load();
  };

  const removeInvoice = async (id) => {
    if (!window.confirm('Remove this invoice? The joiner rows return to To be raised.')) return;
    const res = await fetch(`/api/client-invoices/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not delete');
      return;
    }
    await load();
  };

  return (
    <div className="feature-page finance-invoices">
      <PageHeader
        title="Finance & Invoices"
        purpose="Candidates who stay 8 weeks move here from the Joiner Sheet. Raise the client bill, then mark it cleared."
      />
      {error ? <p className="finance-error">{error}</p> : null}
      <div className="finance-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'is-active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-secondary">Loading sheet…</p> : null}

      {tab === 'to_raise' && !loading && (
        <>
          <div className="finance-toolbar">
            <label>
              Month
              <select className="form-input" value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.length === 0 ? <option value="">No billing month yet</option> : null}
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            {selected.length > 0 && (
              <span className="finance-selected">{selected.length} selected</span>
            )}
          </div>
          {openToRaise.length === 0 ? (
            <p className="text-secondary">No candidates are due this month. A joiner appears after 56 days if they are still in the company.</p>
          ) : (
            <ToRaiseTable
              rows={openToRaise}
              selected={selected}
              setSelected={setSelected}
              onSave={patch}
            />
          )}
          {selected.length > 0 && (
            <div className="finance-raise">
              <strong>Raise invoice for the selected rows (one client)</strong>
              <div className="finance-raise-grid">
                <input className="form-input" placeholder="Date of invoice" value={raiseForm.invoiceDate} onChange={(e) => setRaiseForm({ ...raiseForm, invoiceDate: e.target.value })} />
                <input className="form-input" placeholder="Invoice No" value={raiseForm.invoiceNo} onChange={(e) => setRaiseForm({ ...raiseForm, invoiceNo: e.target.value })} />
                <input className="form-input" placeholder="Revised invoice requested" value={raiseForm.revisedRequested} onChange={(e) => setRaiseForm({ ...raiseForm, revisedRequested: e.target.value })} />
                <input className="form-input" placeholder="Revised invoice sent" value={raiseForm.revisedSent} onChange={(e) => setRaiseForm({ ...raiseForm, revisedSent: e.target.value })} />
                <input className="form-input" placeholder="Status" value={raiseForm.status} onChange={(e) => setRaiseForm({ ...raiseForm, status: e.target.value })} />
              </div>
              <button type="button" className="btn btn-primary" onClick={raise}>Raise bill</button>
            </div>
          )}
        </>
      )}

      {tab === 'raised' && !loading && (
        <InvoiceTable
          rows={raised}
          mode="raised"
          onSave={patch}
          onClear={(row) => patch(row.id, { stage: 'cleared' })}
          onDelete={removeInvoice}
        />
      )}

      {tab === 'cleared' && !loading && (
        <InvoiceTable rows={cleared} mode="cleared" onSave={patch} onDelete={removeInvoice} />
      )}

      {tab === 'gst' && !loading && (
        <>
          <div className="finance-toolbar">
            <label>
              Client
              <select className="form-input" value={gstClient} onChange={(e) => setGstClient(e.target.value)}>
                <option value="ALL">All clients</option>
                {gstClients.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <GstTable rows={gstRows} onSave={patch} />
        </>
      )}
    </div>
  );
}

function CellInput({ value, onCommit, type = 'text' }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  return (
    <input
      className="finance-cell"
      type={type}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (String(text) === String(value ?? '')) return;
        onCommit(type === 'number' ? Number(text) || 0 : text);
      }}
    />
  );
}

function ToRaiseTable({ rows, selected, setSelected, onSave }) {
  const groups = groupByClient(rows);
  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  return (
    <div className="finance-sheet">
      <table>
        <thead>
          <tr>
            <th />
            <th>SL No</th>
            <th>Candidate Name</th>
            <th>Ph number</th>
            <th>Client</th>
            <th>Joining Date</th>
            <th>Billing Date</th>
            <th>Recruiter</th>
            <th>BI</th>
            <th>AI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([client, list]) => {
            const bi = list.reduce((s, r) => s + (Number(r.bi) || 0), 0);
            const ai = list.reduce((s, r) => s + (Number(r.ai) || 0), 0);
            return (
              <Fragment key={client}>
                {list.map((row, i) => (
                  <tr key={row.id}>
                    <td data-label="">
                      <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                    </td>
                    <td data-label="SL No">{i + 1}</td>
                    <td data-label="Candidate Name">{row.candidateName}</td>
                    <td data-label="Ph number">{row.phone}</td>
                    <td data-label="Client">{client}</td>
                    <td data-label="Joining Date">{formatSheetDateDisplay(row.joiningDate)}</td>
                    <td data-label="Billing Date">{formatSheetDateDisplay(row.billingDate)}</td>
                    <td data-label="Recruiter">{row.recruiter}</td>
                    <td data-label="BI">
                      <CellInput type="number" value={row.bi || ''} onCommit={(v) => onSave(row.id, { bi: v })} />
                    </td>
                    <td data-label="AI">
                      <CellInput type="number" value={row.ai || ''} onCommit={(v) => onSave(row.id, { ai: v })} />
                    </td>
                    <td data-label="Status">
                      <CellInput value={row.status} onCommit={(v) => onSave(row.id, { status: v })} />
                    </td>
                  </tr>
                ))}
                <tr className="finance-total">
                  <td colSpan={8}>Total · {client}</td>
                  <td>{inr(bi)}</td>
                  <td>{inr(ai)}</td>
                  <td />
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceTable({ rows, mode, onSave, onClear, onDelete }) {
  const groups = groupByClient(rows);
  const grandBi = rows.reduce((s, r) => s + (Number(r.bi) || 0), 0);
  const grandAi = rows.reduce((s, r) => s + (Number(r.ai) || 0), 0);
  const grandCount = rows.reduce((s, r) => s + (Number(r.candidateCount) || 0), 0);
  if (!rows.length) return <p className="text-secondary">Nothing in this sheet yet.</p>;
  return (
    <div className="finance-sheet">
      <table>
        <thead>
          <tr>
            <th>No of candidates</th>
            <th>Date of invoice</th>
            {mode === 'raised' ? <th>Revised invoice requested</th> : null}
            {mode === 'raised' ? <th>Revised Invoice sent</th> : null}
            <th>Invoice No</th>
            <th>CLIENT</th>
            <th>BI</th>
            <th>AI</th>
            <th>Status</th>
            {mode === 'cleared' ? <th>Gst status</th> : null}
            {mode === 'cleared' ? <th>Gst amt status</th> : null}
            <th />
          </tr>
        </thead>
        <tbody>
          {groups.map(([client, list]) => {
            const bi = list.reduce((s, r) => s + (Number(r.bi) || 0), 0);
            const ai = list.reduce((s, r) => s + (Number(r.ai) || 0), 0);
            return (
              <Fragment key={client}>
                {list.map((row) => (
                  <tr key={row.id}>
                    <td data-label="No of candidates">{row.candidateCount}</td>
                    <td data-label="Date of invoice">
                      <CellInput value={row.invoiceDate} onCommit={(v) => onSave(row.id, { invoiceDate: v })} />
                    </td>
                    {mode === 'raised' ? (
                      <td data-label="Revised invoice requested">
                        <CellInput value={row.revisedRequested} onCommit={(v) => onSave(row.id, { revisedRequested: v })} />
                      </td>
                    ) : null}
                    {mode === 'raised' ? (
                      <td data-label="Revised Invoice sent">
                        <CellInput value={row.revisedSent} onCommit={(v) => onSave(row.id, { revisedSent: v })} />
                      </td>
                    ) : null}
                    <td data-label="Invoice No">
                      <CellInput value={row.invoiceNo} onCommit={(v) => onSave(row.id, { invoiceNo: v })} />
                    </td>
                    <td data-label="CLIENT">{client}</td>
                    <td data-label="BI">{inr(row.bi)}</td>
                    <td data-label="AI">{inr(row.ai)}</td>
                    <td data-label="Status">
                      <CellInput value={row.status} onCommit={(v) => onSave(row.id, { status: v })} />
                    </td>
                    {mode === 'cleared' ? (
                      <td data-label="Gst status">
                        <CellInput value={row.gstStatus} onCommit={(v) => onSave(row.id, { gstStatus: v })} />
                      </td>
                    ) : null}
                    {mode === 'cleared' ? (
                      <td data-label="Gst amt status">
                        <CellInput value={row.gstAmtStatus} onCommit={(v) => onSave(row.id, { gstAmtStatus: v })} />
                      </td>
                    ) : null}
                    <td data-label="">
                      {mode === 'raised' ? (
                        <button type="button" className="btn btn-sm btn-dark" onClick={() => onClear(row)}>Mark cleared</button>
                      ) : null}
                      <button type="button" className="btn btn-sm" onClick={() => onDelete(row.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
                <tr className="finance-total">
                  <td colSpan={mode === 'raised' ? 6 : 4}>Total · {client}</td>
                  <td>{inr(bi)}</td>
                  <td>{inr(ai)}</td>
                  <td colSpan={mode === 'cleared' ? 3 : 2} />
                </tr>
              </Fragment>
            );
          })}
          <tr className="finance-grand">
            <td>{grandCount}</td>
            <td colSpan={mode === 'raised' ? 5 : 3}>Total</td>
            <td>{inr(grandBi)}</td>
            <td>{inr(grandAi)}</td>
            <td colSpan={mode === 'cleared' ? 3 : 2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function GstTable({ rows, onSave }) {
  if (!rows.length) return <p className="text-secondary">GST rows appear after a bill is raised.</p>;
  const totals = rows.reduce(
    (acc, row) => {
      const g = gstBreakdown(row.basicAmount, row.moneyReceived);
      acc.basic += Number(row.basicAmount) || 0;
      acc.gst += g.gstAmount;
      acc.total += g.totalInvoice;
      acc.tds += g.tdsAmount;
      acc.need += g.needToReceive;
      acc.received += Number(row.moneyReceived) || 0;
      acc.diff += g.diff;
      return acc;
    },
    { basic: 0, gst: 0, total: 0, tds: 0, need: 0, received: 0, diff: 0 }
  );
  return (
    <div className="finance-sheet">
      <table>
        <thead>
          <tr>
            <th>Sl. No</th>
            <th>Date of invoice</th>
            <th>Invoice No</th>
            <th>GST Number</th>
            <th>Client Name</th>
            <th>Basic amount</th>
            <th>GST @ 18%</th>
            <th>Total invoice value</th>
            <th>TDS @ 10%</th>
            <th>We need to receive</th>
            <th>Money received from Client</th>
            <th>Diff</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const g = gstBreakdown(row.basicAmount, row.moneyReceived);
            return (
              <tr key={row.id}>
                <td data-label="Sl. No">{i + 1}</td>
                <td data-label="Date of invoice">{row.invoiceDate}</td>
                <td data-label="Invoice No">{row.invoiceNo}</td>
                <td data-label="GST Number">
                  <CellInput value={row.gstNumber} onCommit={(v) => onSave(row.id, { gstNumber: v })} />
                </td>
                <td data-label="Client Name">{row.client}</td>
                <td data-label="Basic amount">
                  <CellInput type="number" value={row.basicAmount || ''} onCommit={(v) => onSave(row.id, { basicAmount: v })} />
                </td>
                <td data-label="GST @ 18%">{inr(g.gstAmount)}</td>
                <td data-label="Total invoice value">{inr(g.totalInvoice)}</td>
                <td data-label="TDS @ 10%">{inr(g.tdsAmount)}</td>
                <td data-label="We need to receive">{inr(g.needToReceive)}</td>
                <td data-label="Money received">
                  <CellInput type="number" value={row.moneyReceived || ''} onCommit={(v) => onSave(row.id, { moneyReceived: v })} />
                </td>
                <td data-label="Diff">{inr(g.diff)}</td>
                <td data-label="Remark">
                  <CellInput value={row.remark} onCommit={(v) => onSave(row.id, { remark: v })} />
                </td>
              </tr>
            );
          })}
          <tr className="finance-grand">
            <td colSpan={5}>Total</td>
            <td>{inr(totals.basic)}</td>
            <td>{inr(totals.gst)}</td>
            <td>{inr(totals.total)}</td>
            <td>{inr(totals.tds)}</td>
            <td>{inr(totals.need)}</td>
            <td>{inr(totals.received)}</td>
            <td>{inr(totals.diff)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <p className="finance-note">
        GST to be received: {inr(totals.gst)}. TDS @ 10%: {inr(totals.tds)}. We need to receive is basic minus TDS. Diff is that amount minus money received.
      </p>
    </div>
  );
}
