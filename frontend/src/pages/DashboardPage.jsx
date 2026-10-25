import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Button from '../components/Button';
import PageIntro from '../components/PageIntro';
import StatCard from '../components/StatCard';
import { Notice } from '../components/StateMessage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const demoActivity = [
  ['Medical record added', 'Blood test · Apr 18, 2026', 'file', 'teal'],
  ['Follow-up scheduled', 'Wellness check · May 02, 2026', 'clock', 'blue'],
  ['Sharing session ended', 'Cardiology summary · Apr 12, 2026', 'shield', 'purple'],
];

const demoRecords = [
  ['Blood test results', 'Laboratory · Apr 18, 2026', 'Lab result'],
  ['Annual wellness visit', 'Primary care · Mar 30, 2026', 'Clinical note'],
  ['Immunization record', 'Community clinic · Feb 11, 2026', 'Vaccination'],
];

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [realRecords, setRealRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [familyMembersCount, setFamilyMembersCount] = useState(0);
  const [activeShareCount, setActiveShareCount] = useState(0);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      setLoadingRecords(true);
      setRecordsError('');
      api.get('/records')
        .then(({ data }) => {
          if (active) {
            setRealRecords(data.data || []);
            setLoadingRecords(false);
          }
        })
        .catch((err) => {
          if (active) {
            setRecordsError(err.response?.data?.message || 'Unable to load real records');
            setLoadingRecords(false);
          }
        });

      api.get('/family')
        .then(({ data }) => {
          if (active && data.data) {
            let total = 0;
            data.data.forEach((g) => {
              total += (g.members?.length || 0);
            });
            setFamilyMembersCount(total);
          }
        })
        .catch(() => {});

      api.get('/share/doctor/sessions')
        .then(({ data }) => {
          if (active && data.data) {
            const list = data.data || [];
            setActiveSessions(list);
            const activeNow = list.filter((s) => s.active && !s.expired).length;
            setActiveShareCount(activeNow);
          }
        })
        .catch(() => {});
    } else {
      setRealRecords([]);
      setLoadingRecords(false);
      setFamilyMembersCount(0);
      setActiveShareCount(0);
      setActiveSessions([]);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated]);


  const patientName = user?.fullName || 'Aarav Kumar';
  const patientInitials = patientName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const recordCount = isAuthenticated ? realRecords.length : 12;
  const recordCountDetail = isAuthenticated
    ? `${realRecords.length} records in your account`
    : 'Preview (demo count)';

  const recentList = isAuthenticated
    ? realRecords.slice(0, 3).map((r) => [r.title, `${r.providerName || 'Care provider'} · ${r.recordDate}`, r.recordType])
    : demoRecords;

  return (
    <>
      <PageIntro
        eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`Good morning, ${patientName.split(' ')[0]}.`}
        description={
          isAuthenticated
            ? 'Here is a live view of your personal health passport account.'
            : 'Here is a calm view of your health space. Information below is clearly labeled demo data until you sign in.'
        }
        actions={
          <Button icon="plus" onClick={() => document.getElementById('quick-actions')?.scrollIntoView({ behavior: 'smooth' })}>
            Quick actions
          </Button>
        }
      />

      {!isAuthenticated ? (
        <Notice>
          This dashboard is currently in demo preview mode with fictional information. <Link to="/login" className="inline-link">Sign in</Link> or <Link to="/register" className="inline-link">Create an account</Link> to connect your live data.
        </Notice>
      ) : recordsError ? (
        <Notice tone="error">{recordsError}</Notice>
      ) : (
        <Notice tone="success">
          Live connection active for {user?.email}. Medical record counts and updates reflect your authenticated backend database.
        </Notice>
      )}

      <section className="profile-banner">
        <div className="profile-person">
          <div className="profile-avatar">{patientInitials}</div>
          <div>
            <p>Patient profile</p>
            <h3>
              {patientName} <span className="verified"><Icon name="check" size={13} /></span>
            </h3>
            <small>
              {isAuthenticated ? `${user?.email} · Authenticated Account` : 'Demo preview profile · Adult'}
            </small>
          </div>
        </div>
        <Link to="/settings" className="subtle-link">
          View profile <Icon name="arrow" size={15} />
        </Link>
      </section>

      <section className="stat-grid">
        <StatCard
          icon="file"
          label={isAuthenticated ? "Medical records" : "Medical records (Demo)"}
          value={loadingRecords ? "…" : String(recordCount)}
          detail={recordCountDetail}
        />
        <StatCard
          icon="users"
          tone="blue"
          label={isAuthenticated ? "Family members" : "Family members (Demo)"}
          value={isAuthenticated ? String(familyMembersCount) : "3"}
          detail={isAuthenticated ? `${familyMembersCount} circle members` : "Connected with consent"}
        />
        <StatCard
          icon="share"
          tone="purple"
          label={isAuthenticated ? "Active Doctor Shares" : "Active sharing (Demo)"}
          value={isAuthenticated ? String(activeShareCount) : "1"}
          detail={isAuthenticated ? (activeShareCount > 0 ? `${activeShareCount} time-limited session(s)` : "No active sharing sessions") : "Expiring links demo"}
        />
        <StatCard
          icon="clock"
          tone="orange"
          label={isAuthenticated ? "Upcoming Follow-up" : "Next follow-up (Demo)"}
          value={isAuthenticated ? "None scheduled" : "May 02"}
          detail={isAuthenticated ? "No clinical reminders pending" : "Care reminder placeholder"}
        />
      </section>

      <section className="dashboard-grid">
        <article className="card recent-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">{isAuthenticated ? 'Live updates' : 'Latest updates'}</p>
              <h2>Recent health records</h2>
            </div>
            <Link to="/records" className="subtle-link">
              See all <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="record-list">
            {loadingRecords ? (
              <p style={{ color: 'var(--muted)', padding: '12px 0', fontSize: '13px' }}>Loading records…</p>
            ) : recentList.length > 0 ? (
              recentList.map(([title, detail, tag]) => (
                <div className="record-item" key={title}>
                  <span className="record-icon">
                    <Icon name="file" size={19} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </div>
                  <span className="tag">{tag}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--muted)', padding: '12px 0', fontSize: '13px' }}>
                No records created yet. <Link to="/records" className="inline-link">Add your first record</Link>.
              </p>
            )}
          </div>
        </article>

        <article className="card activity-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">{isAuthenticated ? 'Real Activity Log' : 'Mock Care Log'}</p>
              <h2>Care timeline</h2>
            </div>
            <Link to="/timeline" className="subtle-link">
              View timeline <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="activity-list">
            {isAuthenticated ? (
              realRecords.length === 0 && activeSessions.length === 0 ? (
                <p style={{ color: 'var(--muted)', padding: '12px 0', fontSize: '13px' }}>
                  No care activity recorded yet. Create a medical record to start your timeline.
                </p>
              ) : (
                <>
                  {realRecords.slice(0, 2).map((r) => (
                    <div className="activity-item" key={`rec-${r.id}`}>
                      <span className="activity-dot teal">
                        <Icon name="file" size={15} />
                      </span>
                      <div>
                        <strong>Medical record added: {r.title}</strong>
                        <small>{r.recordDate} · {r.providerName || 'Provider'}</small>
                      </div>
                    </div>
                  ))}
                  {activeSessions.slice(0, 2).map((s) => (
                    <div className="activity-item" key={`sess-${s.id}`}>
                      <span className={`activity-dot ${s.active && !s.expired ? 'purple' : 'orange'}`}>
                        <Icon name="shield" size={15} />
                      </span>
                      <div>
                        <strong>{s.active && !s.expired ? 'Doctor sharing active' : 'Doctor sharing ended'}</strong>
                        <small>Session #{s.id} · {s.active && !s.expired ? `Expires ${new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Revoked / Expired'}</small>
                      </div>
                    </div>
                  ))}
                </>
              )
            ) : (
              demoActivity.map(([title, detail, icon, tone]) => (
                <div className="activity-item" key={title}>
                  <span className={`activity-dot ${tone}`}>
                    <Icon name={icon} size={15} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section id="quick-actions" className="quick-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Make progress</p>
            <h2>Quick actions</h2>
          </div>
        </div>
        <div className="quick-grid">
          <Link to="/records" className="quick-action">
            <span>
              <Icon name="plus" size={21} />
            </span>
            <div>
              <strong>Add record metadata</strong>
              <small>Log a clinical record to your passport</small>
            </div>
            <Icon name="arrow" size={17} />
          </Link>
          <Link to="/family" className="quick-action">
            <span className="blue-bg">
              <Icon name="users" size={21} />
            </span>
            <div>
              <strong>Invite family member</strong>
              <small>Consent flow planned for next phase</small>
            </div>
            <Icon name="arrow" size={17} />
          </Link>
          <Link to="/share" className="quick-action">
            <span className="purple-bg">
              <Icon name="share" size={21} />
            </span>
            <div>
              <strong>Share with a doctor</strong>
              <small>Secure expiring links are planned</small>
            </div>
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      <section className="preview-grid">
        <article className="insight-preview">
          <div className="preview-icon">
            <Icon name="pulse" size={23} />
          </div>
          <div>
            <p className="eyebrow">Family health insights</p>
            <h2>Patterns need your consent</h2>
            <p>Private, consent-based family history insights will be available in a future release.</p>
            <Link to="/insights">
              Explore the planned experience <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="mini-chart">
            <i style={{ height: '35%' }} />
            <i style={{ height: '55%' }} />
            <i style={{ height: '43%' }} />
            <i style={{ height: '75%' }} />
            <i style={{ height: '62%' }} />
          </div>
        </article>
        <article className="community-preview">
          <div className="preview-icon">
            <Icon name="globe" size={23} />
          </div>
          <p className="eyebrow">Community intelligence</p>
          <h2>See trends, not people.</h2>
          <p>Future privacy-preserving aggregate trends. No individual locations or records are exposed.</p>
          <Link to="/community">
            Learn more <Icon name="arrow" size={15} />
          </Link>
        </article>
      </section>
    </>
  );
}

