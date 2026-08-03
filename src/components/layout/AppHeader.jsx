'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { IC } from '@/components/hrms/HrmsLegacy';
import { isNavGroupActive } from '@/lib/nav';
import { NavDropdown } from './NavDropdown';

function MobileNavSection({ title, items, onNavigate }) {
  const [open, setOpen] = useState(true);
  if (!items?.length) return null;
  return (
    <div className="mobile-nav-section">
      <button
        type="button"
        className="mobile-nav-section-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        />
      </button>
      {open && (
        <div className="mobile-nav-links">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mobile-nav-link"
              onClick={onNavigate}
            >
              <IC n={item.icon} s={16} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const {
    user,
    nav,
    unread,
    unreadMsgCount,
    setShowMessengerInbox,
    setShowLogoutModal,
    navigate,
  } = useApp();
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownTimeoutRef = useRef(null);

  const handleMouseEnterDropdown = (name) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const toggleDropdown = (name) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="cegs-header app-header">
        <div className="header-left">
          <button
            type="button"
            className="nav-mobile-toggle"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            className="cegs-logo-capsule"
            onClick={() => setShowLogoutModal(true)}
            style={{ cursor: 'pointer' }}
            title="Click logo to log out"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setShowLogoutModal(true);
            }}
          >
            CEGS<span>OS</span>
          </div>
        </div>

        <div className="header-center desktop-nav">
          <nav className="nav-capsule-bar" aria-label="Primary">
            <NavDropdown
              id="main"
              label="Main"
              items={nav.main}
              active={activeDropdown === 'main' || isNavGroupActive(pathname, nav.main)}
              open={activeDropdown === 'main'}
              onEnter={() => handleMouseEnterDropdown('main')}
              onLeave={handleMouseLeaveDropdown}
              onToggle={() => toggleDropdown('main')}
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="campaign"
              label="Campaign Hub"
              items={nav.campaign}
              active={activeDropdown === 'campaign' || isNavGroupActive(pathname, nav.campaign)}
              open={activeDropdown === 'campaign'}
              onEnter={() => handleMouseEnterDropdown('campaign')}
              onLeave={handleMouseLeaveDropdown}
              onToggle={() => toggleDropdown('campaign')}
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="billing"
              label="Billing & Support"
              items={nav.billing}
              active={activeDropdown === 'billing' || isNavGroupActive(pathname, nav.billing)}
              open={activeDropdown === 'billing'}
              onEnter={() => handleMouseEnterDropdown('billing')}
              onLeave={handleMouseLeaveDropdown}
              onToggle={() => toggleDropdown('billing')}
              onNavigate={closeMobile}
            />
            <Link
              href={nav.itSupport.href}
              className={`nav-capsule-btn nav-capsule-link ${pathname.startsWith('/it/') ? 'active' : ''}`}
              onClick={closeMobile}
            >
              <IC n="help" s={14} />
              <span>{nav.itSupport.label}</span>
            </Link>
          </nav>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="hdr-icon-btn hdr-settings-btn"
            title="Settings"
            aria-label="Settings"
            onClick={() => navigate('settings')}
          >
            <IC n="settings" s={16} />
          </button>
          <button
            type="button"
            className="hdr-icon-btn"
            title="Team messenger"
            aria-label="Open messenger"
            onClick={() => setShowMessengerInbox(true)}
          >
            <IC n="message" s={16} />
            {unreadMsgCount > 0 && <span className="hdr-badge">{unreadMsgCount}</span>}
          </button>
          <button
            type="button"
            className="hdr-icon-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => navigate('notifications')}
          >
            <IC n="bell" s={16} />
            {unread > 0 && <span className="hdr-badge">{unread}</span>}
          </button>
          <button
            type="button"
            className="hdr-avatar"
            title={user?.name || 'Profile'}
            aria-label="Open profile"
            onClick={() => navigate(user?.role === 'employee' ? 'profile' : 'dashboard')}
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Mobile drawer — sibling of header so it is not clipped */}
      <div
        className={`mobile-nav-backdrop ${mobileOpen ? 'is-open' : ''}`}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      />
      <aside
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer ${mobileOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileOpen}
        aria-label="Mobile navigation"
      >
        <div className="mobile-nav-drawer-head">
          <strong>Menu</strong>
          <button type="button" className="nav-mobile-toggle" aria-label="Close menu" onClick={closeMobile}>
            <X size={20} />
          </button>
        </div>
        <div className="mobile-nav-drawer-body">
          <MobileNavSection title="Main" items={nav.main} onNavigate={closeMobile} />
          <MobileNavSection title="Campaign Hub" items={nav.campaign} onNavigate={closeMobile} />
          <MobileNavSection title="Billing & Support" items={nav.billing} onNavigate={closeMobile} />
          <Link href={nav.itSupport.href} className="mobile-nav-link mobile-nav-link-solo" onClick={closeMobile}>
            <IC n="help" s={16} />
            <span>{nav.itSupport.label}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
