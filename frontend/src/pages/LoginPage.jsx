import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { Notice } from '../components/StateMessage';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const loggedUser = await login(form.email, form.password);
      if (loggedUser?.role === 'ROLE_DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setState({
        loading: false,
        error: 'We could not verify those details. Create an account first, or check your password.',
      });
    }
  };

  return (
    <div className="auth-form-wrap">
      <p className="eyebrow">Welcome back</p>
      <h2>Sign in to your health space</h2>
      <p className="auth-copy">
        Your credentials are used to securely communicate with your private medical record API.
      </p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form className="form-stack" onSubmit={submit}>
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
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={update}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
          />
        </label>
        <div className="form-row">
          <label className="check-label">
            <input type="checkbox" defaultChecked /> Remember for this session
          </label>
        </div>
        <Button type="submit" className="full-width" icon="arrow" disabled={state.loading}>
          {state.loading ? 'Signing in…' : 'Sign in securely'}
        </Button>
      </form>
      <div className="auth-divider">
        <span>or</span>
      </div>
      <Button variant="secondary" className="full-width" onClick={() => navigate('/dashboard')}>
        Explore the demo dashboard
      </Button>
      <p className="auth-footer">
        New to HealthPass? <Link to="/register">Create your account</Link>
      </p>
    </div>
  );
}

