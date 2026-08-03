'use client';

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="ui-empty-state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={`ui-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} />
      <span className="ui-toggle-track" aria-hidden="true" />
      {label && <span className="ui-toggle-label">{label}</span>}
    </label>
  );
}
