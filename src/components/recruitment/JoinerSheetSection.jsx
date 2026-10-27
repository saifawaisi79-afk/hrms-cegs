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
} from 'lucide-react';
import { getRecruiters } from '@/lib/nav';

const GLOBAL_API_BASE = '/api';

const COMPANY_TABS = [
  'ALL',
  'ALTRUIST',
  'ONE POINT ONE',
  'STARTEK',
  'TRIO',
  'ISON',
  'RADICAL MINDS',
];

const WEEK_KEYS = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8'];

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

function mapJoinedCandidate(cand, index) {
  const id = cand.id || cand._id;
  return {
    id: `sheet_${id}`,
    source: 'sheet',
    candidateId: String(id),
    slNo: cand.slNo || index + 1,
    name: cand.name || '',
    phone: cand.number || '',
    process: cand.company || '',
    recruiterName: cand.employee || '',
    dateOfJoining: '',
    billingDate: '',
    employeeCode: '',
    interviewDate: '',
    week1: '',
    week2: '',
    week3: '',
    week4: '',
    week5: '',
    week6: '',
    week7: '',
    week8: '',
    rawDate: cand.date || '',
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
export function JoinerSheetSection({ db, user: userProp, canEdit = true, employeeFilter = 'ALL' }) {
  const [overlays, setOverlays] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companyTab, setCompanyTab] = useState('ALL');
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
      return {
        ...base,
        process: ov.process || base.process,
        dateOfJoining: ov.dateOfJoining || '',
        billingDate: ov.billingDate || '',
        employeeCode: ov.employeeCode || '',
        interviewDate: ov.interviewDate || '',
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

    return list.map((r) => ({
      ...r,
      id: r.id || r._id,
      source: 'manual',
      phone: r.phone || '',
    }));
  }, [overlays, sheetRows, employeeFilter]);

  const allRows = useMemo(() => {
    const merged = [...sheetRows, ...manualOnly];
    return merged.map((r, i) => ({ ...r, displaySl: i + 1 }));
  }, [sheetRows, manualOnly]);

  const { availableMonths, monthCounts } = useMemo(() => {
    const counts = {};
    const monthMap = new Map();

    allRows.forEach((r) => {
      const ym = extractRowYearMonth(r);
      const k = ym ? ym.key : 'unassigned';
      counts[k] = (counts[k] || 0) + 1;
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

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (companyTab !== 'ALL') {
        const p = String(r.process || '').toUpperCase();
        if (!p.includes(companyTab)) return false;
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
        String(r.recruiterName || '').toLowerCase().includes(q) ||
        String(r.employeeCode || '').toLowerCase().includes(q)
      );
    });
  }, [allRows, companyTab, monthFilter, search]);

  const tabCounts = useMemo(() => {
    const baseList = monthFilter === 'ALL'
      ? allRows
      : allRows.filter((r) => {
          const ym = extractRowYearMonth(r);
          return (ym ? ym.key : 'unassigned') === monthFilter;
        });

    const counts = { ALL: baseList.length };
    COMPANY_TABS.slice(1).forEach((c) => {
      counts[c] = baseList.filter((r) =>
        String(r.process || '').toUpperCase().includes(c)
      ).length;
    });
    return counts;
  }, [allRows, monthFilter]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`,
  });

  // Edit Handlers
  const startEdit = (row) => {
    if (!canEditEntry) return;
    setEditingId(row.id || row._id);
    setEditForm({
      name: row.name || '',
      phone: row.phone || '',
      process: row.process || '',
      dateOfJoining: row.dateOfJoining || '',
      billingDate: row.billingDate || '',
      employeeCode: row.employeeCode || '',
      interviewDate: row.interviewDate || '',
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
      process: editForm.process.trim(),
      dateOfJoining: editForm.dateOfJoining.trim(),
      billingDate: editForm.billingDate.trim(),
      employeeCode: editForm.employeeCode.trim(),
      interviewDate: editForm.interviewDate.trim(),
      recruiterName: editForm.recruiterName.trim(),
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
        if (editForm.candidateId && payload.process) {
          await fetch(`${GLOBAL_API_BASE}/candidates/${editForm.candidateId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ company: payload.process }),
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

          const process = getVal(['process', 'company', 'client', 'account']);
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
        'Process': 'ALTRUIST',
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
        'Process': 'TRIO',
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

  const cell = (v) => (
    <td
      style={{
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: v ? '#0f172a' : '#94a3b8',
        whiteSpace: 'nowrap',
      }}
    >
      {v || '—'}
    </td>
  );

  const headerStyle = {
    background: '#1e40af',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    padding: '10px 8px',
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              borderRadius: 99,
              minHeight: 40,
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
              minHeight: 40,
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
            className="btn btn-secondary"
            style={{
              borderRadius: 99,
              minHeight: 40,
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

          {/* Month selector dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              className="form-input"
              style={{
                borderRadius: 99,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                minHeight: 40,
                cursor: 'pointer',
                background: monthFilter !== 'ALL' ? '#EFF6FF' : '#FFFFFF',
                borderColor: monthFilter !== 'ALL' ? '#2563EB' : '#D1D5DB',
                color: monthFilter !== 'ALL' ? '#1D4ED8' : '#374151',
              }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter by month"
            >
              <option value="ALL">📅 All Months ({allRows.length})</option>
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
                  padding: '6px 10px',
                  fontSize: 11,
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
            className="form-input"
            style={{ borderRadius: 99, padding: '8px 16px', fontSize: 12, width: 220, minHeight: 40 }}
            placeholder="Search name, phone, recruiter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Company tabs like Google Sheet (ISON, …) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {COMPANY_TABS.map((tab) => (
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
          All Months ({allRows.length})
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
        <table className="datasheet-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              {[
                'SL.NO',
                'Name',
                'Phone Number',
                'Process',
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
                <th key={h} style={{ ...headerStyle, textAlign: h === 'Action' ? 'center' : 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canEditEntry || canDelete ? 18 : 17}
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
                      <td>
                        <select
                          className="cell-select"
                          value={editForm.process || ''}
                          onChange={(e) => setEditForm({ ...editForm, process: e.target.value })}
                        >
                          <option value="">Select Process</option>
                          {COMPANY_TABS.slice(1).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {editForm.process && !COMPANY_TABS.includes(editForm.process) ? (
                            <option value={editForm.process}>{editForm.process}</option>
                          ) : null}
                        </select>
                      </td>
                      <td>{inp('dateOfJoining', 'DD/MM/YY')}</td>
                      <td>{inp('billingDate', 'DD/MM/YY')}</td>
                      <td>{inp('employeeCode', 'Emp code')}</td>
                      <td>{inp('interviewDate', 'DD/MM/YY')}</td>
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
                      {WEEK_KEYS.map((wk) => (
                        <td key={wk}>{inp(wk, wk.replace('week', 'W'))}</td>
                      ))}
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

                return (
                  <tr key={rid}>
                    <td style={{ fontWeight: 800, padding: '8px 10px', color: '#64748B' }}>
                      {idx + 1}
                    </td>
                    {cell(row.name)}
                    {cell(row.phone)}
                    {cell(row.process)}
                    {cell(row.dateOfJoining)}
                    {cell(row.billingDate)}
                    {cell(row.employeeCode)}
                    {cell(row.interviewDate)}
                    {cell(row.recruiterName)}
                    {WEEK_KEYS.map((wk) => cell(row[wk]))}
                    {(canEditEntry || canDelete) && (
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
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
            overflowY: 'auto',
          }}
          onClick={() => !uploading && setUploadModalOpen(false)}
        >
          <div
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
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>#</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Name</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Phone</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155' }}>Process</th>
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
                  Phone: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.phone || '—'}</strong> • Process: <strong style={{ color: '#1E293B' }}>{deleteConfirmRow.process || '—'}</strong>
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
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
