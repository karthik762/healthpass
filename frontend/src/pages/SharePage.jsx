import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EXPIRY_OPTIONS = [
  { label: '15 Minutes', value: 15 },
  { label: '1 Hour', value: 60 },
  { label: '4 Hours', value: 240 },
  { label: '24 Hours (1 Day)', value: 1440 },
  { label: '3 Days', value: 4320 },
  { label: '7 Days', value: 10080 },
];

export default function SharePage() {
  const { isAuthenticated, user } = useAuth();

  // Data state
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Creation form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set());
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Newly created session highlight
  const [newlyCreatedSession, setNewlyCreatedSession] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Revoking state
  const [revokingId, setRevokingId] = useState(null);

  // Selected session inspect modal
  const [inspectedSession, setInspectedSession] = useState(null);

  const loadData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const [recordsRes, sessionsRes] = await Promise.all([
        api.get('/records'),
        api.get('/share/doctor/sessions'),
      ]);
      setRecords(recordsRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load records or sharing sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const toggleSelectRecord = (id) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRecords = () => {
    if (selectedRecordIds.size === records.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(records.map((r) => r.id)));
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (selectedRecordIds.size === 0) {
      setCreateError('Please select at least one medical record to authorize.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const payload = {
        recordIds: Array.from(selectedRecordIds),
        expiryMinutes: Number(expiryMinutes),
      };
      const { data } = await api.post('/share/doctor/sessions', payload);
      setNewlyCreatedSession(data.data);
      setShowCreateModal(false);
      setSelectedRecordIds(new Set());
      setFeedback('Secure sharing code generated! Share this code with your doctor.');
      await loadData();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to generate sharing session.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session? The doctor will immediately lose all access.')) {
      return;
    }
    setRevokingId(sessionId);
    setError('');
    try {
      await api.delete(`/share/doctor/sessions/${sessionId}`);
      setFeedback('Session revoked immediately. Access has been terminated.');
      if (newlyCreatedSession?.id === sessionId) {
        setNewlyCreatedSession(null);
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke session.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const formatExpiry = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const isExpired = (session) => {
    return session.expired || new Date(session.expiresAt) <= new Date();
  };

  return (
    <div>
      <PageIntro
        eyebrow="Phase 3: Secure Doctor Sharing"
        title="Share with Doctor"
        description="Empower consulting clinicians with zero-friction, time-limited access to specific medical records. You control what is shared and can revoke access anytime."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/doctor-access" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" icon="arrow">
                Doctor Portal
              </Button>
            </Link>
            <Button
              icon="plus"
              onClick={() => {
                setShowCreateModal(true);
                setCreateError('');
              }}
              disabled={records.length === 0}
            >
              New Sharing Session
            </Button>
          </div>
        }
      />

      {feedback && (
        <Notice variant="success" onDismiss={() => setFeedback('')}>
          {feedback}
        </Notice>
      )}

      {error && (
        <Notice variant="error" onDismiss={() => setError('')}>
          {error}
        </Notice>
      )}

      {/* Prominent Active Code Banner (shown when a session is freshly created) */}
      {newlyCreatedSession && (
        <div
          className="card"
          style={{
            margin: '20px 0',
            border: '2px solid var(--teal)',
            background: 'linear-gradient(135deg, #f0fbfb, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--teal)' }}>Active One-Time Sharing Code</span>
              <h2 style={{ fontSize: '24px', margin: '4px 0 8px' }}>Pass this code to your doctor</h2>
              <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '540px' }}>
                Your clinician can enter this high-entropy code at the Doctor Access portal to view only the {newlyCreatedSession.recordCount} reports you authorized. Access expires on{' '}
                <strong>{formatExpiry(newlyCreatedSession.expiresAt)}</strong>.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#fff',
                  border: '2px dashed var(--teal)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '26px',
                    fontWeight: '800',
                    letterSpacing: '0.18em',
                    color: 'var(--teal)',
                  }}
                >
                  {newlyCreatedSession.sharingCode}
                </span>
                <Button
                  variant="secondary"
                  icon="file"
                  onClick={() => handleCopyCode(newlyCreatedSession.sharingCode)}
                >
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="secondary"
                  style={{ color: 'var(--danger)', borderColor: '#f2d7db' }}
                  onClick={() => handleRevokeSession(newlyCreatedSession.id)}
                >
                  Revoke Now
                </Button>
                <Button variant="secondary" onClick={() => setNewlyCreatedSession(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="share-layout">
        {/* Left Card: Security & Policy Overview */}
        <article className="share-card card">
          <span className="large-icon purple-bg">
            <Icon name="shield" size={27} />
          </span>
          <p className="eyebrow">Zero-Trust Clinician Sharing</p>
          <h2>Granular, record-level protection.</h2>
          <p>
            Unlike open-ended records access, doctor sharing in the Centralized Health Passport enforces strict cryptographic authorization boundaries.
          </p>
          <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
            <div style={{ display: 'flex', gap: '9px', fontSize: '13px', color: '#547278' }}>
              <Icon name="check" size={17} />
              <span><strong>Explicit Report Selection:</strong> Only records you check are visible.</span>
            </div>
            <div style={{ display: 'flex', gap: '9px', fontSize: '13px', color: '#547278' }}>
              <Icon name="check" size={17} />
              <span><strong>Cryptographic Hash Storage:</strong> Codes are SHA-256 hashed in database.</span>
            </div>
            <div style={{ display: 'flex', gap: '9px', fontSize: '13px', color: '#547278' }}>
              <Icon name="check" size={17} />
              <span><strong>Instant Revocation:</strong> One click invalidates doctor sessions immediately.</span>
            </div>
            <div style={{ display: 'flex', gap: '9px', fontSize: '13px', color: '#547278' }}>
              <Icon name="check" size={17} />
              <span><strong>Isolated Boundaries:</strong> Completely separate from family network codes.</span>
            </div>
          </div>
          <div style={{ marginTop: '22px' }}>
            <Button
              icon="plus"
              onClick={() => {
                setShowCreateModal(true);
                setCreateError('');
              }}
              disabled={records.length === 0}
            >
              Select Records & Generate Code
            </Button>
          </div>
        </article>

        {/* Right Card: Prototype Disclaimer & Guidelines */}
        <article className="card sharing-rules">
          <p className="eyebrow">Prototype Trust Architecture</p>
          <h3>Doctor Access Notice</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>
            For this prototype demonstration, a valid sharing code authorizes read-only record access. The system does not independently verify that the code holder is a state-licensed practitioner.
          </p>
          <ul>
            <li>
              <Icon name="check" size={17} />
              <span>Strictly read-only access — doctors cannot modify, delete, or create reports.</span>
            </li>
            <li>
              <Icon name="check" size={17} />
              <span>Rate-limited validation guards against automated brute-force attacks.</span>
            </li>
            <li>
              <Icon name="check" size={17} />
              <span>No patient metadata is exposed until successful code verification.</span>
            </li>
            <li>
              <Icon name="check" size={17} />
              <span>Sessions automatically expire once the configured duration lapses.</span>
            </li>
          </ul>
        </article>
      </div>

      {/* Sharing Sessions History & Review Section */}
      <section style={{ marginTop: '34px' }}>
        <div className="section-heading" style={{ marginBottom: '16px' }}>
          <div>
            <h2>Doctor Sharing Sessions ({sessions.length})</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
              Audit all active, revoked, and expired doctor access credentials.
            </p>
          </div>
          <Button variant="secondary" icon="pulse" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {sessions.length === 0 ? (
          <section className="card empty-sharing">
            <Icon name="shield" size={25} />
            <div>
              <h3>No sharing sessions created</h3>
              <p>When you generate a code for your doctor, your active and historical sessions will be listed here.</p>
            </div>
          </section>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 140px',
                padding: '14px 21px',
                background: '#f8fbfb',
                color: '#8aa0a4',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              <span>Session ID</span>
              <span>Status & Expiry</span>
              <span>Authorized Reports</span>
              <span>Created On</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {sessions.map((session) => {
              const expired = isExpired(session);
              const isActive = session.active && !expired;

              let statusBadge = (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#e1f4f3',
                    color: 'var(--teal-dark)',
                  }}
                >
                  <i style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--teal)' }} />
                  Active
                </span>
              );

              if (!session.active) {
                statusBadge = (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#fff6f7',
                      color: 'var(--danger)',
                    }}
                  >
                    <i style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)' }} />
                    Revoked
                  </span>
                );
              } else if (expired) {
                statusBadge = (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#f0f5f5',
                      color: '#657f85',
                    }}
                  >
                    <i style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8aa0a4' }} />
                    Expired
                  </span>
                );
              }

              return (
                <div
                  key={session.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 140px',
                    alignItems: 'center',
                    padding: '16px 21px',
                    borderTop: '1px solid #edf2f2',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <strong>Session #{session.id}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                      Token: SHA-256 Hashed
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {statusBadge}
                    </div>
                    <small style={{ display: 'block', color: '#81979c', marginTop: '4px' }}>
                      {isActive ? `Expires ${formatExpiry(session.expiresAt)}` : `Expired ${formatExpiry(session.expiresAt)}`}
                    </small>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => setInspectedSession(session)}
                      style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Icon name="file" size={15} />
                      {session.recordCount} reports authorized
                    </button>
                  </div>

                  <div style={{ color: '#81979c', fontSize: '12px' }}>
                    {formatExpiry(session.createdAt)}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isActive ? (
                      <Button
                        variant="secondary"
                        style={{
                          color: 'var(--danger)',
                          borderColor: '#f2d7db',
                          fontSize: '12px',
                          minHeight: '32px',
                          padding: '0 10px',
                        }}
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                      >
                        {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    ) : (
                      <span style={{ color: '#8aa0a4', fontSize: '12px' }}>Inactive</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL: Create New Sharing Session */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(12, 45, 51, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Step 1 of 2</span>
                <h2 style={{ fontSize: '20px' }}>Authorize Medical Records to Share</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {createError && (
              <Notice variant="error" onDismiss={() => setCreateError('')}>
                {createError}
              </Notice>
            )}

            <form onSubmit={handleCreateSession} className="form-stack">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>
                    Select Reports ({selectedRecordIds.size} of {records.length} selected)
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={selectAllRecords}
                  >
                    {selectedRecordIds.size === records.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '8px',
                    background: '#fcfdfd',
                  }}
                >
                  {records.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                      No medical records found. Add medical records first before creating a sharing session.
                    </p>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => toggleSelectRecord(record.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderBottom: '1px solid #edf2f2',
                          cursor: 'pointer',
                          background: selectedRecordIds.has(record.id) ? 'var(--teal-light)' : 'transparent',
                          borderRadius: '8px',
                          transition: 'background 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.has(record.id)}
                          onChange={() => {}} // Controlled by container div
                          style={{ width: '17px', height: '17px', accentColor: 'var(--teal)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{record.title}</strong>
                          <div style={{ display: 'flex', gap: '8px', color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                            <span>{record.recordType}</span>
                            <span>•</span>
                            <span>{record.recordDate}</span>
                            {record.providerName && (
                              <>
                                <span>•</span>
                                <span>{record.providerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="expirySelect">Access Expiry Duration</label>
                <select
                  id="expirySelect"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                  After this time, the code automatically invalidates and records will no longer be viewable by the clinician.
                </small>
              </div>

              <div className="form-actions" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || selectedRecordIds.size === 0}>
                  {creating ? 'Generating Code...' : `Authorize & Generate Code (${selectedRecordIds.size})`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Authorized Records in a Session */}
      {inspectedSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(12, 45, 51, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Session #{inspectedSession.id}</span>
                <h2 style={{ fontSize: '19px' }}>Authorized Records ({inspectedSession.authorizedRecords?.length || inspectedSession.recordCount})</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setInspectedSession(null)}
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
              The doctor can only inspect the exact records below while this session is active.
            </p>

            <div style={{ display: 'grid', gap: '8px' }}>
              {inspectedSession.authorizedRecords && inspectedSession.authorizedRecords.length > 0 ? (
                inspectedSession.authorizedRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px 14px',
                      background: '#f8fbfb',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '13px' }}>{r.title}</strong>
                      <span className="tag">{r.recordType}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>
                      <span>Date: {r.recordDate}</span>
                      {r.providerName && <span> • Provider: {r.providerName}</span>}
                    </div>
                    {r.notes && (
                      <p style={{ color: '#476267', fontSize: '12px', marginTop: '6px', background: '#fff', padding: '8px', borderRadius: '6px' }}>
                        {r.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Authorized record details are stored securely.
                </p>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Button variant="secondary" onClick={() => setInspectedSession(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
