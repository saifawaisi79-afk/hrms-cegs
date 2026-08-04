'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/components/hrms/HrmsLegacy';
import { API_BASE, AUTH_TOKEN_KEY, clearAuthStorage, getAuthToken, setAuthToken } from '@/lib/auth-client';
import { buildNavConfig, pathForView } from '@/lib/nav';

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

  const login = async (email, pass) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(pass || '').trim();

    if (!cleanEmail) {
      alert('Please enter your official email address.');
      return false;
    }
    if (!cleanPass || cleanPass.length < 6) {
      alert('Please enter your password (minimum 6 characters).');
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'Invalid email or password. Use credentials from HR Onboarding.');
        return false;
      }

      const apiUser = data.user;
      if (!data.token || !apiUser) {
        alert('Login failed: no session token returned.');
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
        role: apiUser.role || 'employee',
        designation: apiUser.designation || 'Team Member',
        title: apiUser.designation || 'Team Member',
        status: 'active',
        must_change_password: apiUser.must_change_password || 0,
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
      router.push('/dashboard');
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
  const unreadMsgCount = (db.messages || []).filter((m) => m.toId === user?.id && !m.read).length;

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
