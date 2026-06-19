import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { backend } from "../socket";
import { useAuth } from "../context/AuthContext";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GitHubAuthButton from "../components/GitHubAuthButton";

export default function Signlog() {
const navigate=useNavigate();
const location = useLocation();
const { login } = useAuth();
const [formData, setFormData] = useState({
  email: '',
  password: '',
});
const [isSubmitting, setIsSubmitting] = useState(false);
const redirectTarget = useMemo(() => {
  if (typeof location.state?.from === 'string' && location.state.from.startsWith('/')) {
    return location.state.from;
  }

  return '/dashboard';
}, [location.state]);

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.email.trim() || !formData.password.trim()) {
    toast.error('Email and password are required.');
    return;
  }

  setIsSubmitting(true);
  try {
    const { data } = await axios.post(`${backend}/api/auth/login`, {
      email: formData.email.trim(),
      password: formData.password,
    });

    login({
      token: data.token,
      user: data.user,
    });
    toast.success('Signed in successfully.');
    navigate(redirectTarget, { replace: true });
  } catch (error) {
    const responseData = error.response?.data;

    if (responseData?.requiresVerification) {
      toast.error(responseData.message || 'Please verify your email before signing in.');
      navigate('/signup', {
        state: {
          from: redirectTarget,
          email: responseData.email || formData.email.trim().toLowerCase(),
          needsVerification: true,
        },
      });
      return;
    }

    toast.error(responseData?.message || 'Unable to sign in.');
  } finally {
    setIsSubmitting(false);
  }
};

const handleGoogleCredential = useCallback(async (credential) => {
  setIsSubmitting(true);

  try {
    const { data } = await axios.post(`${backend}/api/auth/google`, {
      credential,
    });

    login({
      token: data.token,
      user: data.user,
    });
    toast.success(data.message || 'Signed in with Google successfully.');
    navigate(redirectTarget, { replace: true });
  } catch (error) {
    toast.error(error.response?.data?.message || 'Unable to sign in with Google.');
  } finally {
    setIsSubmitting(false);
  }
}, [login, navigate, redirectTarget]);

  return (
    <div className="auth-root">
  <div className="bg-blobs" aria-hidden="true">
    <div className="blob blob-a" />
    <div className="blob blob-b" />
    <div className="blob blob-c" />
  </div>

  <header className="auth-header">
    <div className="brand">
      <img src="/logo-dark.png" alt="Kódikos logo" className="brand-logo" />
      <div>
        <div className="brand-name">Kódikos</div>
        <div className="brand-sub">Real-time collaborative editor</div>
      </div>
    </div>
  </header>

  <main className="auth-main">
    <section className="hero-copy">
      <h1 className="hero-title">
        Jump into collaborative coding — <span>instantly</span>.
      </h1>
      <p className="hero-desc">
        Create rooms, invite teammates, and edit together in near real-time.
        Secure, fast, and tuned for developer workflows.
      </p>

      <div className="feature-row">
        <div className="feat">
          <strong>Live</strong>
          <span> keystrokes & presence</span>
        </div>
        <div className="feat">
          <strong>Private</strong>
          <span> rooms & perms</span>
        </div>
        <div className="feat">
          <strong>Low-latency</strong>
          <span> sync</span>
        </div>
      </div>
    </section>

    <section className="auth-panel-wrap">
      <div className="auth-panel signin-mode" role="region" aria-label="Authentication panel">
        <div className="panel-inner">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Welcome back</h2>

            <label className="field">
              <span className="label">Email</span>
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </label>

            <button className="submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="divider"><span>or</span></div>

            <GoogleAuthButton
              text="continue_with"
              disabled={isSubmitting}
              onCredential={handleGoogleCredential}
            />

            <GitHubAuthButton
              disabled={isSubmitting}
              redirectTarget={redirectTarget}
              intent="signin"
            />

            <div className="switch-row">
              <span>New here?</span>
              <button
                type="button"
                onClick={() => navigate('/signup', { state: { from: redirectTarget } })}
                className="link-btn"
              >
                Create an account
              </button>
            </div>
          </form>
        </div>

        <div className="panel-deco deco-left" />
        <div className="panel-deco deco-right" />
      </div>
    </section>
  </main>

  <footer className="auth-footer">
    <small>© 2025 Kódikos — Built for collaborative learning & building.</small>
  </footer>
</div>

  );
}
