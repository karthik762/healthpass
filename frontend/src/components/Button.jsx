import Icon from './Icon';

export default function Button({ children, variant = 'primary', icon, className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
