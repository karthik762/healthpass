import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FamilyPage() {
  const { isAuthenticated, user } = useAuth();

  const [familyGroups, setFamilyGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modals & subforms
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Processing state
  const [processing, setProcessing] = useState(false);

  // Consented member records modal
  const [viewingMember, setViewingMember] = useState(null);
  const [memberRecords, setMemberRecords] = useState([]);
  const [loadingMemberRecords, setLoadingMemberRecords] = useState(false);
  const [memberRecordsError, setMemberRecordsError] = useState('');

  const loadFamilyData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/family');
      const groups = data.data || [];
      setFamilyGroups(groups);
      if (groups.length > 0) {
        // Retain or select active group
        setActiveGroup((prev) => {
          if (!prev) return groups[0];
          const found = groups.find((g) => g.id === prev.id);
          return found || groups[0];
        });
      } else {
        setActiveGroup(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your family network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, [isAuthenticated]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/family', { name: groupNameInput.trim() });
      setFeedback(`Family group "${data.data.name}" created! Your invitation code is ready.`);
      setShowCreateGroup(false);
      setGroupNameInput('');
      await loadFamilyData();
      setActiveGroup(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create family group.');
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setProcessing(true);
    setError('');
    try {
      await api.post('/family/join', { invitationCode: joinCodeInput.trim() });
      setFeedback('Your membership request has been submitted to the family group organizer.');
      setShowJoinModal(false);
      setJoinCodeInput('');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join with that invitation code.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!activeGroup) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/family/${activeGroup.id}/invitations/regenerate`);
      setFeedback(`New invitation code generated: ${data.data.invitationCode}`);
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not regenerate invitation code.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeCode = async () => {
    if (!activeGroup) return;
    if (!window.confirm('Revoke this invitation code? Nobody else will be able to join with it.')) return;
    setProcessing(true);
    try {
      await api.post(`/family/${activeGroup.id}/invitations/revoke`);
      setFeedback('Active invitation code has been revoked.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke invitation code.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptMember = async (membershipId) => {
    if (!activeGroup) return;
    setProcessing(true);
    try {
      await api.post(`/family/${activeGroup.id}/members/${membershipId}/accept`);
      setFeedback('Family membership request approved.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectMember = async (membershipId) => {
    if (!activeGroup) return;
    setProcessing(true);
    try {
      await api.post(`/family/${activeGroup.id}/members/${membershipId}/reject`);
      setFeedback('Membership request rejected.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMemberOrLeave = async (membershipId, isSelf) => {
    if (!activeGroup) return;
    const msg = isSelf
      ? 'Are you sure you want to leave this family group?'
      : 'Are you sure you want to remove this member from the family group?';
    if (!window.confirm(msg)) return;

    setProcessing(true);
    try {
      await api.delete(`/family/${activeGroup.id}/members/${membershipId}`);
      setFeedback(isSelf ? 'You have left the family group.' : 'Member removed.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not perform operation.');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleMyConsent = async (currentStatus) => {
    if (!activeGroup) return;
    setProcessing(true);
    try {
      await api.put(`/family/${activeGroup.id}/consent`, { grantRecordAccess: !currentStatus });
      setFeedback(!currentStatus ? 'Record consent granted to this family group.' : 'Record consent revoked.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update consent.');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleRequestAccess = async (currentStatus) => {
    if (!activeGroup) return;
    setProcessing(true);
    try {
      await api.put(`/family/${activeGroup.id}/request-access`, { requestAccess: !currentStatus });
      setFeedback(!currentStatus ? 'Requested record access.' : 'Access request cancelled.');
      await loadFamilyData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewMemberRecords = async (member) => {
    if (!activeGroup) return;
    setViewingMember(member);
    setLoadingMemberRecords(true);
    setMemberRecordsError('');
    try {
      const { data } = await api.get(`/family/${activeGroup.id}/members/${member.userId}/records`);
      setMemberRecords(data.data || []);
    } catch (err) {
      setMemberRecordsError(err.response?.data?.message || 'Cannot view records for this member.');
      setMemberRecords([]);
    } finally {
      setLoadingMemberRecords(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <PageIntro
          title="Family Health Network"
          description="Build a trusted care circle with clear, individual consent for every relationship."
        />
        <Notice>
          Sign in to your account to create a private family circle, generate secure invitation codes, and manage mutual health record consent.
        </Notice>
        <div className="card" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center', padding: '36px' }}>
          <div className="empty-icon" style={{ margin: '0 auto 16px' }}><Icon name="users" size={28} /></div>
          <h3>Private care circle</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '10px 0 24px' }}>
            Family membership never grants automatic record access. Every relationship requires explicit, revokable consent.
          </p>
          <Link to="/login" className="button button-primary" style={{ display: 'inline-flex' }}>
            Sign in to start
          </Link>
        </div>
      </>
    );
  }

  const isOwner = activeGroup && activeGroup.createdByUserId === user?.id;
  const myMembership = activeGroup?.members?.find((m) => m.userId === user?.id);

  return (
    <>
      <PageIntro
        title="Family Health Network"
        description="Build a trusted care circle with individual consent. Membership never automatically exposes health records."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" icon="arrow" onClick={() => { setShowJoinModal(true); setError(''); }}>
              Join with code
            </Button>
            <Button icon="plus" onClick={() => { setShowCreateGroup(true); setError(''); }}>
              Create family group
            </Button>
          </div>
        }
      />

      {feedback && (
        <Notice tone="success">
          {feedback}
          <button className="inline-link" style={{ marginLeft: '12px' }} onClick={() => setFeedback('')}>
            Dismiss
          </button>
        </Notice>
      )}

      {error && (
        <Notice tone="error">
          {error}
          <button className="inline-link" style={{ marginLeft: '12px' }} onClick={() => setError('')}>
            Dismiss
          </button>
        </Notice>
      )}

      {/* Group selector tabs if user belongs to multiple groups */}
      {familyGroups.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {familyGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g)}
              className="button"
              style={{
                background: activeGroup?.id === g.id ? 'var(--teal)' : '#fff',
                color: activeGroup?.id === g.id ? '#fff' : 'var(--ink)',
                border: '1px solid #d5e4e5',
                fontSize: '12px',
                padding: '6px 14px',
                minHeight: '36px',
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Create family group form modal / card */}
      {showCreateGroup && (
        <form className="card record-form" onSubmit={handleCreateGroup}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Start a care circle</p>
              <h2>Create a family group</h2>
              <p>You will be the group owner and can invite trusted family members with a single-use code.</p>
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              Family group name
              <input
                required
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="e.g. Kumar Family Circle"
              />
            </label>
          </div>
          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button type="submit" icon="check" disabled={processing}>
              {processing ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      )}

      {/* Join family with code modal / card */}
      {showJoinModal && (
        <form className="card record-form" onSubmit={handleJoinGroup}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Connect with loved ones</p>
              <h2>Join an existing family group</h2>
              <p>Enter the 10-character invitation code provided by the family group owner.</p>
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              Invitation code
              <input
                required
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. A9B2K7M4X1"
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}
              />
            </label>
          </div>
          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button type="submit" icon="arrow" disabled={processing}>
              {processing ? 'Submitting…' : 'Submit join request'}
            </Button>
          </div>
        </form>
      )}

      {/* Main family circle layout */}
      {loading ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading your family circle…
        </div>
      ) : activeGroup ? (
        <>
          <div className="family-hero card">
            <div>
              <p className="eyebrow">Active circle: {activeGroup.name}</p>
              <h2>Connected with care, never by default.</h2>
              <p>
                Created by {activeGroup.createdByFullName}. Every member controls their own medical records and can grant or revoke consent anytime.
              </p>
            </div>
            {isOwner && (
              <div style={{ textAlign: 'right' }}>
                <Button
                  icon="plus"
                  onClick={handleRegenerateCode}
                  disabled={processing}
                  title="Generate a new active invitation code"
                >
                  Regenerate code
                </Button>
              </div>
            )}
          </div>

          {/* Invitation code banner for owner */}
          {isOwner && (
            <div className="card" style={{ margin: '18px 0', background: 'linear-gradient(110deg,#ecfaf9,#f5fbfb)', border: '1px solid #cce8e8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <p className="eyebrow">Family invitation code</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '0.12em', color: 'var(--teal)' }}>
                      {activeGroup.activeInvitationCode || 'ACTIVE (PROTECTED HASH)'}
                    </span>
                    {activeGroup.activeInvitationExpiresAt && (
                      <small style={{ color: 'var(--muted)' }}>
                        Expires: {new Date(activeGroup.activeInvitationExpiresAt).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  <small style={{ color: '#54767c', display: 'block', marginTop: '4px' }}>
                    Share this code with trusted family members. It permits membership requests only and never grants record access directly.
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" onClick={handleRevokeCode} disabled={processing} style={{ color: 'var(--danger)', borderColor: '#f2d7db' }}>
                    Revoke code
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* My Consent Control Card */}
          {myMembership && (
            <div className="card" style={{ margin: '18px 0', borderLeft: '4px solid var(--teal)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p className="eyebrow">Your Record Consent in "{activeGroup.name}"</p>
                  <h3 style={{ fontSize: '16px' }}>
                    {myMembership.recordAccessGranted ? 'Sharing Consent is ACTIVE' : 'Records are PRIVATE to you'}
                  </h3>
                  <small style={{ color: 'var(--muted)' }}>
                    {myMembership.recordAccessGranted
                      ? 'Other members in this group can view your medical records while consent is active.'
                      : 'No one in this family group can view your medical records until you explicitly turn this on.'}
                  </small>
                </div>
                <Button
                  variant={myMembership.recordAccessGranted ? 'secondary' : 'primary'}
                  onClick={() => handleToggleMyConsent(myMembership.recordAccessGranted)}
                  disabled={processing}
                >
                  {myMembership.recordAccessGranted ? 'Revoke my record consent' : 'Grant record consent'}
                </Button>
              </div>
            </div>
          )}

          {/* Pending membership requests (for owner) */}
          {isOwner && activeGroup.pendingRequests && activeGroup.pendingRequests.length > 0 && (
            <div className="card" style={{ margin: '18px 0', border: '1px solid #fed7aa', background: '#fffbeb' }}>
              <p className="eyebrow" style={{ color: 'var(--orange)' }}>Pending approval</p>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Membership requests awaiting your review</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {activeGroup.pendingRequests.map((req) => (
                  <div key={req.membershipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    <div>
                      <strong>{req.fullName}</strong>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>{req.email}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button onClick={() => handleAcceptMember(req.membershipId)} disabled={processing}>
                        Accept
                      </Button>
                      <Button variant="secondary" onClick={() => handleRejectMember(req.membershipId)} disabled={processing} style={{ color: 'var(--danger)' }}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Members Grid */}
          <section className="member-grid">
            {activeGroup.members?.map((member) => {
              const isSelf = member.userId === user?.id;
              const initials = member.fullName
                ? member.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                : 'FM';
              const tone = member.role === 'OWNER' ? 'purple' : 'teal';

              return (
                <article className="member-card card" key={member.membershipId}>
                  <div className={`member-avatar ${tone}`}>{initials}</div>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <h3 style={{ fontSize: '15px' }}>
                      {member.fullName} {isSelf && <span style={{ fontSize: '11px', color: 'var(--teal)' }}>(You)</span>}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {member.role === 'OWNER' ? 'Group Organizer' : 'Family Member'}
                    </p>
                  </div>

                  <div style={{ width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #edf2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="consent-pill" style={{ margin: '0' }}>
                        <Icon name="shield" size={13} />
                        {member.recordAccessGranted ? (
                          <span style={{ color: 'var(--teal)', fontWeight: '700' }}>Records shared</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Records private</span>
                        )}
                      </span>

                      {!isSelf && member.recordAccessGranted && (
                        <button
                          className="inline-link"
                          onClick={() => handleViewMemberRecords(member)}
                          style={{ fontSize: '11px' }}
                        >
                          View records
                        </button>
                      )}
                    </div>

                    {(isOwner || isSelf) && (
                      <div style={{ marginTop: '10px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemoveMemberOrLeave(member.membershipId, isSelf)}
                          className="inline-link"
                          style={{ color: 'var(--danger)', fontSize: '11px' }}
                          disabled={processing}
                        >
                          {isSelf ? 'Leave group' : 'Remove member'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Modal / Card for viewing consented member records */}
          {viewingMember && (
            <div className="card" style={{ marginTop: '24px', border: '1px solid var(--line)' }}>
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Consented Records</p>
                  <h2>{viewingMember.fullName}'s Shared Health Records</h2>
                  <p>Shared with family circle consent. Only metadata consented to by this member is shown.</p>
                </div>
                <Button variant="secondary" onClick={() => setViewingMember(null)}>
                  Close
                </Button>
              </div>

              {loadingMemberRecords ? (
                <p style={{ padding: '20px 0', color: 'var(--muted)' }}>Retrieving consented records…</p>
              ) : memberRecordsError ? (
                <Notice tone="error">{memberRecordsError}</Notice>
              ) : memberRecords.length > 0 ? (
                <div className="record-list" style={{ marginTop: '14px' }}>
                  {memberRecords.map((r) => (
                    <div className="record-item" key={r.id}>
                      <span className="record-icon"><Icon name="file" size={18} /></span>
                      <div>
                        <strong>{r.title}</strong>
                        <small>{r.recordType} • {r.recordDate} • {r.providerName || 'Care provider'}</small>
                        {r.notes && <p style={{ fontSize: '12px', marginTop: '4px', color: '#55737a' }}>{r.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ padding: '20px 0', color: 'var(--muted)', fontSize: '13px' }}>
                  This family member has granted consent, but has not logged any medical records yet.
                </p>
              )}
            </div>
          )}

          <section className="consent-explainer">
            <div className="explainer-number">1</div>
            <div>
              <h3>Invite with code</h3>
              <p>Send an expiring invitation code to family.</p>
            </div>
            <Icon name="arrow" size={18} />
            <div className="explainer-number">2</div>
            <div>
              <h3>Owner approves</h3>
              <p>Organizer approves each membership request.</p>
            </div>
            <Icon name="arrow" size={18} />
            <div className="explainer-number">3</div>
            <div>
              <h3>Consent anytime</h3>
              <p>Members explicitly choose if records are visible.</p>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon="users"
          title="No family circle yet"
          action={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setShowCreateGroup(true)}>Create a family group</Button>
              <Button variant="secondary" onClick={() => setShowJoinModal(true)}>Join with invitation code</Button>
            </div>
          }
        >
          Create a private family network for your loved ones, or join one using an invitation code shared by family.
        </EmptyState>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link className="text-link" to="/insights">
          See how consent supports family insights <Icon name="arrow" size={16} />
        </Link>
      </div>
    </>
  );
}
