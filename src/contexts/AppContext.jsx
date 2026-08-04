'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/components/hrms/HrmsLegacy';
import { API_BASE, AUTH_TOKEN_KEY, clearAuthStorage, getAuthToken, setAuthToken } from '@/lib/auth-client';
import { buildNavConfig, pathForView, portalMatchesRole, homePathForPortal, portalLabel } from '@/lib/nav';

const AppContext = createContext(null);

function normalizeAvatar(url, seed = 'user') {
  if (!url || String(url).includes('dev_saif')) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }
  return url;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }) {
  const router = useRouter();
  const [db, setDb] = useState(() => {
    try {
      return Store.load();
    } catch {
      return Store.load?.() || {};
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const u = Store.get('currentUser') || null;
      if (!u) return null;
      return { ...u, avatar: normalizeAvatar(u.avatar, u.name || u.email) };
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);
  const [quickViewUser, setQuickViewUser] = useState(null);
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [showMessengerInbox, setShowMessengerInbox] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const save = useCallback((key, val) => {
    setDb((prev) => {
      const next = { ...prev, [key]: val };
      Store.set(key, val);
      return next;
    });
  }, []);

  const navigate = useCallback(
    (viewKey) => {
      const path = pathForView(viewKey);
      router.push(path);
    },
    [router]
  );

  // Validate JWT on boot — no silent remint / auto-login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      const storedUser = (() => {
        try {
          return Store.get('currentUser');
        } catch {
          return null;
        }
      })();

      let hasValidJwt = false;

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/auth/session`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            hasValidJwt = true;
          } else {
            clearAuthStorage();
            try {
              localStorage.removeItem(AUTH_TOKEN_KEY);
            } catch {}
          }
        } catch {
          // offline — keep existing JWT session
          hasValidJwt = true;
        }
      }

      if (!hasValidJwt) {
        clearAuthStorage();
        Store.set('currentUser', null);
        if (!cancelled) setUser(null);
      } else if (storedUser) {
        const fixed = {
          ...storedUser,
          avatar: normalizeAvatar(storedUser.avatar, storedUser.name || storedUser.email),
        };
        if (!cancelled) {
          setUser(fixed);
          if (fixed.avatar !== storedUser.avatar) {
            Store.set('currentUser', fixed);
          }
        }
      }

      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.changeHrmsView = (v = 'dashboard') => navigate(v);
    return () => {
      try {
        delete window.changeHrmsView;
      } catch {}
    };
  }, [navigate]);

  const openChatWithUser = useCallback((targetUser) => {
    setQuickViewUser(null);
    setChatTargetUser(targetUser);
    setShowMessengerInbox(true);
  }, []);

  const login = async (email, pass, selectedPortal = null, options = {}) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(pass || '').trim();
    const workMode = options.workMode === 'WFO' ? 'WFO' : 'WFH';
    const locationToken = options.locationToken || undefined;

    if (!cleanEmail) {
      alert('Please enter your official email address.');
      return false;
    }
    if (!cleanPass || cleanPass.length < 6) {
      alert('Please enter your password (minimum 6 characters).');
      return false;
    }
    if (!selectedPortal) {
      alert('Please select a portal (Employee, HR Admin, or Super Admin) before signing in.');
      return false;
    }
    if (workMode === 'WFO' && !locationToken) {
      alert('Verify office location for Work From Office login.');
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          portal: selectedPortal,
          workMode,
          ...(workMode === 'WFO' ? { locationToken } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'Invalid email or password.');
        return false;
      }

      const apiUser = data.user;
      if (!data.token || !apiUser) {
        alert('Login failed: no session token returned.');
        return false;
      }

      const accountRole = apiUser.role || 'employee';
      if (!portalMatchesRole(selectedPortal, accountRole)) {
        clearAuthStorage();
        alert(
          `This account (${accountRole.replace('_', ' ')}) cannot access the ${portalLabel(selectedPortal)}. Select the matching portal and try again.`
        );
        return false;
      }

      setAuthToken(data.token);

      const existingIdx = db.users.findIndex((x) => String(x.email).toLowerCase() === cleanEmail);
      let updatedUserList = [...db.users];
      const formattedUser = {
        id: apiUser.id || Date.now(),
        employee_id: apiUser.employee_id || apiUser.employeeId || 'EMP-NEW',
        name: apiUser.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: accountRole,
        designation: apiUser.designation || 'Team Member',
        title: apiUser.designation || 'Team Member',
        status: 'active',
        must_change_password: apiUser.must_change_password || 0,
        workMode: apiUser.workMode || workMode,
        avatar:
          apiUser.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apiUser.name || cleanEmail)}`,
      };

      if (existingIdx >= 0) {
        updatedUserList[existingIdx] = { ...updatedUserList[existingIdx], ...formattedUser };
      } else {
        updatedUserList.unshift(formattedUser);
      }

      save('users', updatedUserList);
      setUser(formattedUser);
      Store.set('currentUser', formattedUser);
      router.push(homePathForPortal(selectedPortal));
      return true;
    } catch (err) {
      console.warn('Login request failed:', err);
      alert('Unable to reach the login server. Check your connection and try again.');
      return false;
    }
  };

  const logout = useCallback(() => {
    Store.set('currentUser', null);
    clearAuthStorage();
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {}
    setUser(null);
    setShowLogoutModal(false);
    router.push('/login');
  }, [router]);

  const nav = useMemo(() => buildNavConfig(user, db), [user, db]);

  const unread = (db.notifications || []).filter((n) => !n.read && (!n.to || n.to === user?.id)).length;
  const unreadMsgCount = (db.messages || []).filter(
    (m) => String(m.toId) === String(user?.id) && !m.read
  ).length;

  // Sync employee directory from MongoDB (production source of truth)
  useEffect(() => {
    if (!user?.id) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        if (!Array.isArray(rows) || cancelled) return;
        const mapped = rows.map((u) => ({
          id: u.id,
          employee_id: u.employee_id,
          employeeId: u.employee_id,
          eid: u.employee_id,
          name: u.name,
          email: u.email,
          role: u.role,
          designation: u.designation,
          title: u.designation,
          department_id: u.department_id,
          department_name: u.department_name,
          deptName: u.department_name || 'General Operations',
          joining_date: u.joining_date,
          joined: u.joining_date,
          contact: u.contact,
          phone: u.contact,
          status: u.status || 'active',
          avatar: u.avatar_url,
          avatar_url: u.avatar_url,
          employment_type: 'full_time',
          basic_salary: u.basic_salary,
          bank_name: u.bank_name,
          account_number: u.account_number,
          ifsc_code: u.ifsc_code,
          emergency_contact: u.emergency_contact,
          must_change_password: u.must_change_password || 0,
          last_login: u.last_login,
        }));
        save('users', mapped);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, save]);

  // Sync live chat from Mongo so both parties share the same inbox
  useEffect(() => {
    if (!user?.id) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(`${API_BASE}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data) && !cancelled) save('messages', data);
      } catch {}
    };
    pull();
    const timer = setInterval(pull, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.id, save]);

  const pageProps = useMemo(
    () => ({
      db,
      save,
      user,
      setView: navigate,
      setQuickViewUser,
      setChatTargetUser,
      openChatWithUser,
    }),
    [db, save, user, navigate, openChatWithUser]
  );

  const value = {
    ready,
    db,
    save,
    user,
    setUser,
    login,
    logout,
    navigate,
    nav,
    unread,
    unreadMsgCount,
    quickViewUser,
    setQuickViewUser,
    chatTargetUser,
    setChatTargetUser,
    showMessengerInbox,
    setShowMessengerInbox,
    showLogoutModal,
    setShowLogoutModal,
    openChatWithUser,
    pageProps,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
