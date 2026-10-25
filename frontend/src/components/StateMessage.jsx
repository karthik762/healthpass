import Icon from './Icon';

export function Notice({ tone = 'info', children }) {
  const icon = tone === 'success' ? 'check' : tone === 'error' ? 'close' : 'shield';
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={icon} size={18} />{children}</div>;
}

export function EmptyState({ icon = 'file', title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={27} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function LoadingCard() {
  return <div className="loading-card" aria-label="Loading content"><span /><span /><span /></div>;
}
