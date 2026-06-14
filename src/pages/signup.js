import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { backend } from "../socket";
import { useAuth } from "../context/AuthContext";
import GoogleAuthButton from "../components/GoogleAuthButton";

function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        password: '',
    });
    const [verificationOtp, setVerificationOtp] = useState('');
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState(
        location.state?.email || ''
    );
    const [isOtpStep, setIsOtpStep] = useState(Boolean(location.state?.needsVerification));
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

    const handleRegister = async (e) => {
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

            setPendingVerificationEmail(data.email || formData.email.trim().toLowerCase());
            setIsOtpStep(true);
            toast.success(data.message || 'OTP sent to your email.');
        } catch (error) {
            const responseData = error.response?.data;

            if (responseData?.requiresVerification) {
                setPendingVerificationEmail(responseData.email || formData.email.trim().toLowerCase());
                setIsOtpStep(true);
            }

            toast.error(responseData?.message || 'Unable to create account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();

        if (!pendingVerificationEmail || !verificationOtp.trim()) {
            toast.error('Enter the OTP sent to your email.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data } = await axios.post(`${backend}/api/auth/verify-registration-otp`, {
                email: pendingVerificationEmail,
                otp: verificationOtp.trim(),
            });

            login({
                token: data.token,
                user: data.user,
            });
            toast.success('Email verified successfully.');
            navigate(redirectTarget, { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to verify OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        if (!pendingVerificationEmail) {
            toast.error('Register with your email first.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data } = await axios.post(`${backend}/api/auth/resend-registration-otp`, {
                email: pendingVerificationEmail,
            });

            setPendingVerificationEmail(data.email || pendingVerificationEmail);
            toast.success(data.message || 'A new OTP has been sent.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to resend OTP.');
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
                            {isOtpStep ? (
                                <form className="signup-form" onSubmit={handleVerifyOtp}>
                                    <h2 className="signup-form-title">Verify your email</h2>

                                    <p className="signup-label" style={{ marginBottom: '0.75rem' }}>
                                        Enter the OTP sent to {pendingVerificationEmail}.
                                    </p>

                                    <label className="signup-field">
                                        <span className="signup-label">OTP</span>
                                        <input
                                            name="otp"
                                            type="text"
                                            placeholder="123456"
                                            value={verificationOtp}
                                            onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            inputMode="numeric"
                                            maxLength={6}
                                        />
                                    </label>

                                    <button type="submit" className="signup-submit-btn" disabled={isSubmitting}>
                                        {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                                    </button>

                                    <button
                                        type="button"
                                        className="signup-google-btn"
                                        disabled={isSubmitting}
                                        onClick={handleResendOtp}
                                    >
                                        Resend OTP
                                    </button>

                                    <div className="signup-switch">
                                        <span>Need to change your email?</span>
                                        <button
                                            type="button"
                                            className="signup-link-btn"
                                            onClick={() => {
                                                setIsOtpStep(false);
                                                setVerificationOtp('');
                                            }}
                                        >
                                            Go back
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form className="signup-form" onSubmit={handleRegister}>
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
                                        {isSubmitting ? 'Sending OTP...' : 'Sign Up'}
                                    </button>

                                    <div className="signup-divider"><span>or</span></div>

                                    <GoogleAuthButton
                                        text="signup_with"
                                        disabled={isSubmitting}
                                        onCredential={handleGoogleCredential}
                                    />

                                    <div className="signup-switch">
                                        <span>Already have an account?</span>
                                        <button
                                            type="button"
                                            className="signup-link-btn"
                                            onClick={() => navigate('/signin', { state: { from: redirectTarget } })}
                                        >
                                            Sign In
                                        </button>
                                    </div>
                                </form>
                            )}
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
