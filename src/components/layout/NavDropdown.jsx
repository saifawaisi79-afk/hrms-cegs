'use client';

import Link from 'next/link';
import { IC } from '@/components/hrms/HrmsLegacy';

export function NavDropdown({
  label,
  items = [],
  active,
  open,
  onEnter,
  onLeave,
  onToggle,
  onNavigate,
}) {
  return (
    <div className="nav-dropdown-wrapper" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className={`nav-capsule-btn ${active || open ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        <IC
          n="chevron"
          s={11}
          style={{
            transition: 'transform 0.25s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div
          className="nav-dropdown-menu"
          role="menu"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="dropdown-item"
              role="menuitem"
              onClick={() => onNavigate?.()}
            >
              <IC n={item.icon} /> {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
