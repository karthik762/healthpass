import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const demoRecords = [
  { id: 'demo-1', title: 'Blood test results', recordType: 'Lab result', recordDate: '2026-04-18', providerName: 'Demo Laboratory', isDemo: true },
  { id: 'demo-2', title: 'Annual wellness visit', recordType: 'Clinical note', recordDate: '2026-03-30', providerName: 'Demo Primary Care', isDemo: true },
  { id: 'demo-3', title: 'Immunization record', recordType: 'Vaccination', recordDate: '2026-02-11', providerName: 'Demo Community Clinic', isDemo: true },
];

export default function RecordsPage() {
  const { isAuthenticated, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    recordType: '',
    providerName: '',
    recordDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadRecords = async () => {
    if (!isAuthenticated) {
      setRecords(demoRecords);
      return;
    }
    setLoading(true);
    setFetchError('');
    try {
      const { data } = await api.get('/records');
      setRecords(data.data || []);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load your medical records from the server.');
      // Do not silently fallback to demo data on real API failure
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateRecord = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!isAuthenticated) {
      // Local preview mode
      const newDemo = {
        id: `demo-${Date.now()}`,
        ...formData,
        isDemo: true,
      };
      setRecords([newDemo, ...records]);
      setShowForm(false);
      setFeedback('Metadata saved to this screen for this preview session.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        recordType: formData.recordType,
        providerName: formData.providerName.trim() || null,
        recordDate: formData.recordDate,
        notes: formData.notes.trim() || null,
      };
      const { data } = await api.post('/records', payload);
      setRecords([data.data, ...records]);
      setShowForm(false);
      setFormData({
        title: '',
        recordType: '',
        providerName: '',
        recordDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setFeedback('Medical record metadata saved securely to your account.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save record metadata. Please verify fields and date.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record metadata?')) return;
    if (!isAuthenticated) {
      setRecords(records.filter((r) => r.id !== recordId));
      if (selectedRecord?.id === recordId) setSelectedRecord(null);
      return;
    }
    try {
      await api.delete(`/records/${recordId}`);
      setRecords(records.filter((r) => r.id !== recordId));
      if (selectedRecord?.id === recordId) setSelectedRecord(null);
      setFeedback('Medical record removed successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  const visible = records.filter((record) =>
    `${record.title} ${record.recordType} ${record.providerName || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <PageIntro
        title="My health records"
        description="Organize record metadata in one place. Medical documents are intentionally not uploaded in this foundation release."
        actions={
          <Button icon="plus" onClick={() => { setShowForm(!showForm); setFormError(''); }}>
            {showForm ? 'Close form' : 'Add record metadata'}
          </Button>
        }
      />

      {!isAuthenticated ? (
        <Notice>
          Viewing fictional demo data. Sign in to your account to view and persist real patient-owned records.
        </Notice>
      ) : (
        <Notice tone="success">
          Connected as {user?.email}. Medical records below are retrieved securely from your private API account.
        </Notice>
      )}

      {feedback && (
        <Notice tone="success">
          {feedback}{' '}
          <button className="inline-link" onClick={() => setFeedback('')} style={{ marginLeft: '10px' }}>
            Dismiss
          </button>
        </Notice>
      )}

      {fetchError && (
        <Notice tone="error">
          {fetchError}{' '}
          <button className="inline-link" onClick={loadRecords} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </Notice>
      )}

      {showForm && (
        <form className="card record-form" onSubmit={handleCreateRecord}>
          <div className="card-heading">
            <div>
              <h2>Add record metadata</h2>
              <p>Metadata only. No sensitive document file is uploaded or exposed.</p>
            </div>
          </div>

          {formError && <Notice tone="error">{formError}</Notice>}

          <div className="form-grid">
            <label>
              Record title
              <input
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Complete blood count"
              />
            </label>
            <label>
              Record type
              <select
                name="recordType"
                required
                value={formData.recordType}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select a type</option>
                <option value="Lab result">Lab result</option>
                <option value="Clinical note">Clinical note</option>
                <option value="Prescription">Prescription</option>
                <option value="Vaccination">Vaccination</option>
                <option value="Diagnostic imaging">Diagnostic imaging</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Provider or clinic
              <input
                name="providerName"
                value={formData.providerName}
                onChange={handleInputChange}
                placeholder="Care provider name"
              />
            </label>
            <label>
              Record date
              <input
                name="recordDate"
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.recordDate}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label>
              Notes / summary
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Key clinical notes or observations (optional)"
                rows="3"
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  border: '1px solid #d5e4e5',
                  padding: '10px 13px',
                  font: 'inherit',
                  outline: 'none',
                }}
              />
            </label>
          </div>

          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" icon="check" disabled={submitting}>
              {submitting ? 'Saving…' : isAuthenticated ? 'Save record metadata' : 'Save preview'}
            </Button>
          </div>
        </form>
      )}

      {selectedRecord && (
        <div className="card" style={{ margin: '18px 0', borderLeft: '4px solid var(--teal)' }}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">{selectedRecord.recordType}</p>
              <h2>{selectedRecord.title}</h2>
              <p>
                Date: {selectedRecord.recordDate} • Provider: {selectedRecord.providerName || 'Not specified'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                to={`/ai-summary?recordId=${selectedRecord.id}`}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name="spark" size={16} />
                <span>AI Summary</span>
              </Link>
              <Button
                variant="secondary"
                style={{ color: 'var(--danger)', borderColor: '#f2d7db' }}
                onClick={() => handleDelete(selectedRecord.id)}
              >
                Delete record
              </Button>
              <Button variant="secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
          {selectedRecord.notes && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--soft)', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Clinical notes:</strong>
              <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{selectedRecord.notes}</p>
            </div>
          )}
        </div>
      )}

      <section className="records-toolbar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isAuthenticated ? "Search your health records" : "Search demo records"}
          />
        </label>
        <button className="filter-button" onClick={() => setSearch('')}>
          {search ? 'Clear search' : 'All record types'} <Icon name="chevron" size={16} />
        </button>
      </section>

      {loading ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading your medical records securely…
        </div>
      ) : visible.length > 0 ? (
        <section className="record-table card">
          <div className="table-head">
            <span>Record</span>
            <span>Date</span>
            <span>Provider</span>
            <span>Actions</span>
          </div>
          {visible.map((record) => (
            <div className="table-row" key={record.id || record.title}>
              <div className="record-title">
                <span className="record-icon">
                  <Icon name="file" size={18} />
                </span>
                <div>
                  <strong>{record.title}</strong>
                  <small>{record.recordType}</small>
                </div>
              </div>
              <span>{record.recordDate}</span>
              <span>{record.providerName || '—'}</span>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  className="row-button"
                  aria-label={`View ${record.title}`}
                  onClick={() => setSelectedRecord(record)}
                  title="View details"
                >
                  <Icon name="chevron" size={18} />
                </button>
                {isAuthenticated && (
                  <button
                    className="row-button"
                    style={{ color: 'var(--danger)' }}
                    aria-label={`Delete ${record.title}`}
                    onClick={() => handleDelete(record.id)}
                    title="Delete record"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <EmptyState
          icon="search"
          title={search ? 'No matching records' : 'No medical records yet'}
          action={
            <Button icon="plus" onClick={() => setShowForm(true)}>
              Add your first record
            </Button>
          }
        >
          {search
            ? 'Try another search term or clear the filter.'
            : 'Add your first record metadata above to begin tracking your health history.'}
        </EmptyState>
      )}
    </>
  );
}

