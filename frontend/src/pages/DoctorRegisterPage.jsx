import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Notice } from '../components/StateMessage';

export default function DoctorRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    medicalRegistrationNumber: '',
    licensingAuthority: '',
    professionalQualification: '',
    specialization: '',
    clinicOrHospitalName: '',
    contactNumber: '',
  });

  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState({ loading: false, message: '', error: '' });

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setState({ loading: false, message: '', error: 'Passwords do not match.' });
      return;
    }

    if (!agreed) {
      setState({ loading: false, message: '', error: 'Please accept the terms and privacy policy to submit your registration.' });
      return;
    }

    setState({ loading: true, message: '', error: '' });

    try {
      const payload = {
        ...form,
        termsAccepted: agreed,
      };
      const { data } = await api.post('/doctor/register', payload);
      setState({
        loading: false,
        message: data?.message || 'Doctor application submitted successfully! Your account is pending verification.',
        error: '',
      });
    } catch (error) {
      let errorMessage = 'We could not submit your doctor registration. Please check the details and try again.';
      if (error.response?.data) {
        const responseData = error.response.data;
        if (responseData.data?.fields) {
          const fieldErrors = Object.values(responseData.data.fields).filter(Boolean);
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('. ');
          }
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Unable to connect to the backend server. Please verify the API is running on port 8080.';
      }

      setState({
        loading: false,
        message: '',
        error: errorMessage,
      });
    }
  };

  return (
    <div className="auth-form-wrap" style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#087f8c',
            background: '#e0f2f1',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          Clinician Registration
        </span>
      </div>

      <h2>Apply for Clinician Portal Access</h2>
      <p className="auth-copy">
        Register your licensed medical credentials. All accounts undergo administrative review and licensing verification before access to patient clinical summaries is granted.
      </p>

      {/* Switch between Patient and Doctor registration */}
      <div
        style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            flex: 1,
            padding: '8px',
            border: 0,
            background: 'transparent',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          Patient Account
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            padding: '8px',
            border: 0,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#087f8c',
            cursor: 'default',
          }}
        >
          Doctor / Clinician
        </button>
      </div>

      {state.message && (
        <Notice tone="success">
          {state.message}{' '}
          <button className="inline-link" onClick={() => navigate('/login')}>
            Sign in to check verification status
          </button>
        </Notice>
      )}

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <form className="form-stack" onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <label style={{ gridColumn: '1 / -1' }}>
            Full practitioner name (with title)
            <input
              name="fullName"
              value={form.fullName}
              onChange={update}
              autoComplete="name"
              required
              minLength={2}
              placeholder="Dr. Priya Sharma, MD"
            />
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Professional email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              autoComplete="email"
              required
              placeholder="dr.sharma@hospital.org"
            />
          </label>

          <label>
            Password (min 8 characters)
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={update}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={update}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Re-enter password"
            />
          </label>

          <label>
            Medical registration number
            <input
              name="medicalRegistrationNumber"
              value={form.medicalRegistrationNumber}
              onChange={update}
              required
              placeholder="e.g. MCI-2018-84729"
            />
          </label>

          <label>
            State Medical Council / Licensing Board
            <input
              name="licensingAuthority"
              value={form.licensingAuthority}
              onChange={update}
              required
              placeholder="e.g. Karnataka Medical Council"
            />
          </label>

          <label>
            Professional qualification
            <input
              name="professionalQualification"
              value={form.professionalQualification}
              onChange={update}
              required
              placeholder="e.g. MBBS, MD (Internal Medicine)"
            />
          </label>

          <label>
            Primary Specialization
            <input
              name="specialization"
              value={form.specialization}
              onChange={update}
              required
              placeholder="e.g. Cardiology, Endocrinology"
            />
          </label>

          <label>
            Hospital / Clinic affiliation (optional)
            <input
              name="clinicOrHospitalName"
              value={form.clinicOrHospitalName}
              onChange={update}
              placeholder="e.g. Apollo Multi-Speciality Hospital"
            />
          </label>

          <label>
            Contact phone (optional)
            <input
              name="contactNumber"
              value={form.contactNumber}
              onChange={update}
              placeholder="+91 98765 43210"
            />
          </label>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#475569',
            lineHeight: 1.5,
            marginTop: '8px',
          }}
        >
          <strong>Account Verification Notice:</strong> Upon registration, doctor accounts are assigned <code>PENDING_VERIFICATION</code> status. Protected clinical patient records cannot be viewed until the state medical licensing credentials are confirmed by an administrator.
        </div>

        <label className="check-label">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />{' '}
          I certify that all medical license details provided are accurate and consent to verification against state medical registers.
        </label>

        <Button type="submit" className="full-width" icon="arrow" disabled={state.loading}>
          {state.loading ? 'Submitting Application…' : 'Submit Doctor Registration'}
        </Button>
      </form>

      <p className="auth-footer">
        Already registered? <Link to="/login">Sign in here</Link>
      </p>
    </div>
  );
}
