import { Outlet } from 'react-router-dom';
import Brand from '../components/Brand';
import Icon from '../components/Icon';

export default function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-panel"><Brand /><Outlet /></section>
      <aside className="auth-aside">
        <div className="orb orb-one" /><div className="orb orb-two" />
        <div className="auth-aside-content">
          <span className="trust-badge"><Icon name="shield" size={16} /> Built with privacy in mind</span>
          <h1>Your health story,<br /><em>clearer together.</em></h1>
          <p>Bring your health information into one thoughtful, patient-controlled place.</p>
          <div className="feature-list">
            <span><Icon name="check" size={17} /> Patient-owned records</span>
            <span><Icon name="check" size={17} /> Consent-first sharing</span>
            <span><Icon name="check" size={17} /> Family care, on your terms</span>
          </div>
        </div>
        <p className="aside-footnote">Foundation prototype · Not for emergencies</p>
      </aside>
    </main>
  );
}
