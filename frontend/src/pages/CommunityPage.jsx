import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CommunityPage() {
  const { isAuthenticated, user } = useAuth();

  // Community Aggregates state
  const [intelligence, setIntelligence] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // User Consent state
  const [consent, setConsent] = useState(null);
  const [loadingConsent, setLoadingConsent] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState('');
  const [consentError, setConsentError] = useState('');

  const loadData = async () => {
    setLoadingData(true);
    setDataError('');
    try {
      const { data } = await api.get('/community/insights');
      setIntelligence(data.data);
    } catch (err) {
      setDataError(err.response?.data?.message || 'Failed to load community health intelligence.');
    } finally {
      setLoadingData(false);
    }
  };

  const loadConsent = async () => {
    if (!isAuthenticated) return;
    setLoadingConsent(true);
    setConsentError('');
    try {
      const { data } = await api.get('/community/consent');
      setConsent(data.data);
    } catch (err) {
      setConsentError(err.response?.data?.message || 'Failed to load your community consent preferences.');
    } finally {
      setLoadingConsent(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAuthenticated) {
      loadConsent();
    }
  }, [isAuthenticated]);

  const handleToggleConsent = async (newStatus) => {
    setUpdatingConsent(true);
    setConsentError('');
    setConsentFeedback('');
    try {
      const { data } = await api.put('/community/consent', { optIn: newStatus });
      setConsent(data.data);
      setConsentFeedback(
        newStatus
          ? 'Consent granted. Your records will be aggregated with privacy safeguards.'
          : 'Consent withdrawn. Your records are immediately excluded from community statistics.'
      );
      // Reload public community aggregates to reflect immediate participation update
      await loadData();
    } catch (err) {
      setConsentError(err.response?.data?.message || 'Failed to update community consent settings.');
    } finally {
      setUpdatingConsent(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Phase 6: Public Health"
        title="Community Health Intelligence"
        description="Privacy-preserving aggregate health trends built strictly from consenting members of the health passport community. Small cohorts are suppressed to prevent re-identification."
        action={
          <Button variant="secondary" icon="pulse" onClick={loadData} disabled={loadingData}>
            {loadingData ? 'Updating...' : 'Refresh Statistics'}
          </Button>
        }
      />

      {consentFeedback && (
        <Notice variant="success" onDismiss={() => setConsentFeedback('')}>
          {consentFeedback}
        </Notice>
      )}

      {consentError && (
        <Notice variant="error" onDismiss={() => setConsentError('')}>
          {consentError}
        </Notice>
      )}

      {dataError && (
        <Notice variant="error" onDismiss={() => setDataError('')}>
          {dataError}
        </Notice>
      )}

      {/* SECTION 1: Personal Community Contribution & Consent Control */}
      {isAuthenticated && (
        <div
          className="card"
          style={{
            marginBottom: '26px',
            border: consent?.optedIn ? '1px solid var(--teal)' : '1px solid var(--line)',
            background: consent?.optedIn ? 'linear-gradient(110deg, #ecfaf9, #fff)' : '#fff',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="eyebrow" style={{ margin: 0 }}>Contribution Governance</span>
                <span
                  style={{
                    background: consent?.optedIn ? 'var(--teal-light)' : '#f0f5f5',
                    color: consent?.optedIn ? 'var(--teal-dark)' : '#627c81',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '99px',
                  }}
                >
                  {consent?.optedIn ? 'OPTED IN' : 'OPTED OUT'}
                </span>
              </div>
              <h2 style={{ fontSize: '20px', margin: '6px 0 8px' }}>
                Your Community Health Intelligence Consent
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
                Contributing is strictly optional. Family network sharing and doctor sharing permissions never grant community permission. When opted in, only coarse categories and quarterly dates are computed—identities, exact notes, and individual event histories are never released.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {consent?.optedIn ? (
                <Button
                  variant="secondary"
                  style={{ color: 'var(--danger)', borderColor: '#f2d7db' }}
                  onClick={() => handleToggleConsent(false)}
                  disabled={updatingConsent || loadingConsent}
                >
                  {updatingConsent ? 'Updating...' : 'Withdraw Community Consent'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleToggleConsent(true)}
                  disabled={updatingConsent || loadingConsent}
                >
                  {updatingConsent ? 'Updating...' : 'Opt In to Community Insights'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Privacy Safeguards & Methodology Notice */}
      <div
        style={{
          background: '#f8fbfb',
          border: '1px solid #d5e4e5',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        <span style={{ color: 'var(--teal)', marginTop: '2px', flexShrink: 0 }}>
          <Icon name="shield" size={22} />
        </span>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#173a43' }}>
          <strong>Privacy Protections & Boundary Limitations:</strong>
          <p style={{ marginTop: '4px', color: '#567278' }}>
            {intelligence?.privacyNotice ||
              'Small groups with fewer than 3 contributing patients are suppressed to prevent re-identification. Coarse reporting periods (Quarterly) are fixed by the server to prevent temporal reconstruction.'}
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#688087', fontSize: '12px' }}>
            <li>No geographic tracking: Locations are not inferred from IP addresses or device telemetry.</li>
            <li>No individual predictions: Aggregated patterns reflect community record activity, not individual health risks.</li>
            <li>Simple k-anonymity thresholding does not guarantee differential privacy.</li>
          </ul>
        </div>
      </div>

      {/* SECTION 3: Community Metrics Summary */}
      {intelligence && (
        <div className="stat-grid" style={{ marginBottom: '26px' }}>
          <div className="stat-card">
            <span className="stat-icon blue">
              <Icon name="users" size={20} />
            </span>
            <div>
              <p>Consenting Patients</p>
              <strong>{intelligence.totalConsentingPatients}</strong>
              <small>Community members</small>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon purple">
              <Icon name="file" size={20} />
            </span>
            <div>
              <p>Eligible Records</p>
              <strong>{intelligence.eligibleRecordsAnalyzed}</strong>
              <small>Contributed data points</small>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <p>Privacy Threshold (k)</p>
              <strong>&ge; {intelligence.minimumGroupSizeThreshold}</strong>
              <small>Min patients per group</small>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon orange">
              <Icon name="pulse" size={20} />
            </span>
            <div>
              <p>Active Categories</p>
              <strong>{intelligence.categoryAggregates.filter((c) => !c.suppressed).length}</strong>
              <small>Unsuppressed signals</small>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Aggregated Trends and Categories */}
      {loadingData ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--line)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px' }}>Compiling privacy-preserving community aggregates...</p>
        </div>
      ) : !intelligence || intelligence.totalConsentingPatients === 0 ? (
        <EmptyState
          icon="globe"
          title="No community data available"
          message={intelligence?.dataSufficiencyNotice || 'No consenting patients have contributed records to community intelligence yet.'}
          action={
            !consent?.optedIn ? (
              <Button onClick={() => handleToggleConsent(true)} disabled={updatingConsent}>
                Be the First to Opt In
              </Button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '20px' }}>
          {/* Left Column: Category Signals */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px' }}>Category & Condition Distribution</h2>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
                  Aggregated from {intelligence.totalConsentingPatients} consenting community members.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {intelligence.categoryAggregates.map((item) => (
                <div
                  key={item.categoryOrCondition}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: item.suppressed ? '#fcfdfd' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: item.suppressed ? '#7c9499' : 'var(--ink)' }}>
                        {item.categoryOrCondition}
                      </strong>
                      {item.suppressed ? (
                        <span
                          style={{
                            background: '#fff6f7',
                            color: 'var(--danger)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          MASKED (&lt; {intelligence.minimumGroupSizeThreshold})
                        </span>
                      ) : (
                        <span className="tag" style={{ background: '#e1f4f3', color: 'var(--teal-dark)' }}>
                          {item.uniqueContributingPatients} patients
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 800, color: item.suppressed ? '#9bb0b4' : 'var(--ink)' }}>
                      {item.suppressed ? 'Suppressed' : `${item.totalEvents} events`}
                    </div>
                  </div>

                  {item.suppressed ? (
                    <small style={{ color: '#88a1a6', display: 'block', marginTop: '6px' }}>
                      {item.suppressionNotice}
                    </small>
                  ) : (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ width: '100%', height: '6px', background: '#eaf3f3', borderRadius: '99px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, (item.totalEvents / intelligence.eligibleRecordsAnalyzed) * 100)}%`,
                            height: '100%',
                            background: 'var(--teal)',
                            borderRadius: '99px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Pre-binned Quarterly Trends */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px' }}>Predefined Temporal Trends</h2>
              <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
                Coarse quarterly time-bins prevent narrow range reconstruction.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {intelligence.timeWindowTrends.map((trend) => (
                <div
                  key={trend.periodLabel}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: '#f8fbfb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px' }}>{trend.periodLabel}</strong>
                    <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                      {trend.suppressed
                        ? `Suppressed (< ${intelligence.minimumGroupSizeThreshold} patients)`
                        : `${trend.contributingPatientsCount} contributing patients`}
                    </small>
                  </div>

                  <div>
                    {trend.suppressed ? (
                      <span style={{ color: '#88a1a6', fontSize: '12px', fontWeight: 600 }}>[Hidden]</span>
                    ) : (
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--teal)' }}>
                        {trend.totalEvents} records
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: '#f0fbfa', borderRadius: '8px', fontSize: '12px', color: '#25646b' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 700, marginBottom: '4px' }}>
                <Icon name="shield" size={16} />
                <span>Anti-Reconstruction Protection</span>
              </div>
              Arbitrary custom date filtering is disabled on community endpoints to prevent differential reconstruction of individual patient additions.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
