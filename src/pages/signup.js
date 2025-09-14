
import { useNavigate } from "react-router";




function Signup() {
    const navigate = useNavigate();


    return (
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
                <section className="signup-panel-wrap">
                    <div className="signup-panel" role="region" aria-label="Authentication panel">
                        <div className="signup-panel-inner">
                            <form className="signup-form" >
                                <h2 className="signup-form-title">Create your account</h2>

                                <label className="signup-field">
                                    <span className="signup-label">Full Name</span>
                                    <input
                                        name="fullname"
                                        type="text"
                                        placeholder="John Doe"
                                        
                                        required
                                    />
                                </label>

                                <label className="signup-field">
                                    <span className="signup-label">Email</span>
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        
                                        required
                                    />
                                </label>

                                <label className="signup-field">
                                    <span className="signup-label">Password</span>
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        
                                        required
                                        minLength={6}
                                    />
                                </label>

                                <button type="submit" className="signup-submit-btn">Sign Up</button>

                                <div className="signup-divider"><span>or</span></div>

                                <button type="button" className="signup-google-btn">
                                    Sign up with Google
                                </button>

                                <div className="signup-switch">
                                    <span>Already have an account?</span>
                                    <button
                                        type="button"
                                        className="signup-link-btn"
                                        onClick={() => navigate('/signin')}
                                    >
                                        Sign In
                                    </button>
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
    );
}

export default Signup;
