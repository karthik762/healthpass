import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';
import Button from '../components/Button';
import { Notice } from '../components/StateMessage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState({ loading: false, message: '', error: '' });

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (!agreed) {
      setState({ loading: false, message: '', error: 'Please accept the responsible-use agreement to continue.' });
      return;
    }

    setState({ loading: true, message: '', error: '' });
    try {
      const { data } = await api.post('/users/register', form);
      setState({
        loading: false,
        message: data?.message || 'Account created successfully! You can sign in now.',
        error: '',
      });
    } catch (error) {
      let errorMessage = 'We could not create your account. Please review the details and try again.';
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
        errorMessage = 'Unable to connect to the backend server. Please verify the API service is running on port 8080.';
      }

      setState({
        loading: false,
        message: '',
        error: errorMessage,
      });
    }
  };

  return (
    <div className="auth-form-wrap">
      <p className="eyebrow">Start your passport</p>
      <h2>Create a private health space</h2>
      <p className="auth-copy">
        This creates a foundation account. Keep a unique password and never use it on a shared device.
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
          style={{
            flex: 1,
            padding: '8px',
            border: 0,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--teal)',
            cursor: 'default',
          }}
        >
          Patient Account
        </button>
        <button
          type="button"
          onClick={() => navigate('/register/doctor')}
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
          Doctor / Clinician
        </button>
      </div>
      {state.message && (
        <Notice tone="success">
          {state.message}{' '}
          <button className="inline-link" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </Notice>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form className="form-stack" onSubmit={submit}>
        <label>
          Your full name
          <input
            name="fullName"
            value={form.fullName}
            onChange={update}
            autoComplete="name"
            required
            minLength={2}
            placeholder="Aarav Kumar"
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={update}
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          Create password
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
        <label className="check-label">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />{' '}
          I agree to use this prototype responsibly.
        </label>
        <Button type="submit" className="full-width" icon="arrow" disabled={state.loading}>
          {state.loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
