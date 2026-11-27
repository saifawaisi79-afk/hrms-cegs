'use client';

import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

export function CompanyManagerModal({ isOpen, onClose, onCompaniesUpdated }) {
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.success && Array.isArray(data.companies)) {
        setCompanies(data.companies);
        if (onCompaniesUpdated) {
          onCompaniesUpdated(data.names || data.companies.map((c) => c.name));
        }
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      setStatusMessage(null);
      setNewCompanyName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCompany = async (e) => {
    e?.preventDefault();
    const cleanName = newCompanyName.trim().toUpperCase();
    if (!cleanName) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid company name.' });
      return;
    }

    if (companies.some((c) => c.name.toUpperCase() === cleanName)) {
      setStatusMessage({ type: 'error', text: `"${cleanName}" already exists in the company list.` });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanies(data.companies || []);
        const names = data.names || data.companies?.map((c) => c.name);
        if (onCompaniesUpdated) onCompaniesUpdated(names);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hrms:companies_updated', { detail: names }));
        }
        setNewCompanyName('');
        setStatusMessage({ type: 'success', text: `✓ "${cleanName}" added to company options successfully!` });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to add company.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while adding company.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCompany = async (company) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${company.name}"?\n\nIt will be removed from all dropdown options across candidate sheets and joiners.`
    );
    if (!confirmDelete) return;

    setStatusMessage(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: company.id, name: company.name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanies(data.companies || []);
        const names = data.names || data.companies?.map((c) => c.name);
        if (onCompaniesUpdated) onCompaniesUpdated(names);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hrms:companies_updated', { detail: names }));
        }
        setStatusMessage({ type: 'success', text: `✓ "${company.name}" removed from company options.` });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to remove company.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while removing company.' });
    }
  };

  return (
    <div
      className="modal-backdrop-safe"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-scroll-card"
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'modalSlideUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 12,
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>Manage Hiring Companies</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                Add or remove company names for dropdowns & Joiner Sheet filter tabs
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#F1F5F9',
              borderRadius: 99,
              width: 32,
              height: 32,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                background: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: statusMessage.type === 'success' ? '#047857' : '#B91C1C',
                border: `1px solid ${statusMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Add Company Form */}
          <form onSubmit={handleAddCompany} style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Add New Company Name
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. TECH MAHINDRA, WIPRO, INFOSYS"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value.toUpperCase())}
                style={{
                  flex: '1 1 180px',
                  minWidth: 0,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13.5,
                  fontWeight: 700,
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
              <button
                type="submit"
                disabled={submitting || !newCompanyName.trim()}
                style={{
                  background: submitting ? '#94A3B8' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  flex: '0 1 auto',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                <Plus size={16} />
                <span>{submitting ? 'Adding...' : 'Add Company'}</span>
              </button>
            </div>
          </form>

          {/* Active Companies List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Company Options ({companies.length})
              </span>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                Synced directly with MongoDB
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748B', fontSize: 13, fontWeight: 600 }}>
                Loading companies...
              </div>
            ) : companies.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                No custom companies found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {companies.map((comp) => (
                  <div
                    key={comp.id || comp.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: '#10B981',
                        }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', wordBreak: 'break-word' }}>{comp.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCompany(comp)}
                      title={`Remove ${comp.name}`}
                      style={{
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
