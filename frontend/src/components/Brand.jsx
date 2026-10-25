import Icon from './Icon';

export default function Brand({ compact = false }) {
  return (
    <div className="brand" aria-label="Centralized Health Passport">
      <span className="brand-mark"><Icon name="heart" size={21} stroke={2.2} /></span>
      {!compact && <span>health<span>pass</span></span>}
    </div>
  );
}
