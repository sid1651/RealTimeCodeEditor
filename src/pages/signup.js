import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { backend } from "../socket";
import { useAuth } from "../context/AuthContext";

function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        password: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fullname.trim() || !formData.email.trim() || !formData.password.trim()) {
            toast.error('All fields are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data } = await axios.post(`${backend}/api/auth/register`, {
                name: formData.fullname.trim(),
                email: formData.email.trim(),
                password: formData.password,
            });

            login({
                token: data.token,
                user: data.user,
            });
            toast.success('Account created successfully.');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to create account.');
        } finally {
            setIsSubmitting(false);
        }
    };


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
                            <form className="signup-form" onSubmit={handleSubmit}>
                                <h2 className="signup-form-title">Create your account</h2>

                                <label className="signup-field">
                                    <span className="signup-label">Full Name</span>
                                    <input
                                        name="fullname"
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.fullname}
                                        onChange={handleChange}
                                        required
                                    />
                                </label>

                                <label className="signup-field">
                                    <span className="signup-label">Email</span>
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </label>

                                <label className="signup-field">
                                    <span className="signup-label">Password</span>
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

                                <button type="submit" className="signup-submit-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                                </button>

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
