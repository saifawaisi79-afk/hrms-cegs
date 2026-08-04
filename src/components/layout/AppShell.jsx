'use client';

import { AppHeader } from './AppHeader';
import { useApp } from '@/contexts/AppContext';
import {
  EmployeeQuickViewModal,
  Modal,
  IC,
} from '@/components/hrms/HrmsLegacy';
import { GlobalMessengerModal } from '@/components/chat/GlobalMessengerModal';

export function AppShell({ children }) {
  const {
    user,
    db,
    save,
    logout,
    showLogoutModal,
    setShowLogoutModal,
    quickViewUser,
    setQuickViewUser,
    showMessengerInbox,
    setShowMessengerInbox,
    chatTargetUser,
    setChatTargetUser,
    openChatWithUser,
  } = useApp();

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="main-area">
        <div className="page-content">{children}</div>
      </div>

      <Modal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Sign out" subtitle="End your CEGS OS session" maxWidth={420}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Are you sure you want to log out of CEGS OS?
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutModal(false)}>
            Stay signed in
          </button>
          <button type="button" className="btn btn-primary" onClick={logout}>
            <IC n="logout" s={14} /> Log out
          </button>
        </div>
      </Modal>

      {quickViewUser && (
        <EmployeeQuickViewModal
          targetUser={quickViewUser}
          currentUser={user}
          db={db}
          onClose={() => setQuickViewUser(null)}
          onStartChat={openChatWithUser}
        />
      )}

      <GlobalMessengerModal
        open={showMessengerInbox}
        onClose={() => {
          setShowMessengerInbox(false);
          setChatTargetUser(null);
        }}
        currentUser={user}
        targetUser={chatTargetUser}
        setTargetUser={setChatTargetUser}
        db={db}
        save={save}
      />
    </div>
  );
}
