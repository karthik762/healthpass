import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

export default function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleExit = () => {
    sessionStorage.removeItem('doctor_validated_code');
    sessionStorage.removeItem('doctor_shared_data');
    if (user?.role === 'ROLE_DOCTOR') {
      logout();
      navigate('/login');
    } else {
      navigate('/doctor-access');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', display: 'flex', flexDirection: 'column' }}>
      {/* Top Clinical Header */}
      <header
        style={{
          background: '#0d2d33',
          color: '#ffffff',
          padding: '0 clamp(16px, 4vw, 40px)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #087f8c',
          boxShadow: '0 2px 8px rgba(10, 37, 43, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#087f8c',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <Icon name="shield" size={18} />
            </span>
            <div>
              <strong style={{ fontSize: '15px', letterSpacing: '0.02em', display: 'block' }}>
                HealthPass Clinician Portal
              </strong>
              <span style={{ fontSize: '10px', color: '#9cc7cc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {user?.role === 'ROLE_DOCTOR' ? `Authenticated Doctor (${user.fullName})` : 'Authorized Clinician Session'}
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#d1fae5',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #059669',
              padding: '3px 9px',
              borderRadius: '99px',
            }}
          >
            Read-Only Access
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/doctor/dashboard"
            style={{
              color: location.pathname === '/doctor/dashboard' ? '#ffffff' : '#b2d5d9',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              background: location.pathname === '/doctor/dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={handleExit}
            style={{
              background: 'transparent',
              border: '1px solid #365b61',
              color: '#e2f1f2',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon name="close" size={14} /> {user?.role === 'ROLE_DOCTOR' ? 'Sign out' : 'Exit Portal'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '28px clamp(16px, 4vw, 40px) 60px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      <footer
        style={{
          borderTop: '1px solid #dbe6e8',
          background: '#ffffff',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b898f',
        }}
      >
        <strong>Clinician Boundary Notice:</strong> Access is time-limited and authorized solely by the individual patient via single-use security token. Possession of a valid sharing code does not establish licensed practitioner identity.
      </footer>
    </div>
  );
}
