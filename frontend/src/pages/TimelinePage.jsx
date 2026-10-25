import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice } from '../components/StateMessage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function TimelinePage() {
  const { isAuthenticated, user } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [selectedType, setSelectedType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected record detail modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadRecords = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/records');
      setRecords(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your medical timeline records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [isAuthenticated]);

  // Derived available categories from patient's records
  const availableTypes = useMemo(() => {
    const types = new Set(records.map((r) => r.recordType).filter(Boolean));
    return Array.from(types).sort();
  }, [records]);

  // Filter and sort records chronologically (newest first)
  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        if (selectedType !== 'ALL' && record.recordType !== selectedType) {
          return false;
        }
        if (startDate && record.recordDate < startDate) {
          return false;
        }
        if (endDate && record.recordDate > endDate) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
  }, [records, selectedType, startDate, endDate]);

  const clearFilters = () => {
    setSelectedType('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedType !== 'ALL' || startDate !== '' || endDate !== '';

  const getRecordIcon = (type) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('lab') || lower.includes('blood') || lower.includes('test')) return 'file';
    if (lower.includes('vaccin') || lower.includes('immun')) return 'shield';
    if (lower.includes('prescript') || lower.includes('medic')) return 'heart';
    if (lower.includes('clinic') || lower.includes('visit') || lower.includes('doctor')) return 'users';
    return 'pulse';
  };

  const formatDateDisplay = (dateString) => {
    try {
      const d = new Date(dateString + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Phase 4: Health Timeline"
        title="Chronological Health Timeline"
        description="A longitudinal care milestone timeline powered directly by your authenticated medical records. Filter by category and date range to track your medical journey."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/records">
              <Button variant="secondary" icon="plus">
                Add Record
              </Button>
            </Link>
            <Button variant="secondary" icon="pulse" onClick={loadRecords} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {error && (
        <Notice variant="error" onDismiss={() => setError('')}>
          {error}
        </Notice>
      )}

      {/* Filter and Control Bar */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end', flex: 1 }}>
          <div style={{ minWidth: '180px' }}>
            <label htmlFor="categoryFilter" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Category
            </label>
            <select
              id="categoryFilter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ minHeight: '40px', fontSize: '13px' }}
            >
              <option value="ALL">All Categories ({records.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <label htmlFor="startDate" style={{ fontSize: '12px', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ minHeight: '40px', fontSize: '13px' }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <label htmlFor="endDate" style={{ fontSize: '12px', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ minHeight: '40px', fontSize: '13px' }}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              onClick={clearFilters}
              style={{ minHeight: '40px', fontSize: '12px', padding: '0 12px' }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div style={{ fontSize: '13px', color: 'var(--muted)', alignSelf: 'center' }}>
          Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
        </div>
      </div>

      {/* Main Content States */}
      {loading && records.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--line)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px' }}>Loading health timeline records...</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No timeline events recorded yet"
          message="Your timeline reflects real medical records added to your health passport. Add your first clinical note, lab report, or immunization to begin your timeline."
          action={
            <Link to="/records">
              <Button icon="plus">Add Your First Record</Button>
            </Link>
          }
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon="search"
          title="No records match your filters"
          message="Try adjusting or clearing your category selection or date range."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <section className="timeline card" style={{ padding: '28px clamp(16px, 3vw, 36px)', maxWidth: '900px' }}>
          {filteredRecords.map((record, index) => {
            const iconName = getRecordIcon(record.recordType);
            const isLast = index === filteredRecords.length - 1;

            return (
              <div
                key={record.id}
                className="timeline-item"
                onClick={() => setSelectedRecord(record)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  margin: '-4px -12px 6px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f4fbfb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div className="timeline-marker">
                  <span style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}>
                    <Icon name={iconName} size={16} />
                  </span>
                  {!isLast && <i />}
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? '6px' : '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p className="timeline-date">{formatDateDisplay(record.recordDate)}</p>
                    <span className="tag" style={{ background: '#eaf2fe', color: 'var(--blue)' }}>
                      {record.recordType}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', color: 'var(--ink)', margin: '4px 0 2px' }}>
                    {record.title}
                  </h3>

                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    {record.providerName ? `Provider: ${record.providerName}` : 'Self-reported record'}
                  </p>

                  {record.notes && (
                    <p
                      style={{
                        marginTop: '8px',
                        color: '#476267',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        background: '#f8fbfb',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #edf2f2',
                        maxWidth: '680px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {record.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* MODAL: Record Details */}
      {selectedRecord && (
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
              maxWidth: '560px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Medical Record Detail</span>
                <h2 style={{ fontSize: '20px' }}>{selectedRecord.title}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px', margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fbfb', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Category</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedRecord.recordType}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fbfb', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Record Date</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedRecord.recordDate}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fbfb', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Healthcare Provider</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedRecord.providerName || 'Not specified'}</strong>
              </div>

              {selectedRecord.notes && (
                <div style={{ padding: '12px 14px', background: '#f8fbfb', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4b6f75', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Notes & Clinical Findings
                  </span>
                  <p style={{ marginTop: '6px', color: 'var(--ink)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Button variant="secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
