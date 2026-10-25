import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function EmergencyCardPage() {
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [cardData, setCardData] = useState({
    bloodGroup: '',
    allergies: '',
    currentMedications: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    additionalNotes: '',
  });

  const loadCard = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/emergency-card');
      if (data.data) {
        setCardData({
          bloodGroup: data.data.bloodGroup || '',
          allergies: data.data.allergies || '',
          currentMedications: data.data.currentMedications || '',
          medicalConditions: data.data.medicalConditions || '',
          emergencyContactName: data.data.emergencyContactName || '',
          emergencyContactRelationship: data.data.emergencyContactRelationship || '',
          emergencyContactPhone: data.data.emergencyContactPhone || '',
          additionalNotes: data.data.additionalNotes || '',
        });
      } else {
        // No card created yet -> prompt editing mode
        setIsEditing(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your emergency health card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    setCardData({ ...cardData, [e.target.name]: e.target.value });
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const { data } = await api.put('/emergency-card', cardData);
      setFeedback('Emergency health card saved successfully.');
      setIsEditing(false);
      if (data.data) {
        setCardData({
          bloodGroup: data.data.bloodGroup || '',
          allergies: data.data.allergies || '',
          currentMedications: data.data.currentMedications || '',
          medicalConditions: data.data.medicalConditions || '',
          emergencyContactName: data.data.emergencyContactName || '',
          emergencyContactRelationship: data.data.emergencyContactRelationship || '',
          emergencyContactPhone: data.data.emergencyContactPhone || '',
          additionalNotes: data.data.additionalNotes || '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save emergency card.');
    } finally {
      setSaving(false);
    }
  };

  const hasAnyData = Object.values(cardData).some((val) => val && val.trim() !== '');

  return (
    <div>
      <PageIntro
        eyebrow="Phase 4: Emergency Care"
        title="Emergency Health Card"
        description="A patient-controlled emergency summary card for critical medical and contact information during an urgent medical encounter."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditing && (
              <Button icon="settings" onClick={() => setIsEditing(true)}>
                Edit Emergency Card
              </Button>
            )}
            <Button variant="secondary" icon="pulse" onClick={loadCard} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
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

      {/* Patient Provided Notice Banner */}
      <div
        style={{
          background: '#fff9ed',
          border: '1px solid #fed7aa',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '26px',
          color: '#845318',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        <Icon name="shield" size={20} />
        <div>
          <strong>Patient-Provided Information:</strong> Emergency details are entered directly by the account holder and may be self-reported, incomplete, or pending update. Never rely exclusively on this card in life-threatening situations — always contact emergency response services immediately.
        </div>
      </div>

      <div className="emergency-layout">
        {/* Left: Interactive/Visual Emergency Card Presentation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <article className="emergency-card" style={{ minHeight: 'auto', padding: '26px' }}>
            <div className="emergency-card-head">
              <span>
                <Icon name="heart" size={20} /> HealthPass Emergency Summary
              </span>
              <small style={{ background: 'rgba(255,255,255,0.18)', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                {cardData.bloodGroup ? `BLOOD: ${cardData.bloodGroup}` : 'ACTIVE CARD'}
              </small>
            </div>

            <h2 style={{ fontSize: '26px', marginTop: '24px', marginBottom: '4px' }}>
              {user?.fullName || 'Authenticated Patient'}
            </h2>
            <p className="emergency-label">Verified Patient Passport Account</p>

            <div className="emergency-lines" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', margin: '22px 0 16px' }}>
              <div>
                <span>Blood Group</span>
                <strong>{cardData.bloodGroup || 'Not specified'}</strong>
              </div>
              <div>
                <span>Emergency Contact</span>
                <strong>
                  {cardData.emergencyContactName ? (
                    <>
                      {cardData.emergencyContactName}
                      {cardData.emergencyContactRelationship && ` (${cardData.emergencyContactRelationship})`}
                    </>
                  ) : (
                    'Not specified'
                  )}
                </strong>
              </div>
              <div>
                <span>Allergies</span>
                <strong style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {cardData.allergies || 'None known / reported'}
                </strong>
              </div>
              <div>
                <span>Contact Phone</span>
                <strong>{cardData.emergencyContactPhone || 'Not specified'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span>Active Conditions</span>
                <strong style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {cardData.medicalConditions || 'None reported'}
                </strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span>Current Medications</span>
                <strong style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {cardData.currentMedications || 'None reported'}
                </strong>
              </div>
            </div>

            {cardData.additionalNotes && (
              <div style={{ background: 'rgba(0,0,0,0.12)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '10px', color: '#b6e9e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Emergency Medical Notes:
                </span>
                <p style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.5 }}>
                  {cardData.additionalNotes}
                </p>
              </div>
            )}

            <footer>
              <Icon name="shield" size={15} /> Private patient-held health passport · Not publicly listed
            </footer>
          </article>

          {/* Privacy & Scope Callout */}
          <div className="card" style={{ padding: '16px 20px', background: '#f8fbfb', fontSize: '13px', color: 'var(--muted)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--ink)', fontWeight: 600, marginBottom: '6px' }}>
              <Icon name="shield" size={18} />
              <span>Strict Data Boundary</span>
            </div>
            This emergency card is private to your authenticated account. It is not publicly exposed on the web and is not automatically shared with family members or consulting clinicians.
          </div>
        </div>

        {/* Right: Form / Edit Section */}
        <aside className="card" style={{ padding: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span className="eyebrow">{isEditing ? 'Update Details' : 'Card Configuration'}</span>
              <h2 style={{ fontSize: '20px' }}>
                {isEditing ? 'Edit Emergency Profile' : 'Emergency Card Details'}
              </h2>
            </div>
            {!isEditing && (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveCard} className="form-stack">
              <div>
                <label htmlFor="bloodGroup">Blood Group</label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={cardData.bloodGroup}
                  onChange={handleInputChange}
                >
                  <option value="">Select Blood Group (or leave blank)</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="allergies">Known Allergies</label>
                <input
                  type="text"
                  id="allergies"
                  name="allergies"
                  value={cardData.allergies}
                  onChange={handleInputChange}
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  maxLength={1000}
                />
              </div>

              <div>
                <label htmlFor="currentMedications">Current Medications</label>
                <input
                  type="text"
                  id="currentMedications"
                  name="currentMedications"
                  value={cardData.currentMedications}
                  onChange={handleInputChange}
                  placeholder="e.g. Lisinopril 10mg, Metformin 500mg"
                  maxLength={1000}
                />
              </div>

              <div>
                <label htmlFor="medicalConditions">Pre-existing Medical Conditions</label>
                <input
                  type="text"
                  id="medicalConditions"
                  name="medicalConditions"
                  value={cardData.medicalConditions}
                  onChange={handleInputChange}
                  placeholder="e.g. Type 2 Diabetes, Asthma, Hypertension"
                  maxLength={1000}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '6px' }}>
                <span className="eyebrow" style={{ marginBottom: '10px', display: 'block' }}>
                  Emergency Contact
                </span>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label htmlFor="emergencyContactName">Contact Full Name</label>
                    <input
                      type="text"
                      id="emergencyContactName"
                      name="emergencyContactName"
                      value={cardData.emergencyContactName}
                      onChange={handleInputChange}
                      placeholder="e.g. Jane Doe"
                      maxLength={100}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="emergencyContactRelationship">Relationship</label>
                      <input
                        type="text"
                        id="emergencyContactRelationship"
                        name="emergencyContactRelationship"
                        value={cardData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        placeholder="e.g. Spouse, Parent"
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <label htmlFor="emergencyContactPhone">Phone Number</label>
                      <input
                        type="text"
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        value={cardData.emergencyContactPhone}
                        onChange={handleInputChange}
                        placeholder="e.g. +1 555-0199"
                        maxLength={40}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="additionalNotes">Additional Notes for First Responders</label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  rows={3}
                  value={cardData.additionalNotes}
                  onChange={handleInputChange}
                  placeholder="e.g. Carries EpiPen in backpack; pacemaker implanted 2024"
                  maxLength={2000}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    border: '1px solid #d5e4e5',
                    borderRadius: '10px',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              <div className="form-actions" style={{ marginTop: '16px' }}>
                {hasAnyData && (
                  <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving Card...' : 'Save Emergency Card'}
                </Button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: '14px', fontSize: '13px' }}>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                Your emergency health card is saved. You can update or clear any fields at any time.
              </p>

              <div style={{ padding: '12px', background: '#f8fbfb', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Blood Group
                </span>
                <strong style={{ display: 'block', marginTop: '2px', color: 'var(--ink)', fontSize: '15px' }}>
                  {cardData.bloodGroup || 'Not specified'}
                </strong>
              </div>

              <div style={{ padding: '12px', background: '#f8fbfb', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Primary Emergency Contact
                </span>
                <div style={{ marginTop: '3px' }}>
                  <strong>{cardData.emergencyContactName || 'None listed'}</strong>
                  {cardData.emergencyContactPhone && (
                    <div style={{ color: 'var(--teal)', fontWeight: 600, marginTop: '2px' }}>
                      {cardData.emergencyContactPhone}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <Button variant="secondary" icon="settings" onClick={() => setIsEditing(true)}>
                  Edit Emergency Card
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
