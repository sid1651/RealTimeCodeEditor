import { Navigate, useNavigate } from "react-router";

function Signup(){
    const navigator=useNavigate();
    return(
<div className="signup-root">
  <div className="signup-blobs" aria-hidden="true">
    <div className="signup-blob signup-blob-a" />
    <div className="signup-blob signup-blob-b" />
    <div className="signup-blob signup-blob-c" />
  </div>

  <header className="signup-header">
    <div className="signup-brand">
      <img src="/logo-dark.png" alt="Kódikos logo" className="signup-brand-logo" />
      <div>
        <div className="signup-brand-name">Kódikos</div>
        <div className="signup-brand-sub">Real-time collaborative editor</div>
      </div>
    </div>

   
  </header>

  <main className="signup-main">
    <section className="signup-hero">
      <h1 className="signup-hero-title">
        Join the future of <span>collaborative coding</span>.
      </h1>
      <p className="signup-hero-desc">
        Create an account and start building with friends, teammates, and communities
        — all in one seamless, real-time coding environment.
      </p>

      <div className="signup-feature-row">
        <div className="signup-feat">
          <strong>Instant</strong>
          <span> room creation</span>
        </div>
        <div className="signup-feat">
          <strong>Free</strong>
          <span> forever tier</span>
        </div>
        <div className="signup-feat">
          <strong>Secure</strong>
          <span> & private</span>
        </div>
      </div>
    </section>

    <section className="signup-panel-wrap">
      <div className="signup-panel" role="region" aria-label="Authentication panel">
        <div className="signup-panel-inner">
          <form className="signup-form">
            <h2 className="signup-form-title">Create your account</h2>

            <label className="signup-field">
              <span className="signup-label">Full Name</span>
              <input name="fullname" type="text" placeholder="John Doe" required />
            </label>

            <label className="signup-field">
              <span className="signup-label">Email</span>
              <input name="email" type="email" placeholder="you@company.com" required />
            </label>

            <label className="signup-field">
              <span className="signup-label">Password</span>
              <input name="password" type="password" placeholder="••••••••" required minLength={6} />
            </label>

            <label className="signup-field">
              <span className="signup-label">Confirm Password</span>
              <input name="confirm-password" type="password" placeholder="••••••••" required minLength={6} />
            </label>

            <button className="signup-submit-btn" type="submit">Sign Up</button>

            <div className="signup-divider"><span>or</span></div>

            <button type="button" className="signup-google-btn"> 
              Sign up with Google
            </button>

            <div className="signup-switch">
              <span>Already have an account?</span>
              <button type="button" className="signup-link-btn" onClick={()=>navigator('/sigin')}>Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer className="signup-footer">
    <small>© 2025 Kódikos — Built for collaborative learning & building.</small>
  </footer>
</div>
    )
}
export default Signup;
