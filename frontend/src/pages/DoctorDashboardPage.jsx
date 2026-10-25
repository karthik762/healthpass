import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { Notice } from '../components/StateMessage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Clean public axios instance with NO patient authorization header
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Doctor account profile state if logged in as a registered doctor
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Sharing session state
  const [code, setCode] = useState(() => sessionStorage.getItem('doctor_validated_code') || '');
  const [inputCode, setInputCode] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [sessionData, setSessionData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('doctor_shared_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'summaries'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [aiSummaries, setAiSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [summaryErrors, setSummaryErrors] = useState({});
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState('');

  // Fetch doctor profile if logged in as a doctor
  useEffect(() => {
    if (user?.role === 'ROLE_DOCTOR') {
      setLoadingProfile(true);
      api.get('/doctor/profile')
        .then(({ data }) => {
          if (data?.data) {
            setDoctorProfile(data.data);
          }
        })
        .catch(() => {
          // Profile not loaded or user not doctor
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [user]);

  // Re-verify sharing session validity if a code exists
  useEffect(() => {
    if (!code) return;

    let active = true;
    setRevalidating(true);
    publicApi.post('/share/doctor/access/validate', { code })
      .then(({ data }) => {
        if (active && data.data) {
          setSessionData(data.data);
          sessionStorage.setItem('doctor_shared_data', JSON.stringify(data.data));
          if (data.data.records?.length > 0 && !selectedRecord) {
            setSelectedRecord(data.data.records[0]);
          }
        }
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem('doctor_validated_code');
          sessionStorage.removeItem('doctor_shared_data');
          setSessionData(null);
          setCode('');
        }
      })
      .finally(() => {
        if (active) setRevalidating(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  // Handle entering a sharing code from within the doctor dashboard
  const handleValidateNewCode = async (e) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;

    setCodeValidating(true);
    setCodeError('');
    try {
      const { data } = await publicApi.post('/share/doctor/access/validate', { code: clean });
      if (data?.data) {
        setCode(clean);
        setSessionData(data.data);
        sessionStorage.setItem('doctor_validated_code', clean);
        sessionStorage.setItem('doctor_shared_data', JSON.stringify(data.data));
        setInputCode('');
        if (data.data.records?.length > 0) {
          setSelectedRecord(data.data.records[0]);
        }
      }
    } catch (err) {
      setCodeError(
        err.response?.data?.message || 'Invalid, expired, or revoked patient sharing code.'
      );
    } finally {
      setCodeValidating(false);
    }
  };

  // Lazy-load AI summary for a selected authorized record
  const loadSummaryForRecord = async (recordId) => {
    if (aiSummaries[recordId] || loadingSummaries[recordId]) return;

    setLoadingSummaries((prev) => ({ ...prev, [recordId]: true }));
    setSummaryErrors((prev) => ({ ...prev, [recordId]: null }));

    try {
      const res = await publicApi.get(`/share/doctor/access/records/${recordId}/summary`, {
        params: { code },
      });
      if (res.data?.success) {
        setAiSummaries((prev) => ({ ...prev, [recordId]: res.data.data }));
      }
    } catch (err) {
      setSummaryErrors((prev) => ({
        ...prev,
        [recordId]: err.response?.data?.message || 'No AI clinical summary generated for this record.',
      }));
    } finally {
      setLoadingSummaries((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const handleDownloadRecord = (record) => {
    const reportText = `=========================================
HEALTHPASS CLINICIAN PORTAL - AUTHORIZED REPORT
=========================================
Patient Name       : ${sessionData?.patientName || 'Authorized Patient'}
Access Clearance   : Read-Only (Doctor Sharing)
Report Title       : ${record.title}
Report Category    : ${record.recordType}
Service Date       : ${record.recordDate}
Healthcare Provider: ${record.providerName || 'N/A'}
Authorized Expiry  : ${new Date(sessionData?.expiresAt).toLocaleString()}

CLINICAL NOTES / FINDINGS:
${record.notes || 'No notes provided in source record.'}

-----------------------------------------
NOTICE: This information is confidential and authorized solely for clinical review.
Generated by Centralized Health Passport Clinician Portal.
=========================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical_record_${record.id}_${record.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const records = sessionData?.records || [];
  const expiresAt = sessionData?.expiresAt ? new Date(sessionData.expiresAt) : null;
  const isExpiringSoon = expiresAt ? (expiresAt - new Date()) < 15 * 60 * 1000 : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Clinician Account Profile & Verification Status (if signed in) */}
      {user?.role === 'ROLE_DOCTOR' && doctorProfile && (
        <div
          className="card"
          style={{
            background: '#ffffff',
            border: '1px solid #dbe6e8',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="eyebrow" style={{ color: '#087f8c', margin: 0 }}>
                Clinician Credentials
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    doctorProfile.verificationStatus === 'APPROVED'
                      ? '#d1fae5'
                      : doctorProfile.verificationStatus === 'REJECTED'
                      ? '#fee2e2'
                      : '#fef3c7',
                  color:
                    doctorProfile.verificationStatus === 'APPROVED'
                      ? '#065f46'
                      : doctorProfile.verificationStatus === 'REJECTED'
                      ? '#991b1b'
                      : '#92400e',
                }}
              >
                {doctorProfile.verificationStatus === 'APPROVED'
                  ? '● Medical Council Approved'
                  : doctorProfile.verificationStatus === 'REJECTED'
                  ? '● Registration Rejected'
                  : '● Pending Licensing Verification'}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', margin: '6px 0 2px', color: '#0d2d33' }}>
              {doctorProfile.fullName}
            </h2>
            <p style={{ color: '#62858a', fontSize: '13px', margin: 0 }}>
              Reg: <strong>{doctorProfile.medicalRegistrationNumber}</strong> ({doctorProfile.licensingAuthority}) · {doctorProfile.professionalQualification} — {doctorProfile.specialization}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#62858a', textTransform: 'uppercase', fontWeight: 700 }}>
              Hospital Affiliation
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d2d33', marginTop: '2px' }}>
              {doctorProfile.clinicOrHospitalName || 'Independent Practitioner'}
            </div>
          </div>
        </div>
      )}

      {/* Verification Status Warning for Pending or Rejected Doctors */}
      {user?.role === 'ROLE_DOCTOR' && doctorProfile?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '16px 20px',
            color: '#92400e',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
            <Icon name="clock" size={18} />
            Medical Council Credential Review In Progress
          </div>
          Your registration with {doctorProfile.licensingAuthority} (Reg #{doctorProfile.medicalRegistrationNumber}) is undergoing manual administrative review. Protected clinical database searches remain locked until approved.
        </div>
      )}

      {/* Patient Code Entry Bar if no session loaded */}
      {!sessionData ? (
        <div
          className="card"
          style={{
            background: '#ffffff',
            border: '1px solid #dbe6e8',
            borderRadius: '12px',
            padding: '32px clamp(20px, 4vw, 36px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon name="shield" size={24} />
          </div>
          <h2 style={{ fontSize: '22px', margin: '0 0 8px' }}>Open Patient Shared Records</h2>
          <p style={{ color: '#62858a', fontSize: '14px', maxWidth: '540px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            To inspect a patient's medical records or clinical AI breakdown, enter the 12-character security code provided by the patient.
          </p>

          {codeError && (
            <div style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
              <Notice tone="error">{codeError}</Notice>
            </div>
          )}

          <form
            onSubmit={handleValidateNewCode}
            style={{ display: 'inline-flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. 6L5C9CL6B8E6"
              maxLength={20}
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                width: '280px',
                textAlign: 'center',
                height: '46px',
              }}
            />
            <Button type="submit" disabled={codeValidating || !inputCode.trim()} style={{ minHeight: '46px' }}>
              {codeValidating ? 'Checking Code…' : 'Access Records'}
            </Button>
          </form>
        </div>
      ) : (
        <>
          {/* Top Session Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f8f8 100%)',
              border: '1px solid #bfe3e6',
              borderRadius: '12px',
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '18px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#087f8c',
                    background: '#e0f2f1',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Patient Passport
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#065f46',
                    background: '#d1fae5',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Verified Sharing Code
                </span>
              </div>

              <h1 style={{ fontSize: '26px', margin: '8px 0 4px', color: '#0d2d33' }}>
                {sessionData.patientName}
              </h1>
              <p style={{ color: '#4b6f75', fontSize: '13px', margin: 0 }}>
                Authorized Medical Records: <strong>{records.length} items</strong> · Code: <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{code}</code>
              </p>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#62858a', letterSpacing: '0.06em' }}>
                Session Clearance Window
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: isExpiringSoon ? '#b91c1c' : '#0d2d33',
                }}
              >
                {expiresAt ? `Expires ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  sessionStorage.removeItem('doctor_validated_code');
                  sessionStorage.removeItem('doctor_shared_data');
                  setSessionData(null);
                  setCode('');
                  setSelectedRecord(null);
                }}
                style={{ fontSize: '11px', minHeight: '30px', padding: '0 10px', marginTop: '4px' }}
              >
                Close Patient Session
              </Button>
            </div>
          </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #dbe6e8', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          style={{
            background: activeTab === 'records' ? '#087f8c' : 'transparent',
            color: activeTab === 'records' ? '#fff' : '#335c63',
            border: 0,
            padding: '8px 18px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Icon name="file" size={16} /> Authorized Records ({records.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('summaries');
            if (records.length > 0) {
              loadSummaryForRecord(records[0].id);
            }
          }}
          style={{
            background: activeTab === 'summaries' ? '#087f8c' : 'transparent',
            color: activeTab === 'summaries' ? '#fff' : '#335c63',
            border: 0,
            padding: '8px 18px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Icon name="spark" size={16} /> Clinical AI Summaries
        </button>
      </div>

      {/* TAB 1: AUTHORIZED RECORDS */}
      {activeTab === 'records' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {records.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <Icon name="file" size={32} />
              <h3 style={{ marginTop: '12px' }}>No records attached</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                The patient authorized a session but did not attach any medical reports.
              </p>
            </div>
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                className="card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #dbe6e8',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {r.recordType}
                    </span>
                    <span style={{ fontSize: '12px', color: '#62858a' }}>
                      {r.recordDate}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', margin: '12px 0 6px', color: '#0d2d33' }}>
                    {r.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#62858a', margin: '0 0 14px' }}>
                    Facility: <strong>{r.providerName || 'Care provider'}</strong>
                  </p>

                  {r.notes && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #edf2f7',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#334155',
                        lineHeight: 1.5,
                        maxHeight: '130px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-line',
                        marginBottom: '16px',
                      }}
                    >
                      {r.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #edf2f7', paddingTop: '14px' }}>
                  <Button
                    variant="secondary"
                    icon="download"
                    onClick={() => handleDownloadRecord(r)}
                    style={{ fontSize: '12px', flex: 1, minHeight: '34px' }}
                  >
                    Export File
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveTab('summaries');
                      setSelectedRecord(r);
                      loadSummaryForRecord(r.id);
                    }}
                    style={{ fontSize: '12px', flex: 1, minHeight: '34px', color: '#087f8c', borderColor: '#b2d5d9' }}
                  >
                    View AI Breakdown
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: CLINICAL AI SUMMARIES */}
      {activeTab === 'summaries' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'flex-start' }}>
          {/* Record Selector Sidebar */}
          <div className="card" style={{ padding: '16px', background: '#fff', borderRadius: '10px', border: '1px solid #dbe6e8' }}>
            <span className="eyebrow" style={{ fontSize: '11px', color: '#62858a' }}>Select Authorized Record</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRecord(r);
                    loadSummaryForRecord(r.id);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedRecord?.id === r.id ? '#087f8c' : '#edf2f4',
                    background: selectedRecord?.id === r.id ? '#ecfdf5' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '13px', color: '#0d2d33' }}>{r.title}</strong>
                  <small style={{ color: '#62858a', fontSize: '11px' }}>{r.recordDate} · {r.recordType}</small>
                </button>
              ))}
            </div>
          </div>

          {/* AI Summary Content Card */}
          <div className="card" style={{ padding: '24px 28px', background: '#fff', borderRadius: '10px', border: '1px solid #dbe6e8' }}>
            {selectedRecord && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '14px', marginBottom: '18px' }}>
                  <div>
                    <span className="eyebrow">Local AI Clinical Breakdown</span>
                    <h2 style={{ fontSize: '20px', margin: '4px 0 0', color: '#0d2d33' }}>
                      {selectedRecord.title}
                    </h2>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0f766e',
                      background: '#ccfbf1',
                      padding: '3px 9px',
                      borderRadius: '99px',
                    }}
                  >
                    On-Premise Llama 3.2
                  </span>
                </div>

                {loadingSummaries[selectedRecord.id] ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#62858a', fontSize: '14px' }}>Loading authorized clinical summary...</p>
                  </div>
                ) : summaryErrors[selectedRecord.id] ? (
                  <Notice tone="info">
                    {summaryErrors[selectedRecord.id]}
                  </Notice>
                ) : aiSummaries[selectedRecord.id] ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #087f8c' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#087f8c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        1. Overview
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6 }}>
                        {aiSummaries[selectedRecord.id].overview}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #0284c7' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        2. Key Findings
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {aiSummaries[selectedRecord.id].keyFindings}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #0d9488' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        3. Measurements & Results
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {aiSummaries[selectedRecord.id].measurements}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        4. Medications
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {aiSummaries[selectedRecord.id].medications}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        5. Follow-up Instructions
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {aiSummaries[selectedRecord.id].followUpInstructions}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ec4899' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        6. Questions for Discussion
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {aiSummaries[selectedRecord.id].questionsForDoctor}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        7. Missing Information
                      </strong>
                      <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.6 }}>
                        {aiSummaries[selectedRecord.id].missingInformation}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
