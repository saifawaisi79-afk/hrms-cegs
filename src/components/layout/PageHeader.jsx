'use client';

export function PageHeader({ title, purpose, children, actions }) {
  return (
    <div className="page-header-block">
      <div className="page-header-text">
        <h1 className="page-header-title">{title}</h1>
        {purpose && <p className="page-header-purpose">{purpose}</p>}
        {children}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
