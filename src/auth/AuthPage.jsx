import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Orbit, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import './AuthPage.css';

function AuthPage({ mode }) {
  const isRegistration = mode === 'register';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'SCIENTIST',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, isAuthenticated, checking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (isAuthenticated && !checking) {
      const destination = location.state?.from || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, checking, location.state, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegistration) {
      if (!formData.fullName.trim() || !formData.email.trim() || !formData.username.trim()) {
        setError('All fields are required.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      if (!formData.username.trim() || !formData.password) {
        setError('Username/Email and Password are required.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = isRegistration
        ? {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            username: formData.username.trim(),
            password: formData.password,
            role: formData.role,
          }
        : {
            username: formData.username.trim(),
            password: formData.password,
          };

      await signIn(payload, isRegistration ? 'register' : 'login');
      const destination = location.state?.from || '/dashboard';
      navigate(destination, { replace: true });
    } catch (requestError) {
      const message = requestError?.details?.detail || requestError?.message || 'Authentication failed. Please verify credentials.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <Orbit size={28} className="auth-brand-icon" aria-hidden="true" />
          <span>AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK</span>
        </div>
        
        <div className="auth-heading">
          <div className="auth-icon">
            <LockKeyhole size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="auth-eyebrow">NASA / JPL SCIENTIFIC DEMONSTRATOR</p>
            <h1 id="auth-title">{isRegistration ? 'Mission Access Registration' : 'Mission Operations Sign In'}</h1>
          </div>
        </div>

        <p className="auth-description">
          {isRegistration
            ? 'Register authorized aerospace scientist or mission operations credentials.'
            : 'Authenticate to access the spacecraft telemetry console, digital twin, and recovery records.'}
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegistration && (
            <>
              <div className="auth-field-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="e.g. Dr. Eugene Kranz"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field-group">
                <label htmlFor="email">Aerospace / Institutional Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@agency.nasa.gov"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className="auth-field-group">
            <label htmlFor="username">{isRegistration ? 'System Username' : 'Username or Email'}</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder={isRegistration ? 'e.g. flight_director' : 'rsk or username'}
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {isRegistration && (
            <div className="auth-field-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {isRegistration && (
            <fieldset className="auth-role-fieldset">
              <legend>Operational Clearance Role</legend>
              <div className="auth-role-grid">
                <label className={`auth-role-option ${formData.role === 'SCIENTIST' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="SCIENTIST"
                    checked={formData.role === 'SCIENTIST'}
                    onChange={handleChange}
                  />
                  <span>
                    <strong>Mission Scientist</strong>
                    <small>Telemetry analytics & diagnostics</small>
                  </span>
                </label>

                <label className={`auth-role-option ${formData.role === 'OPERATOR' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="OPERATOR"
                    checked={formData.role === 'OPERATOR'}
                    onChange={handleChange}
                  />
                  <span>
                    <strong>Flight Controller</strong>
                    <small>Recovery strategies & verification</small>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          <button className="auth-submit" type="submit" disabled={submitting}>
            <span>{submitting ? 'Verifying Credentials...' : (isRegistration ? 'Complete Registration' : 'Authenticate & Enter Console')}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <footer className="auth-footer">
          {isRegistration ? (
            <p>
              Already hold operational clearance? <Link to="/auth/login">Sign in here</Link>
            </p>
          ) : (
            <p>
              Need operational clearance? <Link to="/auth/register">Register authorized access</Link>
            </p>
          )}
          <div className="auth-demo-hint">
            <span>Default Test Credentials:</span> <code>rsk</code> / <code>rsk</code>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default AuthPage;
