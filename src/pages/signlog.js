
import { Navigate, useNavigate } from "react-router";

export default function Signlog() {
const navigate=useNavigate();

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
          <form className="auth-form">
            <h2 className="form-title">Welcome back</h2>

            <label className="field">
              <span className="label">Email</span>
              <input name="email" type="email" placeholder="you@company.com" required />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input name="password" type="password" placeholder="••••••••" required minLength={6} />
            </label>

            <button className="submit-btn" type="submit">Sign In</button>

            <div className="divider"><span>or</span></div>

            <button type="button" className="google-btn">
              
              Continue with Google
            </button>

            <div className="switch-row">
              <span>New here?</span>
              <button type="button" onClick={()=>navigate('signup')} className="link-btn">Create an account</button>
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

