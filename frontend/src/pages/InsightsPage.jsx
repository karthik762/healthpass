import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InsightsPage() {
  const { isAuthenticated, user } = useAuth();

  const [familyGroups, setFamilyGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [insights, setInsights] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState('');

  // 1. Load user's family groups
  const loadFamilyGroups = async () => {
    if (!isAuthenticated) return;
    setLoadingGroups(true);
    setError('');
    try {
      const { data } = await api.get('/family');
      const groups = data.data || [];
      setFamilyGroups(groups);
      if (groups.length > 0) {
        setSelectedGroupId((prev) => (prev ? prev : String(groups[0].id)));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your family groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    loadFamilyGroups();
  }, [isAuthenticated]);

  // 2. Load insights whenever selectedGroupId changes
  const loadInsights = async (groupId) => {
    if (!groupId || !isAuthenticated) return;
    setLoadingInsights(true);
    setError('');
    try {
      const { data } = await api.get(`/family/${groupId}/insights`);
      setInsights(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate family health insights.');
      setInsights(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadInsights(selectedGroupId);
    } else {
      setInsights(null);
    }
  }, [selectedGroupId, isAuthenticated]);

  return (
    <div>
      <PageIntro
        eyebrow="Phase 5: Family Health Insights"
        title="Family Health Insights"
        description="Review health patterns aggregated strictly from consenting family members' medical records. Designed with clinical humility as prompts for clinician conversations, not diagnoses."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/family">
              <Button variant="secondary" icon="users">
                Manage Family & Consent
              </Button>
            </Link>
            <Button
              variant="secondary"
              icon="pulse"
              onClick={() => loadInsights(selectedGroupId)}
              disabled={loadingInsights || !selectedGroupId}
            >
              {loadingInsights ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {error && (
        <Notice variant="error" onDismiss={() => setError('')}>
          {error}
        </Notice>
      )}

      {/* Prominent Clinical Disclaimer & Privacy Safeguard */}
      <div
        style={{
          background: '#f4fbfb',
          border: '1px solid #bce6e2',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '26px',
        }}
      >
        <span style={{ color: 'var(--teal)', marginTop: '2px', flexShrink: 0 }}>
          <Icon name="shield" size={22} />
        </span>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#1f4850' }}>
          <strong>Important Clinical & Biological Limitations:</strong>
          <p style={{ marginTop: '4px', color: '#39636a' }}>
            {insights?.clinicalDisclaimer ||
              'Informational observations only. Recorded health history in a family group does not establish biological relation, genetic inheritance, diagnostic certainty, or clinical risk. Consult a qualified healthcare professional for genetic counseling and medical evaluation.'}
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#4d757c', fontSize: '12px' }}>
            <li>Family circles include non-biological kin, adopted family, or legal guardians. Membership does not imply shared genetics.</li>
            <li>Observations only examine records from family members with explicit, active record-sharing consent enabled.</li>
            <li>No full medical reports or unconsented records are ever displayed.</li>
          </ul>
        </div>
      </div>

      {/* Family Group Selector Toolbar */}
      {familyGroups.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <label htmlFor="groupSelect" style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Active Family Circle:
            </label>
            <select
              id="groupSelect"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              style={{ minHeight: '40px', minWidth: '220px', fontSize: '13px' }}
            >
              {familyGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members?.length || 0} members)
                </option>
              ))}
            </select>
          </div>

          {insights && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
              <span>
                Active members: <strong>{insights.totalActiveMembers}</strong>
              </span>
              <span>•</span>
              <span>
                Consenting members: <strong style={{ color: 'var(--teal)' }}>{insights.consentingMembersCount}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Insights Views */}
      {loadingGroups ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--line)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px' }}>Loading your family groups...</p>
        </div>
      ) : familyGroups.length === 0 ? (
        <EmptyState
          icon="users"
          title="No family groups found"
          message="Family Health Insights require an active Family Circle. Create or join a family group and invite members to begin."
          action={
            <Link to="/family">
              <Button icon="plus">Go to Family Health Network</Button>
            </Link>
          }
        />
      ) : loadingInsights ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--line)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px' }}>Aggregating consented family patterns...</p>
        </div>
      ) : !insights ? null : insights.consentingMembersCount < 2 ? (
        /* Insufficient Data State */
        <div className="card" style={{ padding: '36px clamp(20px, 4vw, 40px)', background: '#fff', textAlign: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'var(--teal-light)',
              color: 'var(--teal)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon name="pulse" size={28} />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Insufficient Consented Data</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            {insights.dataSufficiencyNotice}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fbfb',
              padding: '10px 18px',
              borderRadius: '99px',
              fontSize: '12px',
              color: '#496f75',
              border: '1px solid var(--line)',
            }}
          >
            <Icon name="shield" size={16} />
            <span>Currently: <strong>{insights.consentingMembersCount}</strong> of <strong>{insights.totalActiveMembers}</strong> members have enabled record consent</span>
          </div>
          <div style={{ marginTop: '24px' }}>
            <Link to="/family">
              <Button variant="secondary" icon="users">
                Review Family Consent Settings
              </Button>
            </Link>
          </div>
        </div>
      ) : insights.observedPatterns.length === 0 ? (
        /* Zero Recurring Patterns Detected State */
        <div className="card" style={{ padding: '36px clamp(20px, 4vw, 40px)', background: '#fff', textAlign: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: '#ecf8f7',
              color: 'var(--teal)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon name="check" size={28} />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No Recurring Patterns Detected</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '560px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            Based on records from the <strong>{insights.consentingMembersCount}</strong> consenting members in{' '}
            <strong>{insights.groupName}</strong>, no conditions or categories appeared across multiple members.
          </p>
          <div style={{ fontSize: '12px', color: '#668087' }}>
            Patterns update automatically as consenting members add medical records.
          </div>
        </div>
      ) : (
        /* Observed Condition Patterns Display */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '19px' }}>
                Observed Recurring Conditions ({insights.observedPatterns.length})
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
                Conditions recorded in 2 or more consenting members of <strong>{insights.groupName}</strong>.
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--teal)',
                background: 'var(--teal-light)',
                padding: '4px 10px',
                borderRadius: '99px',
              }}
            >
              {insights.consentingMembersCount} Consenting Members Analyzed
            </span>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {insights.observedPatterns.map((pattern, idx) => {
              const prevalencePercent = Math.min(
                100,
                Math.round((pattern.affectedMembersCount / insights.consentingMembersCount) * 100)
              );

              return (
                <div
                  key={pattern.condition}
                  className="card"
                  style={{
                    padding: '24px',
                    border: '1px solid var(--line)',
                    background: '#fff',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'var(--teal-light)',
                          color: 'var(--teal)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="pulse" size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '18px', color: 'var(--ink)' }}>{pattern.condition}</h3>
                          <span
                            style={{
                              background: '#f0f4ff',
                              color: 'var(--blue)',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {pattern.affectedMembersCount} of {insights.consentingMembersCount} Consenting Members ({prevalencePercent}%)
                          </span>
                        </div>
                        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
                          {pattern.observationSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Supporting Categories */}
                  <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#688087', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Record Categories:
                    </span>
                    {pattern.recordCategories.map((cat) => (
                      <span key={cat} className="tag" style={{ background: '#f2f7f7', color: '#35565d' }}>
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Progress Indicator */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ width: '100%', height: '7px', background: '#eaf4f4', borderRadius: '99px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${prevalencePercent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #087f8c, #397cd4)',
                          borderRadius: '99px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Clarification prompt */}
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      background: '#f8fbfb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#496b72',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Icon name="shield" size={15} />
                    <span>
                      Prompt for clinical review: Share these recurring history points with your physician or genetic counselor during your next appointment.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
