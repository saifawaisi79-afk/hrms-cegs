'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { getRecruiters } from '@/lib/nav';
import { normalizeCandidateDate, formatSheetDateDisplay } from '@/lib/candidate-dates';
import { getCompanyPayoutDays, getProcessPayoutAmount } from '@/lib/company-process-payouts';

const GLOBAL_API_BASE = '/api';

const COMPANY_TABS = [
  'ALL',
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
  'iLeads',
  'OTHER',
];

const COMPANY_OPTIONS = [
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
  'iLeads',
  'Other',
];

const WEEK_KEYS = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'];

/** Format date strictly as Day/Month (DD/MM, e.g. 19/11) */
export function getDayMonthDate(d = new Date()) {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  const valid = dt && !isNaN(dt.getTime()) ? dt : new Date();
  const day = String(valid.getDate()).padStart(2, '0');
  const month = String(valid.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/** Extract DD/MM from a followup string (e.g. "Active (19/11)" -> "19/11", "Working(22/10/2026)" -> "22/10") */
export function parseFollowupDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?\b/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    return `${d}/${m}`;
  }
  return '';
}

/** Get the date to display beside the followup option: explicit date in val, or fallback to interview/DOJ */
export function getFollowupDisplayDate(val, row) {
  if (!val) return '';
  const direct = parseFollowupDate(val);
  if (direct) return direct;
  // If entry exists without explicit date, fall back to row's interview date or DOJ
  const fallback = row?.interviewDate || row?.dateOfJoining;
  if (fallback) {
    const fb = parseFollowupDate(fallback);
    if (fb) return fb;
  }
  return '';
}

/** Strip date parenthesis suffix from comment text */
export function getFollowupCommentOnly(val) {
  if (!val) return '';
  return String(val)
    .replace(/\s*\(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\)\s*$/, '')
    .trim();
}

export function getFollowupStatus(val) {
  const str = String(val || '').trim().toLowerCase();
  if (!str) return '';
  if (str.includes('inactive') || str.includes('drop') || str.includes('left') || str.includes('resign') || str.includes('abscond')) {
    return 'Inactive';
  }
  if (str.includes('active') || str.includes('working') || str.includes('joined')) {
    return 'Active';
  }
  return str;
}

export function isFollowupActive(val) {
  return getFollowupStatus(val) === 'Active';
}

export function isFollowupInactive(val) {
  return getFollowupStatus(val) === 'Inactive';
}

export function getFirstInactiveWeekIndex(row) {
  if (!row) return -1;
  for (let i = 0; i < WEEK_KEYS.length; i++) {
    if (isFollowupInactive(row[WEEK_KEYS[i]])) {
      return i;
    }
  }
  return -1;
}

/** Check if candidate is active (not dropped/inactive in follow-up weeks or status) */
export function isJoinerActive(row) {
  if (!row) return false;
  if (getFirstInactiveWeekIndex(row) !== -1) return false;
  const statusStr = String(row.status || '').trim().toLowerCase();
  if (
    statusStr.includes('inactive') ||
    statusStr.includes('drop') ||
    statusStr.includes('left') ||
    statusStr.includes('resign') ||
    statusStr.includes('abscond')
  ) {
    return false;
  }
  return true;
}

