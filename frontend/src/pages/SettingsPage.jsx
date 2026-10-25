import { useState, useEffect } from 'react';
import PageIntro from '../components/PageIntro';
import Button from '../components/Button';
import { Notice } from '../components/StateMessage';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || 'Aarav Kumar');
  const [email, setEmail] = useState(user?.email || 'aarav@example.com');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  return (
    <>
      <PageIntro
        title="Profile & settings"
        description="Review your profile foundation and prepare preferences for future consent-based features."
      />
      {saved && (
        <Notice tone="success">
          Your local interface preferences were updated for this browser session.
        </Notice>
      )}
      <section className="settings-layout">
        <form
          className="card settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
        >
          <div className="card-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Personal details</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                readOnly={isAuthenticated}
                title={isAuthenticated ? 'Account name registered in database' : ''}
              />
            </label>
            <label>
              Email address
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                readOnly={isAuthenticated}
                title={isAuthenticated ? 'Account email registered in database' : ''}
              />
            </label>
            <label>
              Date of birth
              <input type="date" />
            </label>
            <label>
              Preferred language
              <select defaultValue="English">
                <option>English</option>
                <option>Hindi</option>
                <option>Kannada</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            {isAuthenticated && (
              <Button
                type="button"
                variant="secondary"
                style={{ color: 'var(--danger)', borderColor: '#f2d7db' }}
                onClick={logout}
              >
                Sign out
              </Button>
            )}
            <Button type="submit" icon="check">
              Save preferences
            </Button>
          </div>
        </form>
        <aside className="card privacy-settings">
          <p className="eyebrow">Privacy centre</p>
          <h2>You stay in control.</h2>
          <p>
            Family sharing, doctor sharing, and emergency settings will appear here once their consent
            and access controls are ready.
          </p>
          <Button variant="secondary" disabled>
            Review permissions (planned)
          </Button>
        </aside>
      </section>
      <section className="card account-foundation">
        <h3>Security foundation</h3>
        <p>
          Passwords are hashed on the backend using BCrypt. Credentials are maintained in active memory
          and isolated to this session. Medical records are restricted strictly to their authenticated owner.
        </p>
      </section>
    </>
  );
}

