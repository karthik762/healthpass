import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Icon from '../components/Icon';
import Button from '../components/Button';
import PageIntro from '../components/PageIntro';
import { EmptyState, Notice, LoadingCard } from '../components/StateMessage';

export default function AiSummaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedRecordId = searchParams.get('recordId');

  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(preselectedRecordId ? Number(preselectedRecordId) : null);
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch Ollama connection status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/ai/status');
      if (res.data?.success) {
        setStatus(res.data.data);
      }
    } catch {
      setStatus({
        ollamaAvailable: false,
        configuredModel: 'llama3.2:3b',
        message: 'Could not connect to the backend AI gateway.',
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch patient's medical records
  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await api.get('/records');
      if (res.data?.success) {
        const list = res.data.data || [];
        setRecords(list);
        if (list.length > 0 && !selectedRecordId) {
          const initialId = preselectedRecordId ? Number(preselectedRecordId) : list[0].id;
          setSelectedRecordId(initialId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical records.');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Check if summary already exists for selected record
  const fetchExistingSummary = async (recordId) => {
    if (!recordId) return;
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await api.get(`/ai/records/${recordId}/summary`);
      if (res.data?.success) {
        setSummary(res.data.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to check existing summary.');
      }
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchRecords();
  }, []);

  useEffect(() => {
    if (selectedRecordId) {
      setSearchParams({ recordId: selectedRecordId });
      fetchExistingSummary(selectedRecordId);
    }
  }, [selectedRecordId]);

  const handleGenerate = async (refresh = false) => {
    if (!selectedRecordId) return;
    setGenerating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await api.post(`/ai/records/${selectedRecordId}/summary?refresh=${refresh}`);
      if (res.data?.success) {
        setSummary(res.data.data);
        setActionSuccess(refresh ? 'Summary refreshed successfully with local Ollama.' : 'Summary generated successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate AI summary. Ensure Ollama is running.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  return (
    <>
      <PageIntro
        title="AI Health Summarizer"
        description="Factual, plain-language summaries of your medical records generated using a local Ollama model. All processing stays strictly on your private backend; no third-party cloud APIs receive your records."
      />

      {/* Prominent Clinical Disclaimer */}
      <Notice tone="info">
        <div style={{ marginLeft: '6px' }}>
          <strong>Clinical & AI Disclaimer:</strong> AI summaries are for informational reference only and do not replace professional medical advice, clinical diagnosis, or treatment. AI models may make errors or omit nuances. Always verify all measurements, dosages, and instructions against your original medical record.
        </div>
      </Notice>

      {/* Ollama Service Status Card */}
      <section className="card" style={{ marginTop: '16px' }}>
        <div className="card-heading">
          <div>
            <p className="eyebrow">Local AI Environment</p>
            <h2>Local Ollama Service Status</h2>
            <p>Verification of local Ollama runtime and model availability</p>
          </div>
          <Button variant="secondary" onClick={fetchStatus} disabled={loadingStatus}>
            <Icon name="clock" size={16} /> Check Status
          </Button>
        </div>

        {loadingStatus ? (
          <LoadingCard />
        ) : (
          <div className="stats-row" style={{ marginTop: '14px' }}>
            <div className="stat-card">
              <span className="stat-label">Connection Status</span>
              <strong style={{ display: 'block', marginTop: '6px', color: status?.ollamaAvailable ? 'var(--teal)' : 'var(--danger)' }}>
                {status?.ollamaAvailable ? '● Connected (Online)' : '○ Unreachable (Offline)'}
              </strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Configured Model</span>
              <strong style={{ display: 'block', marginTop: '6px', fontFamily: 'monospace' }}>
                {status?.configuredModel || 'llama3.2:3b'}
              </strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Privacy Boundary</span>
              <strong style={{ display: 'block', marginTop: '6px', color: 'var(--teal)' }}>
                100% On-Premise Local
              </strong>
            </div>
          </div>
        )}

        {!status?.ollamaAvailable && (
          <div style={{ marginTop: '14px' }}>
            <Notice tone="error">
              <div>
                <strong>Ollama is not running locally.</strong>
                <p style={{ marginTop: '4px', fontSize: '13px' }}>
                  To generate summaries on demand, start Ollama on your host machine:
                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', margin: '4px 0' }}>
                    ollama serve
                  </code>
                  <br />
                  And ensure the configured model is installed:
                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', margin: '4px 0' }}>
                    ollama pull {status?.configuredModel || 'llama3.2:3b'}
                  </code>
                </p>
              </div>
            </Notice>
          </div>
        )}
      </section>

      {/* Record Selection & Action Bar */}
      <section className="card" style={{ marginTop: '16px' }}>
        <div className="card-heading">
          <div>
            <p className="eyebrow">Record Selection</p>
            <h2>Select Medical Record to Summarize</h2>
            <p>Choose an authenticated record to inspect or generate an AI breakdown</p>
          </div>
        </div>

        {loadingRecords ? (
          <LoadingCard />
        ) : records.length === 0 ? (
          <EmptyState
            icon="file"
            title="No medical records found"
            action={
              <Link to="/records" className="button button-primary">
                Add Medical Record
              </Link>
            }
          >
            You need to record at least one medical report with clinical notes before generating an AI summary.
          </EmptyState>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
              <select
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d5e4e5',
                  font: 'inherit',
                  outline: 'none',
                }}
                value={selectedRecordId || ''}
                onChange={(e) => setSelectedRecordId(Number(e.target.value))}
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.recordType}) — {r.recordDate} {r.providerName ? `• ${r.providerName}` : ''}
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                onClick={() => handleGenerate(false)}
                disabled={generating || !selectedRecordId}
              >
                <Icon name="spark" size={16} />
                <span>{generating ? 'Summarizing with Ollama…' : summary ? 'Regenerate Summary' : 'Generate AI Summary'}</span>
              </Button>

              {summary && (
                <Button
                  variant="secondary"
                  onClick={() => handleGenerate(true)}
                  disabled={generating}
                  title="Force re-generation with local Ollama"
                >
                  <Icon name="clock" size={16} />
                  <span>Force Refresh</span>
                </Button>
              )}

              <Link to="/records" className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="file" size={16} />
                <span>View in Records</span>
              </Link>
            </div>

            {/* Selected record details preview */}
            {selectedRecord && (
              <div style={{ background: 'var(--soft)', padding: '14px', borderRadius: '8px', border: '1px solid #d5e4e5', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{selectedRecord.title}</strong>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      Category: <strong>{selectedRecord.recordType}</strong> &bull; Date: {selectedRecord.recordDate}
                      {selectedRecord.providerName && ` • Provider: ${selectedRecord.providerName}`}
                    </div>
                  </div>
                  <Link to="/records" style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 600 }}>
                    Edit Record &rarr;
                  </Link>
                </div>
                {selectedRecord.notes ? (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#334155', maxHeight: '110px', overflowY: 'auto', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <strong>Original Clinical Notes: </strong> {selectedRecord.notes}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--danger)' }}>
                    Notice: This record does not have clinical notes. Summaries require text to extract factual information.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {actionSuccess && (
          <div style={{ marginTop: '12px' }}>
            <Notice tone="success">{actionSuccess}</Notice>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px' }}>
            <Notice tone="error">
              <div>
                <strong>Error: </strong>{error}
                <div style={{ marginTop: '6px' }}>
                  <Button variant="secondary" onClick={() => handleGenerate(false)}>
                    Retry Summary
                  </Button>
                </div>
              </div>
            </Notice>
          </div>
        )}
      </section>

      {/* Summary Content Display */}
      {loadingSummary ? (
        <section className="card" style={{ marginTop: '16px' }}>
          <LoadingCard />
        </section>
      ) : summary ? (
        <section className="card" style={{ marginTop: '16px' }}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Local AI Clinical Summary</p>
              <h2>{summary.recordTitle}</h2>
              <p>
                Model: <code>{summary.modelName}</code> &bull; Generated: {new Date(summary.generatedAt).toLocaleString()}
                {summary.cached && ' • (Saved Summary)'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => handleGenerate(true)} disabled={generating}>
              <Icon name="clock" size={16} /> Re-run Ollama
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
            {/* Section 1: Plain Language Overview */}
            <div style={{ borderLeft: '4px solid var(--teal)', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                1. Plain-Language Overview
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.overview}</p>
            </div>

            {/* Section 2: Key Findings */}
            <div style={{ borderLeft: '4px solid #0891b2', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                2. Key Findings Mentioned in Document
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.keyFindings}</p>
            </div>

            {/* Section 3: Measurements and Results */}
            <div style={{ borderLeft: '4px solid #059669', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                3. Measurements, Lab Values & Reference Ranges
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.measurements}</p>
            </div>

            {/* Section 4: Medications */}
            <div style={{ borderLeft: '4px solid #d97706', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                4. Medications
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.medications}</p>
            </div>

            {/* Section 5: Follow-up Instructions */}
            <div style={{ borderLeft: '4px solid #7c3aed', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                5. Follow-up Instructions
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.followUpInstructions}</p>
            </div>

            {/* Section 6: Questions for the Doctor */}
            <div style={{ borderLeft: '4px solid #4f46e5', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                6. Suggested Questions for Your Doctor
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.questionsForDoctor}</p>
            </div>

            {/* Section 7: Missing Information */}
            <div style={{ borderLeft: '4px solid #64748b', paddingLeft: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                7. Missing Information / Not Specified in Document
              </h3>
              <p style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary.missingInformation}</p>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: 'var(--muted)' }}>
            <em>{summary.disclaimer}</em>
          </div>
        </section>
      ) : selectedRecord ? (
        <section className="card" style={{ marginTop: '16px' }}>
          <EmptyState
            icon="spark"
            title="No AI summary generated for this record yet"
          >
            Click the "Generate AI Summary" button above to request a factual, plain-language analysis using your local Ollama instance.
          </EmptyState>
        </section>
      ) : null}
    </>
  );
}