function sheetText(cand) {
  return `${cand?.response || ''} ${cand?.followUp1 || ''} ${cand?.followUp2 || ''} ${cand?.followUp3 || ''} ${cand?.category || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isJoinedCandidate(cand) {
  const text = sheetText(cand);
  return (
    text.includes('joined') ||
    text.includes('joining') ||
    String(cand?.category || '').toLowerCase() === 'joined'
  );
}

function dupKey(name, phone) {
  return `${String(name || '').trim().toLowerCase()}|${String(phone || '').replace(/\D/g, '')}`;
}

export function addDaysToDate(dateStr, days = 60) {
  const iso = normalizeCandidateDate(dateStr);
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(Date.UTC(y, m, d));
  if (isNaN(dt.getTime())) return '';
  dt.setUTCDate(dt.getUTCDate() + days);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function formatCellDate(dateVal) {
  if (!dateVal || dateVal === '—' || dateVal === '-') return '';
  const formatted = formatSheetDateDisplay(dateVal);
  return formatted || String(dateVal);
}

function mapJoinedCandidate(cand, index) {
  const id = cand.id || cand._id;
  const companyVal = cand.company || cand.client || '';
  const processVal = cand.process || '';

  // Auto-populate date of joining from sheet candidate record
  const rawDoj = cand.joiningDate || cand.dateOfJoining || cand.doj || cand.date || cand.createdAt || '';
  const dojIso = normalizeCandidateDate(rawDoj);
  const formattedDoj = dojIso ? formatSheetDateDisplay(dojIso) : (rawDoj ? formatCellDate(rawDoj) : '');

  // Auto-populate billing date based on company & process payout days (45, 60, 90 days)
  const payoutDays = getCompanyPayoutDays(companyVal || processVal);
  const rawBilling = cand.billingDate || (dojIso ? addDaysToDate(dojIso, payoutDays) : '');
  const billingIso = normalizeCandidateDate(rawBilling);
  const formattedBilling = billingIso ? formatSheetDateDisplay(billingIso) : (rawBilling ? formatCellDate(rawBilling) : '');

  // Auto-populate interview date
  const rawInterview = cand.interviewDate || cand.date || '';
  const interviewIso = normalizeCandidateDate(rawInterview);
  const formattedInterview = interviewIso ? formatSheetDateDisplay(interviewIso) : (rawInterview ? formatCellDate(rawInterview) : '');

  return {
    id: `sheet_${id}`,
    source: 'sheet',
    candidateId: String(id),
    slNo: cand.slNo || index + 1,
    name: cand.name || '',
    phone: cand.number || '',
    process: processVal,
    company: companyVal,
    recruiterName: cand.employee || '',
    dateOfJoining: formattedDoj,
    billingDate: formattedBilling,
    employeeCode: cand.employeeCode || cand.empCode || cand.empId || '',
    interviewDate: formattedInterview,
    week1: '',
    week2: '',
    week3: '',
    week4: '',
    week5: '',
    week6: '',
    week7: '',
    week8: '',
    rawDate: cand.date || '',
    createdAt: cand.createdAt || '',
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function extractRowYearMonth(r) {
  const candidates = [r.dateOfJoining, r.rawDate, r.interviewDate, r.billingDate, r.createdAt].filter(Boolean);
  for (const raw of candidates) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;
    const s = String(raw).trim();
    if (!s || s === '—' || s === '-') continue;

    // YYYY-MM-DD or YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      if (mo >= 1 && mo <= 12) {
        return {
          key: `${y}-${String(mo).padStart(2, '0')}`,
          label: `${MONTH_NAMES[mo - 1]} ${y}`,
          year: y,
          month: mo,
        };
      }
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (m) {
      let y = parseInt(m[3], 10);
      if (y < 100) y += 2000;
      const mo = parseInt(m[2], 10);
      if (mo >= 1 && mo <= 12) {
        return {
          key: `${y}-${String(mo).padStart(2, '0')}`,
          label: `${MONTH_NAMES[mo - 1]} ${y}`,
          year: y,
          month: mo,
        };
      }
    }

    // Fallback Date parser
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      return {
        key: `${y}-${String(mo).padStart(2, '0')}`,
        label: `${MONTH_NAMES[mo - 1]} ${y}`,
        year: y,
        month: mo,
      };
    }
  }
  return null;
}

/**
 * Joiner Sheet — Google Sheets style (SL, Name, Phone, Process, DOJ, Billing,
 * Emp ID, Interview date, Recruiter, Week 1–8 follow-ups).
 * Supports Excel/CSV bulk upload, editing for all portals, and delete for HR & Finance portals.
 */
export function JoinerSheetSection({
  db,
  user: userProp,
  canEdit = true,
  employeeFilter = 'ALL',
  onManageCompanies,
  customCompanies: passedCustomCompanies,
}) {
  const [overlays, setOverlays] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [customCompanies, setCustomCompanies] = useState(passedCustomCompanies || []);
  const [companyTab, setCompanyTab] = useState('ALL');

  useEffect(() => {
    if (passedCustomCompanies && passedCustomCompanies.length > 0) {
      setCustomCompanies(passedCustomCompanies);
    }
  }, [passedCustomCompanies]);

  useEffect(() => {
    let cancelled = false;
    const loadComp = async () => {
      try {
        const res = await fetch('/api/companies');
        const data = await res.json();
        if (data.success && Array.isArray(data.names) && !cancelled) {
          setCustomCompanies(data.names);
        }
      } catch {}
    };
    if (!passedCustomCompanies || passedCustomCompanies.length === 0) {
      loadComp();
    }
    const handleUpdate = (e) => {
      if (Array.isArray(e.detail)) setCustomCompanies(e.detail);
    };
    window.addEventListener('hrms:companies_updated', handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('hrms:companies_updated', handleUpdate);
    };
  }, [passedCustomCompanies]);

  const dynamicCompanyTabs = useMemo(() => {
    const list = customCompanies.length > 0 ? customCompanies : COMPANY_TABS.slice(1).filter((c) => c !== 'OTHER');
    return ['ALL', ...list, 'OTHER'];
  }, [customCompanies]);

  const dynamicCompanyOptions = useMemo(() => {
    const list = customCompanies.length > 0 ? customCompanies : COMPANY_OPTIONS.filter((c) => c.toUpperCase() !== 'OTHER');
    return [...list, 'OTHER'];
  }, [customCompanies]);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Upload state
  const fileInputRef = useRef(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadPreviewRows, setUploadPreviewRows] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Delete state
  const [deleteConfirmRow, setDeleteConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Follow-up Comment Modal state
  const [commentModal, setCommentModal] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');

  const openCommentModal = (row, wk, initialVal = '') => {
    setCommentModal({
      row,
      wk,
      candidateName: row.name || 'Candidate',
      weekLabel: wk.replace('week', 'Week '),
    });
    setCommentDraft(initialVal === 'Active' || initialVal === 'Inactive' ? '' : initialVal);
  };

  const handleSaveCommentModal = async () => {
    if (!commentModal) return;
    const { row, wk } = commentModal;
    const trimmed = commentDraft.trim();
    await handleQuickFollowupToggle(row, wk, trimmed);
    setCommentModal(null);
    setCommentDraft('');
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Determine authenticated user and role capabilities
  const effectiveUser = useMemo(() => {
    if (userProp && (userProp.role || userProp.name)) return userProp;
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('cegs_user');
        if (u) return JSON.parse(u);
      } catch {}
      try {
        const raw = localStorage.getItem('cegs_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.currentUser) return parsed.currentUser;
        }
      } catch {}
    }
    return userProp || null;
  }, [userProp]);

  const role = String(effectiveUser?.role || '').toLowerCase();
  const isEmployee = role === 'employee';
  const isFinance = role === 'finance';
  const isHR =
    role === 'admin' ||
    role === 'hr' ||
    (effectiveUser?.title &&
      typeof effectiveUser.title === 'string' &&
      effectiveUser.title.toLowerCase().includes('hr'));
  const isSuperAdmin =
    role === 'super_admin' || role === 'superadmin' || !!effectiveUser?.isSuperAdmin;

  // Permissions according to requirement:
  // - Employee portal: entry has edit option (no delete option)
  // - HR and Finance portal: entry has edit option AND delete option
  const canDelete = isHR || isFinance || isSuperAdmin;
  const canEditEntry = canEdit || canDelete || isEmployee;

  const recruiters = useMemo(() => {
    const fromNav = getRecruiters(db, db?.candidates || []);
    const fromUsers = (db?.users || [])
      .filter((u) => String(u.status || 'active').toLowerCase() !== 'inactive')
      .map((u) => u.name)
      .filter(Boolean);
    return [...new Set([...fromNav, ...fromUsers])].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [db]);

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cegs_token') : null;
    if (!token) {
      setStatus('Login required');
      return;
    }
    try {
      const [jRes, cRes] = await Promise.all([
        fetch(`${GLOBAL_API_BASE}/joiners`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${GLOBAL_API_BASE}/candidates?joined=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (jRes.ok) {
        const data = await jRes.json();
        setOverlays(Array.isArray(data) ? data : []);
      }
      let fromApi = [];
      if (cRes.ok) {
        const data = await cRes.json();
        fromApi = Array.isArray(data) ? data : [];
      }
      setCandidates(fromApi);
      setStatus('Synced');
    } catch {
      setStatus('Offline');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overlayByCand = useMemo(() => {
    const m = new Map();
    overlays.forEach((r) => {
      if (r.candidateId) m.set(String(r.candidateId), r);
    });
    return m;
  }, [overlays]);

  const sheetRows = useMemo(() => {
    let list = candidates.filter(isJoinedCandidate);
    if (employeeFilter && employeeFilter !== 'ALL') {
      const emp = String(employeeFilter).trim().toLowerCase();
      list = list.filter((c) => String(c.employee || '').trim().toLowerCase() === emp);
    }
    return list.map((c, i) => {
      const base = mapJoinedCandidate(c, i);
      const ov = overlayByCand.get(String(base.candidateId));
      if (!ov) return base;
      const ovDoj = ov.dateOfJoining ? formatCellDate(ov.dateOfJoining) : '';
      const finalDoj = ovDoj || base.dateOfJoining || '';
      const ovCompany = ov.company || base.company || '';
      const ovProcess = ov.process || base.process || '';
      const payoutDays = getCompanyPayoutDays(ovCompany || ovProcess);
      const ovBilling = ov.billingDate ? formatCellDate(ov.billingDate) : '';
      const finalBilling = ovBilling || base.billingDate || (finalDoj ? formatCellDate(addDaysToDate(finalDoj, payoutDays)) : '');
      const ovInterview = ov.interviewDate ? formatCellDate(ov.interviewDate) : '';
      const finalInterview = ovInterview || base.interviewDate || '';

      return {
        ...base,
        process: ov.process || base.process || '',
        company: ov.company || base.company || '',
        dateOfJoining: finalDoj,
        billingDate: finalBilling,
        employeeCode: ov.employeeCode || base.employeeCode || '',
        interviewDate: finalInterview,
        recruiterName: ov.recruiterName || base.recruiterName,
        week1: ov.week1 || '',
        week2: ov.week2 || '',
        week3: ov.week3 || '',
        week4: ov.week4 || '',
        week5: ov.week5 || '',
        week6: ov.week6 || '',
        week7: ov.week7 || '',
        week8: ov.week8 || '',
        name: ov.name || base.name,
        phone: ov.phone || base.phone,
        overlayId: ov.id || ov._id,
      };
    });
  }, [candidates, overlayByCand, employeeFilter]);

  const manualOnly = useMemo(() => {
    const keys = new Set(sheetRows.map((r) => dupKey(r.name, r.phone)));
    const ids = new Set(sheetRows.map((r) => String(r.candidateId)));
    let list = overlays
      .filter((r) => !r.candidateId || !ids.has(String(r.candidateId)))
      .filter((r) => !keys.has(dupKey(r.name, r.phone)));

    if (employeeFilter && employeeFilter !== 'ALL') {
      const emp = String(employeeFilter).trim().toLowerCase();
      list = list.filter((r) => {
        const recruiter = String(r.recruiterName || '').trim().toLowerCase();
        const creator = String(r.createdBy || '').trim().toLowerCase();
        return recruiter === emp || creator === emp;
      });
    }

    return list.map((r) => {
      const doj = r.dateOfJoining || r.joiningDate || r.rawDate || r.createdAt || '';
      const formattedDoj = formatCellDate(doj);
      const payoutDays = getCompanyPayoutDays(r.company || r.process);
      const billing = r.billingDate || (doj ? addDaysToDate(doj, payoutDays) : '');
      const formattedBilling = formatCellDate(billing);
      const formattedInterview = formatCellDate(r.interviewDate);
      return {
        ...r,
        id: r.id || r._id,
        source: 'manual',
        phone: r.phone || '',
        company: r.company || '',
        process: r.process || '',
        dateOfJoining: formattedDoj,
        billingDate: formattedBilling,
        interviewDate: formattedInterview,
      };
    });
  }, [overlays, sheetRows, employeeFilter]);

  const allRows = useMemo(() => {
    const merged = [...sheetRows, ...manualOnly];
    // Sort date-wise descending (newest joiners first at the top)
    merged.sort((a, b) => {
      const dateA = normalizeCandidateDate(a.dateOfJoining || a.rawDate || a.createdAt || '');
      const dateB = normalizeCandidateDate(b.dateOfJoining || b.rawDate || b.createdAt || '');
      if (dateA && dateB && dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      const idA = String(a.candidateId || a.id || '');
      const idB = String(b.candidateId || b.id || '');
      return idB.localeCompare(idA);
    });
    return merged.map((r, i) => ({ ...r, displaySl: i + 1 }));
  }, [sheetRows, manualOnly]);

  const { availableMonths, monthCounts } = useMemo(() => {
    const counts = {};
    const monthMap = new Map();

    allRows.forEach((r) => {
      const ym = extractRowYearMonth(r);
      const k = ym ? ym.key : 'unassigned';
      if (isJoinerActive(r)) {
        counts[k] = (counts[k] || 0) + 1;
      }
      if (ym && !monthMap.has(k)) {
        monthMap.set(k, ym);
      }
    });

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curK = `${curY}-${String(curM).padStart(2, '0')}`;
    if (!monthMap.has(curK)) {
      monthMap.set(curK, {
        key: curK,
        label: `${MONTH_NAMES[curM - 1]} ${curY}`,
        year: curY,
        month: curM,
      });
    }

    const sortedMonths = [...monthMap.values()].sort((a, b) => b.key.localeCompare(a.key));
    return { availableMonths: sortedMonths, monthCounts: counts };
  }, [allRows]);

  const totalActiveCount = useMemo(() => {
    return allRows.filter(isJoinerActive).length;
  }, [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (companyTab !== 'ALL') {
        const comp = String(r.company || '').toUpperCase();
        const proc = String(r.process || '').toUpperCase();
        if (companyTab === 'OTHER') {
          const knownCompanies = ['ALTRUIST', 'ONE POINT ONE', 'STARTEK', 'TRIO', 'ISON', 'RADICAL MINDS', 'ILEADS'];
          if (knownCompanies.some((k) => comp.includes(k) || proc.includes(k))) return false;
        } else {
          if (!comp.includes(companyTab.toUpperCase()) && !proc.includes(companyTab.toUpperCase())) return false;
        }
      }
      if (monthFilter !== 'ALL') {
        const ym = extractRowYearMonth(r);
        const k = ym ? ym.key : 'unassigned';
        if (k !== monthFilter) return false;
      }
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.phone || '').includes(q) ||
        String(r.process || '').toLowerCase().includes(q) ||
        String(r.company || '').toLowerCase().includes(q) ||
        String(r.recruiterName || '').toLowerCase().includes(q) ||
        String(r.employeeCode || '').toLowerCase().includes(q)
      );
    });
  }, [allRows, companyTab, monthFilter, search]);

  const tabCounts = useMemo(() => {
    const baseList = (monthFilter === 'ALL'
      ? allRows
      : allRows.filter((r) => {
          const ym = extractRowYearMonth(r);
          return (ym ? ym.key : 'unassigned') === monthFilter;
        })
    ).filter(isJoinerActive);

    const counts = { ALL: baseList.length };
    const knownCompanies = dynamicCompanyTabs.slice(1).filter((k) => k !== 'OTHER');
    dynamicCompanyTabs.slice(1).forEach((c) => {
      counts[c] = baseList.filter((r) => {
        const comp = String(r.company || '').toUpperCase();
        const proc = String(r.process || '').toUpperCase();
        if (c === 'OTHER') {
          return comp && !knownCompanies.some((k) => comp.includes(k) || proc.includes(k));
        }
        return comp.includes(c.toUpperCase()) || proc.includes(c.toUpperCase());
      }).length;
    });
    return counts;
  }, [allRows, monthFilter, dynamicCompanyTabs]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`,
  });

  // Edit Handlers
  const startEdit = (row) => {
    if (!canEditEntry) return;
    setEditingId(row.id || row._id);
    const matchedCompany = row.company || (dynamicCompanyTabs.slice(1).find(c => String(row.process || '').toUpperCase().includes(c)) || '');
    setEditForm({
      name: row.name || '',
      phone: row.phone || '',
      process: row.process || '',
      company: matchedCompany,
      dateOfJoining: formatCellDate(row.dateOfJoining),
      billingDate: formatCellDate(row.billingDate),
      employeeCode: row.employeeCode || '',
      interviewDate: formatCellDate(row.interviewDate),
      recruiterName: row.recruiterName || '',
      week1: row.week1 || '',
      week2: row.week2 || '',
      week3: row.week3 || '',
      week4: row.week4 || '',
      week5: row.week5 || '',
      week6: row.week6 || '',
      week7: row.week7 || '',
      week8: row.week8 || '',
      candidateId: row.candidateId || '',
      overlayId: row.overlayId || (row.source === 'manual' ? row.id || row._id : ''),
      source: row.source,
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setError('');
  };

  const saveEdit = async () => {
    if (!canEditEntry || !editForm) return;
    if (!editForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    setStatus('Saving...');
    const payload = {
      name: editForm.name.trim().toUpperCase(),
      phone: editForm.phone.trim(),
      process: editForm.process.trim().toUpperCase(),
      company: (editForm.company === 'Other' || editForm.company === 'Select Company') ? '' : String(editForm.company || '').trim().toUpperCase(),
      dateOfJoining: formatCellDate(editForm.dateOfJoining.trim()),
      billingDate: formatCellDate(editForm.billingDate.trim()),
      employeeCode: editForm.employeeCode.trim().toUpperCase(),
      interviewDate: formatCellDate(editForm.interviewDate.trim()),
      recruiterName: editForm.recruiterName.trim().toUpperCase(),
      week1: editForm.week1,
      week2: editForm.week2,
      week3: editForm.week3,
      week4: editForm.week4,
      week5: editForm.week5,
      week6: editForm.week6,
      week7: editForm.week7,
      week8: editForm.week8,
      candidateId: editForm.candidateId || '',
      createdBy: effectiveUser?.name || '',
    };

    try {
      if (editForm.candidateId || !editForm.overlayId) {
        const res = await fetch(`${GLOBAL_API_BASE}/joiners`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to save.');
          setStatus('Error');
          return;
        }
        const saved = await res.json();
        setOverlays((prev) => {
          const without = prev.filter(
            (r) =>
              String(r.candidateId || '') !== String(editForm.candidateId) &&
              String(r.id || r._id) !== String(saved.id || saved._id)
          );
          return [...without, saved];
        });
        if (editForm.candidateId && (payload.company || payload.process)) {
          await fetch(`${GLOBAL_API_BASE}/candidates/${editForm.candidateId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({
              company: payload.company || payload.process,
              process: payload.process,
            }),
          }).catch(() => {});
        }
      } else {
        const res = await fetch(`${GLOBAL_API_BASE}/joiners/${editForm.overlayId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || 'Failed to update.');
          setStatus('Error');
          return;
        }
        const data = await res.json();
        const updated = data.entry || { ...payload, id: editForm.overlayId };
        setOverlays((prev) =>
          prev.map((r) =>
            String(r.id || r._id) === String(editForm.overlayId) ? { ...r, ...updated } : r
          )
        );
      }
      cancelEdit();
      setToastMessage({ type: 'success', text: `Saved joiner ${payload.name} successfully.` });
      setStatus('Synced');
    } catch {
      setError('Network error while saving.');
      setStatus('Error');
    }
  };

  // Delete Handlers (HR & Finance portal)
  const confirmDelete = (row) => {
    if (!canDelete) return;
    setDeleteConfirmRow(row);
  };

  const executeDelete = async () => {
    if (!deleteConfirmRow || !canDelete) return;
    const row = deleteConfirmRow;
    setDeleting(true);
    setError('');

    try {
      const deletePromises = [];

      if (row.overlayId) {
        deletePromises.push(
          fetch(`${GLOBAL_API_BASE}/joiners/${row.overlayId}`, {
            method: 'DELETE',
            headers: authHeaders(),
          }).catch(() => {})
        );
      } else if (row.source === 'manual' && row.id) {
        deletePromises.push(
          fetch(`${GLOBAL_API_BASE}/joiners/${row.id}`, {
            method: 'DELETE',
            headers: authHeaders(),
          }).catch(() => {})
        );
      }

      if (row.candidateId) {
        deletePromises.push(
          fetch(`${GLOBAL_API_BASE}/candidates/${row.candidateId}`, {
            method: 'DELETE',
            headers: authHeaders(),
          }).catch(() => {})
        );
        deletePromises.push(
          fetch(`${GLOBAL_API_BASE}/joiners/${row.candidateId}`, {
            method: 'DELETE',
            headers: authHeaders(),
          }).catch(() => {})
        );
      }

      await Promise.all(deletePromises);

      const overlayTargetId = String(row.overlayId || row.id || '');
      const candidateTargetId = String(row.candidateId || '');

      setOverlays((prev) =>
        prev.filter(
          (r) =>
            String(r.id || r._id) !== overlayTargetId &&
            String(r.candidateId || '') !== candidateTargetId
        )
      );

      setCandidates((prev) =>
        prev.filter((c) => String(c.id || c._id) !== candidateTargetId)
      );

      setDeleteConfirmRow(null);
      setToastMessage({
        type: 'success',
        text: `Deleted joiner entry for ${row.name || 'candidate'} successfully.`,
      });
      setStatus('Synced');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete entry.');
    } finally {
      setDeleting(false);
    }
  };

  // Excel / CSV File Upload Handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setError('Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
          setError('Uploaded file contains no data rows.');
          return;
        }

        const parsed = [];
        rawData.forEach((row) => {
          const getVal = (patterns) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (patterns.some((p) => cleanKey === p || cleanKey.includes(p))) {
                const val = row[key];
                if (typeof val === 'number' && val > 20000 && val < 60000) {
                  // Excel serial date to formatted DD/MM/YYYY
                  const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
                  if (!isNaN(jsDate.getTime())) {
                    const d = String(jsDate.getDate()).padStart(2, '0');
                    const m = String(jsDate.getMonth() + 1).padStart(2, '0');
                    const y = jsDate.getFullYear();
                    return `${d}/${m}/${y}`;
                  }
                }
                return String(val ?? '').trim();
              }
            }
            return '';
          };

          const name = getVal(['candidatename', 'employeename', 'fullname', 'name', 'candidate']).toUpperCase();
          const phone = getVal(['phonenumber', 'contactnumber', 'phone', 'contact', 'mobile', 'number']);

          // Ignore blank rows
          if (!name && !phone) return;

          const detectedTab = companyTab !== 'ALL' ? companyTab : '';
          const rawCompany = getVal(['company', 'client', 'account', 'employer', 'comp']);
          const rawProcess = getVal(['process', 'subprocess', 'project', 'domain', 'role']);

          let company = rawCompany || detectedTab || '';
          let process = rawProcess || '';

          if (!company && process) {
            const matched = dynamicCompanyTabs.slice(1).find(c => process.toUpperCase().includes(c));
            if (matched) {
              company = matched;
            }
          }

          const dateOfJoining = getVal(['dateofjoining', 'joiningdate', 'doj', 'joining']);
          const billingDate = getVal(['billingdate', 'billing', 'billdate']);
          const employeeCode = getVal(['employeeidcode', 'employeecode', 'employeeid', 'empid', 'empcode', 'code', 'id']);
          const interviewDate = getVal(['interviewdate', 'interview', 'intdate']);
          let recruiterName = getVal(['recruitername', 'recruiter', 'employee', 'talentacquisition', 'hrname']);
          if (!recruiterName && isEmployee && effectiveUser?.name) {
            recruiterName = effectiveUser.name;
          }

          const week1 = getVal(['week1followup', 'week1', 'w1']);
          const week2 = getVal(['week2followup', 'week2', 'w2']);
          const week3 = getVal(['week3followup', 'week3', 'w3']);
          const week4 = getVal(['week4followup', 'week4', 'w4']);
          const week5 = getVal(['week5followup', 'week5', 'w5']);
          const week6 = getVal(['week6followup', 'week6', 'w6']);
          const week7 = getVal(['week7followup', 'week7', 'w7']);
          const week8 = getVal(['week8followup', 'week8', 'w8']);

          parsed.push({
            name: name || 'IMPORTED CANDIDATE',
            phone: phone || '',
            process: process || '',
            company: company || '',
            dateOfJoining: dateOfJoining || '',
            billingDate: billingDate || '',
            employeeCode: employeeCode || '',
            interviewDate: interviewDate || '',
            recruiterName: recruiterName || '',
            week1,
            week2,
            week3,
            week4,
            week5,
            week6,
            week7,
            week8,
            createdBy: effectiveUser?.name || 'File Upload',
          });
        });

        if (parsed.length === 0) {
          setError('No valid joiner rows found in file. Please ensure columns include Name or Phone.');
          return;
        }

        setUploadFileName(fileName);
        setUploadPreviewRows(parsed);
        setUploadModalOpen(true);
        setError('');
      } catch (err) {
        console.error('File parsing error:', err);
        setError('Failed to parse file. Please verify file format.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const executeUpload = async () => {
    if (!uploadPreviewRows || uploadPreviewRows.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await fetch(`${GLOBAL_API_BASE}/joiners`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(uploadPreviewRows),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload joiners.');
      }

      setUploadModalOpen(false);
      const rowCount = uploadPreviewRows.length;
      setUploadPreviewRows([]);
      setToastMessage({
        type: 'success',
        text: `Successfully imported ${rowCount} joiner ${rowCount === 1 ? 'entry' : 'entries'}!`,
      });
      await load();
      setStatus('Synced');
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload entries to database.');
    } finally {
      setUploading(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'SL.NO': 1,
        'Name': 'SUMAN V GOWDA',
        'Phone Number': '7022350100',
        'Process': 'Customer Support Voice',
        'Company': 'ALTRUIST',
        'Date of Joining': '20/10/2026',
        'Billing Date': '25/10/2026',
        'Employee ID/Code': 'EMP-1029',
        'Interview date': '15/10/2026',
        'Recruiter Name': 'Madiha Mehak',
        'Week 1 followup': 'Working',
        'Week 2 followup': '',
        'Week 3 followup': '',
        'Week 4 followup': '',
        'Week 5 followup': '',
        'Week 6 followup': '',
        'Week 7 followup': '',
        'Week 8 followup': '',
      },
      {
        'SL.NO': 2,
        'Name': 'RAMYA TEST',
        'Phone Number': '9876543210',
        'Process': 'Operations',
        'Company': 'TRIO',
        'Date of Joining': '22/10/2026',
        'Billing Date': '28/10/2026',
        'Employee ID/Code': 'EMP-1030',
        'Interview date': '18/10/2026',
        'Recruiter Name': 'Ramya Shakthi.M',
        'Week 1 followup': 'Joined',
        'Week 2 followup': '',
        'Week 3 followup': '',
        'Week 4 followup': '',
        'Week 5 followup': '',
        'Week 6 followup': '',
        'Week 7 followup': '',
        'Week 8 followup': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Joiners Template');
    XLSX.writeFile(wb, 'CEGS_Joiners_Sheet_Template.xlsx');
  };

  /**
   * Sync an 8-week active candidate directly into Weekly Update (A) Candidate Details
   */
  const syncCandidateToWeeklyTracker = (row) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('cegs_oct_candidates');
      let existing = [];
      if (raw) {
        try { existing = JSON.parse(raw); } catch {}
      }
      const cleanPhone = String(row.phone || '').replace(/\D/g, '');
      const cleanName = String(row.name || '').trim().toLowerCase();

      const foundIdx = existing.findIndex((c) => {
        const cp = String(c.phone || '').replace(/\D/g, '');
        const cn = String(c.candidateName || '').trim().toLowerCase();
        return (cleanPhone && cp === cleanPhone) || (cleanName && cn === cleanName);
      });

      const payoutRate = getProcessPayoutAmount(row.company || row.process, row.process || row.company) || 5000;
      const newCandidateObj = {
        id: `joiner_${row.id || row._id || row.candidateId || Date.now()}`,
        candidateName: row.name,
        phone: row.phone,
        client: row.company || row.process || 'ISON',
        process: row.process || row.company || 'Customer Support',
        joiningDate: row.dateOfJoining || new Date().toISOString().slice(0, 10),
        billingDate: row.billingDate || new Date().toISOString().slice(0, 10),
        recruiter: row.recruiterName || '—',
        empId: row.employeeCode || 'Pending',
        empStatus: 'ACTIVE',
        billingStatus: 'Ready to Invoice',
        bi: payoutRate,
        ai: payoutRate,
        remarks: 'Followup completed in Joiner Sheet · Ready to Bill',
        source: 'joiner_8wks_active',
      };

      if (foundIdx !== -1) {
        existing[foundIdx] = { ...existing[foundIdx], ...newCandidateObj, empStatus: 'ACTIVE', billingStatus: 'Ready to Invoice' };
      } else {
        existing.unshift(newCandidateObj);
      }

      localStorage.setItem('cegs_oct_candidates', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('finance_storage_update', { detail: { key: 'cegs_oct_candidates' } }));
    } catch (err) {
      console.error('syncCandidateToWeeklyTracker error:', err);
    }
  };

  /**
   * Quick toggle / dropdown selection for follow-up status on any week
   */
  const handleQuickFollowupToggle = async (row, wk, newStatus) => {
    if (!canEditEntry) return;
    setStatus('Updating followup...');

    // Automatically append current date in Day/Month format (e.g. 19/11)
    let formattedStatus = '';
    if (newStatus) {
      const todayDM = getDayMonthDate();
      if (newStatus === 'Active' || newStatus.startsWith('Active')) {
        formattedStatus = `Active (${todayDM})`;
      } else if (newStatus === 'Inactive' || newStatus.startsWith('Inactive')) {
        formattedStatus = `Inactive (${todayDM})`;
      } else {
        const commentOnly = getFollowupCommentOnly(newStatus);
        formattedStatus = commentOnly ? `${commentOnly} (${todayDM})` : '';
      }
    }

    const wkIndex = WEEK_KEYS.indexOf(wk);
    const isNowInactive = isFollowupInactive(formattedStatus);
    const updatedRow = { ...row, [wk]: formattedStatus };

    // If candidate became Inactive, clear all subsequent weeks so no active status lingers
    if (isNowInactive && wkIndex !== -1) {
      for (let i = wkIndex + 1; i < WEEK_KEYS.length; i++) {
        updatedRow[WEEK_KEYS[i]] = '';
      }
    }

    const hasAnyInactive = WEEK_KEYS.some((k) => isFollowupInactive(updatedRow[k]));
    const all8WeeksActive = !hasAnyInactive && WEEK_KEYS.every((k) => isFollowupActive(updatedRow[k]));
    const isWeek8Active = !hasAnyInactive && isFollowupActive(updatedRow.week8);
    const isNowReadyToBill = !hasAnyInactive && (all8WeeksActive || (wk === 'week8' && isWeek8Active));

    // 1. Update local state
    setOverlays((prev) => {
      const idToMatch = row.overlayId || row.id || row._id;
      const found = prev.some((r) => String(r.id || r._id) === String(idToMatch) || String(r.candidateId || '') === String(row.candidateId));
      if (found) {
        return prev.map((r) => {
          if (String(r.id || r._id) === String(idToMatch) || String(r.candidateId || '') === String(row.candidateId)) {
            return { ...r, ...updatedRow };
          }
          return r;
        });
      }
      return [...prev, updatedRow];
    });

    // If candidate became inactive, remove any previously synced entry from weekly billing tracker
    if (isNowInactive) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('cegs_oct_candidates');
          if (raw) {
            const list = JSON.parse(raw);
            const cleanPhone = String(row.phone || '').replace(/\D/g, '');
            const cleanName = String(row.name || '').trim().toLowerCase();
            const filtered = list.filter((c) => {
              const cp = String(c.phone || '').replace(/\D/g, '');
              const cn = String(c.candidateName || '').trim().toLowerCase();
              return !((cleanPhone && cp === cleanPhone) || (cleanName && cn === cleanName));
            });
            localStorage.setItem('cegs_oct_candidates', JSON.stringify(filtered));
            window.dispatchEvent(new CustomEvent('finance_storage_update', { detail: { key: 'cegs_oct_candidates' } }));
          }
        }
      } catch {}
    }

    // 2. Persist to MongoDB
    try {
      const payload = {
        name: String(row.name || '').toUpperCase().trim(),
        phone: row.phone,
        process: String(row.process || '').toUpperCase().trim(),
        company: String(row.company || '').toUpperCase().trim(),
        dateOfJoining: row.dateOfJoining,
        billingDate: row.billingDate,
        employeeCode: String(row.employeeCode || '').toUpperCase().trim(),
        interviewDate: row.interviewDate,
        recruiterName: String(row.recruiterName || '').toUpperCase().trim(),
        week1: updatedRow.week1 || '',
        week2: updatedRow.week2 || '',
        week3: updatedRow.week3 || '',
        week4: updatedRow.week4 || '',
        week5: updatedRow.week5 || '',
        week6: updatedRow.week6 || '',
        week7: updatedRow.week7 || '',
        week8: updatedRow.week8 || '',
        candidateId: row.candidateId || '',
        createdBy: effectiveUser?.name || '',
      };

      if (row.overlayId) {
        await fetch(`${GLOBAL_API_BASE}/joiners/${row.overlayId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${GLOBAL_API_BASE}/joiners`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }

      // 3. If ready to bill, sync to Weekly Update Candidate Details & redirect
      if (isNowReadyToBill) {
        syncCandidateToWeeklyTracker(updatedRow);
        setToastMessage({
          type: 'success',
          text: `🎉 ${row.name} has completed 8-Week Followups (Active)! Marked Ready to Bill. Redirecting to Candidate Details...`,
        });
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = `/finance/invoices?tab=weekly&search=${encodeURIComponent(row.name)}`;
          }
        }, 1200);
      } else {
        const statusText = newStatus ? `to "${newStatus}"` : 'cleared';
        setToastMessage({ type: 'success', text: `Updated ${wk.replace('week', 'Week ')} ${statusText}.` });
      }
      setStatus('Synced');
    } catch (err) {
      console.error(err);
      setStatus('Error');
    }
  };

  const cell = (v) => (
    <td
      style={{
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: v ? '#0f172a' : '#94a3b8',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}
    >
      {typeof v === 'string' ? v.toUpperCase() : (v || '—')}
    </td>
  );

  const headerStyle = {
    background: '#1e40af',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    padding: '8px 10px',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };

  return (
    <div
      className="recruitment-page-card glass-card"
      style={{ borderRadius: 24, padding: 24, width: '100%', position: 'relative' }}
    >
      {/* Top Header & Action Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Joiners Sheet
          </h3>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
            Candidates marked <strong>joined</strong> on Targets · auto: SL / Name / Phone / Process /
            Recruiter · HR fills DOJ, billing, emp code, interview date &amp; Week 1–8 ·{' '}
            <span style={{ color: status.includes('Error') ? '#B45309' : '#059669' }}>{status}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          {/* Refresh Button */}
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: 99,
              minHeight: 44,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              cursor: 'pointer',
              padding: '8px 16px',
            }}
            onClick={load}
          >
            Refresh
          </button>

          {/* Upload Button */}
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: 99,
              minHeight: 44,
              fontSize: 12,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 18px',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease',
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Upload Joiners (.xlsx, .xls, .csv)"
          >
            <Upload size={14} />
            <span>Upload Joiners (.xlsx, .csv)</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />

          {/* Sample Template Download */}
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: 99,
              minHeight: 44,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              cursor: 'pointer',
              padding: '8px 14px',
            }}
            onClick={handleDownloadTemplate}
            title="Download sample spreadsheet template"
          >
            <Download size={14} />
            <span>Template</span>
          </button>

          {onManageCompanies && (
            <button
              type="button"
              className="btn btn-neutral-soft"
              onClick={onManageCompanies}
              title="Add or remove hiring companies (updates dropdowns & filter tabs)"
              style={{
                borderRadius: 99,
                minHeight: 44,
                fontSize: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#F8FAFC',
                border: '1.5px dashed #94A3B8',
                color: '#334155',
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              <Building2 size={14} style={{ color: '#4F46E5' }} />
              <span>+ / - Company</span>
            </button>
          )}

          {/* Month selector dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: '100%' }}>
            <select
              className="form-input filter-control"
              style={{
                borderRadius: 99,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                minHeight: 44,
                cursor: 'pointer',
                background: monthFilter !== 'ALL' ? '#EFF6FF' : '#FFFFFF',
                borderColor: monthFilter !== 'ALL' ? '#2563EB' : '#D1D5DB',
                color: monthFilter !== 'ALL' ? '#1D4ED8' : '#374151',
              }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter by month"
            >
              <option value="ALL">📅 All Months ({totalActiveCount})</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  📅 {m.label} ({monthCounts[m.key] || 0})
                </option>
              ))}
              {monthCounts['unassigned'] > 0 && (
                <option value="unassigned">📅 Unassigned Date ({monthCounts['unassigned']})</option>
              )}
            </select>
            {monthFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setMonthFilter('ALL')}
                style={{
                  borderRadius: 99,
                  minHeight: 40,
                  padding: '6px 12px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                title="Reset to all months"
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* Search bar */}
          <input
            className="form-input filter-control"
            style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, width: 220, maxWidth: '100%', minHeight: 44, marginLeft: 'auto' }}
            placeholder="Search name, phone, recruiter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Company tabs like Google Sheet (dynamic with MongoDB) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {dynamicCompanyTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCompanyTab(tab)}
            style={{
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 800,
              border: companyTab === tab ? '2px solid #1e40af' : '1px solid #E5E7EB',
              background: companyTab === tab ? '#1e40af' : '#F8FAFC',
              color: companyTab === tab ? '#fff' : '#334155',
              cursor: 'pointer',
            }}
          >
            {tab === 'ALL' ? 'All Companies' : tab} ({tabCounts[tab] || 0})
          </button>
        ))}
      </div>

      {/* Month-wise quick filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
          Month:
        </span>
        <button
          type="button"
          onClick={() => setMonthFilter('ALL')}
          style={{
            borderRadius: 99,
            padding: '5px 12px',
            fontSize: 11.5,
            fontWeight: 800,
            border: monthFilter === 'ALL' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: monthFilter === 'ALL' ? '#2563EB' : '#FFFFFF',
            color: monthFilter === 'ALL' ? '#FFFFFF' : '#475569',
            cursor: 'pointer',
            boxShadow: monthFilter === 'ALL' ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
          }}
        >
          All Months ({totalActiveCount})
        </button>
        {availableMonths.slice(0, 6).map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMonthFilter(m.key)}
            style={{
              borderRadius: 99,
              padding: '5px 12px',
              fontSize: 11.5,
              fontWeight: 800,
              border: monthFilter === m.key ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: monthFilter === m.key ? '#2563EB' : '#FFFFFF',
              color: monthFilter === m.key ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              boxShadow: monthFilter === m.key ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
            }}
          >
            {m.label} ({monthCounts[m.key] || 0})
          </button>
        ))}
        {availableMonths.length > 6 && monthFilter !== 'ALL' && !availableMonths.slice(0, 6).some((m) => m.key === monthFilter) && (
          <button
            type="button"
            style={{
              borderRadius: 99,
              padding: '5px 12px',
              fontSize: 11.5,
              fontWeight: 800,
              border: '2px solid #2563EB',
              background: '#2563EB',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {availableMonths.find((m) => m.key === monthFilter)?.label || monthFilter} ({monthCounts[monthFilter] || 0})
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {/* Main Google-Sheets Style Table */}
      <div className="datasheet-scroll" style={{ maxHeight: '70vh' }}>
        <table className="datasheet-table" style={{ minWidth: 1480 }}>
          <thead>
            <tr>
              {[
                'SL.NO',
                'Name',
                'Phone Number',
                'Process',
                'Company',
                'Date of Joining',
                'Billing Date',
                'Employee ID/Code',
                'Interview date',
                'Recruiter Name',
                'Week 1 followup',
                'Week 2 followup',
                'Week 3 followup',
                'Week 4 followup',
                'Week 5 followup',
                'Week 6 followup',
                'Week 7 followup',
                'Week 8 followup',
                ...(canEditEntry || canDelete ? ['Action'] : []),
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    ...headerStyle,
                    textAlign: h === 'Action' || h.startsWith('Week ') ? 'center' : 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canEditEntry || canDelete ? 19 : 18}
                  style={{ padding: 32, textAlign: 'center', color: '#64748B' }}
                >
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    No joiners yet{companyTab !== 'ALL' ? ` for ${companyTab}` : ''}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    When employees mark Response / Follow-up as <strong>joined</strong> on Targets, or when you upload an Excel/CSV spreadsheet, candidates appear here.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const rid = row.id || row._id;
                const isEditing = editingId === rid && editForm;

                if (isEditing) {
                  const inp = (key, placeholder = '') => (
                    <input
                      className="cell-input"
                      style={{ minWidth: 90 }}
                      value={editForm[key] || ''}
                      placeholder={placeholder}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    />
                  );
                  return (
                    <tr key={rid} className="datasheet-entry-row datasheet-editing-row">
                      <td style={{ fontWeight: 800, padding: '8px 10px', color: '#64748B' }}>
                        {idx + 1}
                      </td>
                      <td>{inp('name', 'NAME')}</td>
                      <td>{inp('phone', 'Phone')}</td>
                      <td>{inp('process', 'Process')}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <select
                            className="cell-select"
                            value={
                              dynamicCompanyOptions.includes(editForm.company)
                                ? editForm.company
                                : editForm.company
                                ? 'OTHER'
                                : ''
                            }
                            onChange={(e) => {
                              if (e.target.value === 'OTHER' || e.target.value === 'Other') {
                                setEditForm({ ...editForm, company: '', _customCompany: true });
                              } else {
                                setEditForm({ ...editForm, company: e.target.value.toUpperCase(), _customCompany: false });
                              }
                            }}
                          >
                            <option value="">Select Company</option>
                            {dynamicCompanyOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {(editForm._customCompany ||
                            (!dynamicCompanyOptions.includes(editForm.company) &&
                              editForm.company &&
                              editForm.company !== 'Select Company')) && (
                            <input
                              className="cell-input"
                              placeholder="Enter company name..."
                              value={editForm.company === 'Other' ? '' : editForm.company}
                              onChange={(e) => setEditForm({ ...editForm, company: e.target.value, _customCompany: true })}
                              style={{ marginTop: 2, borderColor: '#0284C7', background: '#F0F9FF' }}
                              autoFocus
                            />
                          )}
                        </div>
                      </td>
                      <td>{inp('dateOfJoining', 'DD/MM/YYYY')}</td>
                      <td>{inp('billingDate', 'DD/MM/YYYY')}</td>
                      <td>{inp('employeeCode', 'Emp code')}</td>
                      <td>{inp('interviewDate', 'DD/MM/YYYY')}</td>
                      <td>
                        <select
                          className="cell-select"
                          value={editForm.recruiterName || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, recruiterName: e.target.value })
                          }
                        >
                          <option value="">Select Recruiter</option>
                          {recruiters.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      {(() => {
                        const editFirstInactIdx = getFirstInactiveWeekIndex(editForm);
                        return WEEK_KEYS.map((wk, index) => {
                          const isEditBlocked = editFirstInactIdx !== -1 && index > editFirstInactIdx;
                          const currentVal = String(editForm[wk] || '').trim();
                          const isAct = isFollowupActive(currentVal);
                          const isInact = isFollowupInactive(currentVal);

                          if (isEditBlocked) {
                            return (
                              <td
                                key={wk}
                                style={{
                                  minWidth: 128,
                                  padding: '4px 6px',
                                  textAlign: 'center',
                                  background: 'rgba(248, 250, 252, 0.65)',
                                  filter: 'blur(1.2px)',
                                  opacity: 0.38,
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                  cursor: 'not-allowed',
                                }}
                                title="Candidate marked inactive in earlier week. Further followups locked."
                              >
                                <div
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    border: '1px dashed #CBD5E1',
                                    background: '#F1F5F9',
                                    color: '#94A3B8',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <span>—</span>
                                </div>
                              </td>
                            );
                          }

                          const isCustComment = Boolean(currentVal && !isAct && !isInact);

                          const editDate = getFollowupDisplayDate(currentVal, editForm);
                          const editComment = isCustComment ? getFollowupCommentOnly(currentVal) : '';

                          return (
                            <td key={wk} style={{ minWidth: 128, padding: '4px 6px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <select
                                  className="cell-select"
                                  value={isAct ? 'Active' : isInact ? 'Inactive' : isCustComment ? '__comment__' : ''}
                                  onChange={(e) => {
                                    const rawVal = e.target.value;
                                    const todayDM = getDayMonthDate();
                                    let nextVal = '';
                                    if (rawVal === 'Active') nextVal = `Active (${todayDM})`;
                                    else if (rawVal === 'Inactive') nextVal = `Inactive (${todayDM})`;
                                    else if (rawVal === '__comment__') nextVal = editComment ? `${editComment} (${todayDM})` : `Note (${todayDM})`;
                                    else nextVal = '';

                                    const nextForm = { ...editForm, [wk]: nextVal };
                                    if (rawVal === 'Inactive') {
                                      for (let k = index + 1; k < WEEK_KEYS.length; k++) {
                                        nextForm[WEEK_KEYS[k]] = '';
                                      }
                                    }
                                    setEditForm(nextForm);
                                  }}
                                  style={{
                                    flex: '1 1 auto',
                                    minWidth: 70,
                                    padding: '5px 6px',
                                    borderRadius: 8,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    border: isAct
                                      ? '1.5px solid #10B981'
                                      : isInact
                                      ? '1.5px solid #EF4444'
                                      : isCustComment
                                      ? '1.5px solid #3B82F6'
                                      : '1px solid #CBD5E1',
                                    background: isAct
                                      ? '#ECFDF5'
                                      : isInact
                                      ? '#FEF2F2'
                                      : isCustComment
                                      ? '#EFF6FF'
                                      : '#FFFFFF',
                                    color: isAct
                                      ? '#065F46'
                                      : isInact
                                      ? '#991B1B'
                                      : isCustComment
                                      ? '#1D4ED8'
                                      : '#334155',
                                    outline: 'none',
                                  }}
                                >
                                  <option value="">Select</option>
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                  <option value="__comment__">
                                    {isCustComment
                                      ? `💬 ${editComment.length > 8 ? editComment.slice(0, 8) + '...' : editComment}`
                                      : '💬 Comment'}
                                  </option>
                                </select>
                                {editDate && (
                                  <span
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                      padding: '2px 5px',
                                      borderRadius: 6,
                                      whiteSpace: 'nowrap',
                                      background: isAct ? '#D1FAE5' : isInact ? '#FEE2E2' : '#DBEAFE',
                                      color: isAct ? '#065F46' : isInact ? '#991B1B' : '#1D4ED8',
                                      border: `1px solid ${isAct ? '#A7F3D0' : isInact ? '#FECACA' : '#BFDBFE'}`,
                                      fontFamily: 'JetBrains Mono, monospace',
                                      letterSpacing: '-0.02em',
                                      flexShrink: 0,
                                    }}
                                    title={`Followup date: ${editDate}`}
                                  >
                                    {editDate}
                                  </span>
                                )}
                              </div>
                              {isCustComment && (
                                <input
                                  type="text"
                                  className="cell-input"
                                  placeholder="Type comment..."
                                  value={editComment}
                                  onChange={(e) => {
                                    const dm = editDate || getDayMonthDate();
                                    setEditForm({ ...editForm, [wk]: `${e.target.value.toUpperCase()} (${dm})` });
                                  }}
                                  style={{
                                    marginTop: 3,
                                    fontSize: 10.5,
                                    borderColor: '#3B82F6',
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
                                    padding: '2px 4px',
                                    textTransform: 'uppercase',
                                  }}
                                  autoFocus
                                />
                              )}
                            </td>
                          );
                        });
                      })()}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div className="datasheet-row-actions" style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-save"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 12px',
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#059669',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            onClick={saveEdit}
                          >
                            <Check size={12} />
                            Save
                          </button>
                          <button
                            type="button"
                            className="datasheet-action-btn datasheet-action-cancel"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 12px',
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              cursor: 'pointer',
                            }}
                            onClick={cancelEdit}
                          >
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const firstInactiveIdx = getFirstInactiveWeekIndex(row);
                const hasInactive = firstInactiveIdx !== -1;
                const isW8Active = !hasInactive && isFollowupActive(row.week8);
                const allActive = !hasInactive && WEEK_KEYS.every((k) => isFollowupActive(row[k]));
                const isReadyToBill = isW8Active || allActive;

                return (
                  <tr
                    key={rid}
                    style={{
                      background: hasInactive
                        ? '#FEF2F2'
                        : isReadyToBill
                        ? 'rgba(236, 253, 245, 0.45)'
                        : undefined,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td
                      style={{
                        fontWeight: 800,
                        padding: '8px 10px',
                        fontVariantNumeric: 'tabular-nums',
                        color: hasInactive ? '#DC2626' : '#64748B',
                        borderLeft: hasInactive
                          ? '4px solid #EF4444'
                          : isReadyToBill
                          ? '4px solid #10B981'
                          : undefined,
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: hasInactive ? '#B91C1C' : '#0f172a', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                      <span>{row.name ? row.name.toUpperCase() : '—'}</span>
                      {hasInactive && (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 800 }}>
                          INACTIVE
                        </span>
                      )}
                    </td>
                    {cell(row.phone)}
                    {cell(row.process)}
                    {cell(row.company || (dynamicCompanyTabs.slice(1).find(c => String(row.process || '').toUpperCase().includes(c)) || '—'))}
                    {cell(formatCellDate(row.dateOfJoining))}
                    {cell(formatCellDate(row.billingDate))}
                    {cell(row.employeeCode)}
                    {cell(formatCellDate(row.interviewDate))}
                    {cell(row.recruiterName)}
                    {WEEK_KEYS.map((wk, index) => {
                      const isBlockedAfterInactive = firstInactiveIdx !== -1 && index > firstInactiveIdx;
                      const val = String(row[wk] || '').trim();
                      const isActive = isFollowupActive(val);
                      const isInactive = isFollowupInactive(val);

                      if (isBlockedAfterInactive) {
                        return (
                          <td
                            key={wk}
                            style={{
                              padding: '6px 6px',
                              textAlign: 'center',
                              minWidth: 128,
                              verticalAlign: 'middle',
                              background: 'rgba(248, 250, 252, 0.65)',
                              filter: 'blur(1.2px)',
                              opacity: 0.38,
                              pointerEvents: 'none',
                              userSelect: 'none',
                              cursor: 'not-allowed',
                              transition: 'all 0.2s ease',
                            }}
                            title="Candidate marked inactive in earlier week. Further followups locked."
                          >
                            <div
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                border: '1px dashed #CBD5E1',
                                background: '#F1F5F9',
                                color: '#94A3B8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span>—</span>
                            </div>
                          </td>
                        );
                      }

                      const isComment = Boolean(val && !isActive && !isInactive);
                      const followupDate = getFollowupDisplayDate(val, row);
                      const commentText = isComment ? getFollowupCommentOnly(val) : '';

                      return (
                        <td
                          key={wk}
                          style={{
                            padding: '6px 6px',
                            textAlign: 'center',
                            minWidth: 128,
                            verticalAlign: 'middle',
                            background: isActive
                              ? 'rgba(236, 253, 245, 0.45)'
                              : isInactive
                              ? 'rgba(254, 242, 242, 0.45)'
                              : isComment
                              ? 'rgba(239, 246, 255, 0.55)'
                              : 'transparent',
                          }}
                        >
                          {/* Followup Option and Date right beside each other */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <select
                              value={isActive ? 'Active' : isInactive ? 'Inactive' : isComment ? '__comment__' : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__comment__') {
                                  openCommentModal(row, wk, commentText);
                                  return;
                                }
                                handleQuickFollowupToggle(row, wk, v);
                              }}
                              disabled={!canEditEntry}
                              style={{
                                flex: '1 1 auto',
                                minWidth: 70,
                                padding: '5px 6px',
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 700,
                                border: isActive
                                  ? '1.5px solid #10B981'
                                  : isInactive
                                  ? '1.5px solid #EF4444'
                                  : isComment
                                  ? '1.5px solid #3B82F6'
                                  : '1px solid #CBD5E1',
                                background: isActive
                                  ? '#ECFDF5'
                                  : isInactive
                                  ? '#FEF2F2'
                                  : isComment
                                  ? '#EFF6FF'
                                  : '#FFFFFF',
                                color: isActive
                                  ? '#065F46'
                                  : isInactive
                                  ? '#991B1B'
                                  : isComment
                                  ? '#1D4ED8'
                                  : '#475569',
                                cursor: canEditEntry ? 'pointer' : 'default',
                                outline: 'none',
                                boxShadow: isActive
                                  ? '0 1px 3px rgba(16, 185, 129, 0.18)'
                                  : isInactive
                                  ? '0 1px 3px rgba(239, 68, 68, 0.18)'
                                  : isComment
                                  ? '0 1px 3px rgba(59, 130, 246, 0.18)'
                                  : 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <option value="">Select</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="__comment__">
                                {isComment
                                  ? `💬 ${commentText.length > 8 ? commentText.slice(0, 8) + '...' : commentText}`
                                  : '💬 Comment'}
                              </option>
                            </select>

                            {/* Clean Date Badge (Day/Month only) automatically shown right beside the option */}
                            {followupDate && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 5px',
                                  borderRadius: 6,
                                  whiteSpace: 'nowrap',
                                  background: isActive ? '#D1FAE5' : isInactive ? '#FEE2E2' : '#DBEAFE',
                                  color: isActive ? '#065F46' : isInactive ? '#991B1B' : '#1D4ED8',
                                  border: `1px solid ${isActive ? '#A7F3D0' : isInactive ? '#FECACA' : '#BFDBFE'}`,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  letterSpacing: '-0.02em',
                                  flexShrink: 0,
                                }}
                                title={`Followup marked on ${followupDate}`}
                              >
                                {followupDate}
                              </span>
                            )}
                          </div>

                          {isComment && commentText && (
                            <div
                              onClick={() => canEditEntry && openCommentModal(row, wk, commentText)}
                              style={{
                                marginTop: 3,
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#1D4ED8',
                                cursor: canEditEntry ? 'pointer' : 'default',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 120,
                                padding: '1px 4px',
                                borderRadius: 4,
                                background: '#DBEAFE',
                                display: 'block',
                                textAlign: 'center',
                                margin: '3px auto 0 auto',
                              }}
                              title={`Click to edit comment: "${commentText}"`}
                            >
                              <span>{commentText}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {(canEditEntry || canDelete) && (
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                          {/* Inactive Marker Badge */}
                          {hasInactive && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '4px 8px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 800,
                                background: '#FEE2E2',
                                color: '#991B1B',
                                border: '1px solid #FECACA',
                              }}
                              title="Candidate marked inactive in follow-up"
                            >
                              <span>🚫 Inactive</span>
                            </span>
                          )}
                          {/* Ready to Bill Redirect Badge */}
                          {isReadyToBill && (
                            <a
                              href={`/finance/invoices?tab=weekly&search=${encodeURIComponent(row.name)}`}
                              onClick={() => {
                                syncCandidateToWeeklyTracker(row);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 800,
                                background: '#ECFDF5',
                                color: '#065F46',
                                border: '1px solid #10B981',
                                textDecoration: 'none',
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
                                cursor: 'pointer',
                              }}
                              title="Candidate completed follow-up and is Ready to Bill! Click to view in Billing Candidate Details."
                            >
                              <span>⚡ Ready to Bill →</span>
                            </a>
                          )}
                          {/* Edit button: shown in Employee portal AND HR/Finance portals */}
                          {canEditEntry && (
                            <button
                              type="button"
                              className="datasheet-action-btn datasheet-action-edit"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                cursor: 'pointer',
                              }}
                              onClick={() => startEdit(row)}
                              title="Edit this joiner entry"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                          )}

                          {/* Delete button: shown ONLY in HR and Finance portals (and Super Admin) */}
                          {canDelete && (
                            <button
                              type="button"
                              className="datasheet-action-btn datasheet-action-delete"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                              }}
                              onClick={() => confirmDelete(row)}
                              title="Delete this joiner entry (HR & Finance portal)"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Preview & Confirmation Modal */}
      {uploadModalOpen && (
        <div
          className="modal-backdrop-safe"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => !uploading && setUploadModalOpen(false)}
        >
          <div
            className="modal-scroll-card"
            style={{
              width: '100%',
              maxWidth: 780,
              background: '#FFFFFF',
              borderRadius: 24,
              boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    Import Joiners Spreadsheet
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {uploadFileName} • {uploadPreviewRows.length} valid records ready
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !uploading && setUploadModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {uploadError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: 12.5,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  {uploadError}
                </div>
              )}

              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                    {uploadPreviewRows.length} candidate entries detected and formatted
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#15803D',
                    background: '#DCFCE7',
                    padding: '3px 10px',
                    borderRadius: 99,
                  }}
                >
                  Ready to Sync
                </span>
              </div>

              <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                Preview of entries to be imported (first {Math.min(5, uploadPreviewRows.length)} rows):
              </p>

              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  marginBottom: 16,
                }}
              >
                <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>#</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Name</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Phone</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Process</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Company</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>DOJ</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Billing</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Recruiter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreviewRows.slice(0, 5).map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>{row.name}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{row.phone || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#1E293B' }}>{row.process || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#1E293B', fontWeight: 700 }}>{row.company || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{row.dateOfJoining || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{row.billingDate || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{row.recruiterName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: 11.5, color: '#64748B', margin: 0 }}>
                💡 Matching candidate records will be updated automatically. New candidate joiners will be appended with continuous serial numbers.
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                disabled={uploading}
                onClick={() => setUploadModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={executeUpload}
                style={{
                  padding: '9px 22px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {uploading ? 'Importing...' : `Confirm & Import ${uploadPreviewRows.length} Joiners`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (HR & Finance portal only) */}
      {deleteConfirmRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !deleting && setDeleteConfirmRow(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 24,
              boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
              border: '1px solid #FECACA',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 24px',
                borderBottom: '1px solid #FEE2E2',
                background: '#FEF2F2',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
                  Delete Joiner Record
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, margin: 0, marginBottom: 14 }}>
                Are you sure you want to permanently delete this joiner entry from the sheet?
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '14px 16px',
                  fontSize: 12.5,
                }}
              >
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>
                  {deleteConfirmRow.name}
                </div>
                <div style={{ color: '#64748B', marginTop: 4 }}>
                  Phone: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.phone || '—'}</strong> • Process: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.process || '—'}</strong> • Company: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.company || '—'}</strong>
                </div>
                <div style={{ color: '#64748B', marginTop: 2 }}>
                  Recruiter: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.recruiterName || '—'}</strong> • DOJ: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.dateOfJoining || '—'}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
                padding: '16px 24px',
                borderTop: '1px solid #F1F5F9',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmRow(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                style={{
                  padding: '9px 20px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Comment Modal (Insert custom remark by typing) */}
      {commentModal && (
        <div
          className="modal-backdrop-safe"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setCommentModal(null)}
        >
          <div
            className="modal-scroll-card"
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 22px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                    Add Follow-up Comment
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#DBEAFE' }}>
                    {commentModal.weekLabel} Follow-up for <strong>{commentModal.candidateName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentModal(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Follow-up Remark / Note (Type custom text)
              </label>
              <textarea
                autoFocus
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="e.g. Notice period, docs pending, delayed joining, resigned on 3rd day, bill raised..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveCommentModal();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                  Quick Preset Chips (Click to fill):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'Bill Raised',
                    'Docs Pending',
                    'Notice Period',
                    'Delayed Joining',
                    'Resigned',
                    'Absconded',
                    'Salary Issue',
                    'Training Phase',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCommentDraft(preset)}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid',
                        background: commentDraft === preset ? '#EFF6FF' : '#F8FAFC',
                        borderColor: commentDraft === preset ? '#3B82F6' : '#E2E8F0',
                        color: commentDraft === preset ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 22px',
                borderTop: '1px solid #F1F5F9',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={() => setCommentModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommentModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 16,
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 99999,
            padding: '12px 18px',
            borderRadius: 14,
            background: toastMessage.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 6,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
