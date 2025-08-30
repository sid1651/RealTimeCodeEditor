// src/pages/LandingPage.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
 // keep your styles

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="navbar-logo">
          <img src="logo-dark.png" alt="Kódikos Logo" />
          <span>Kódikos</span>
        </div>

        <ul className="navbar-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>

        <div className="navbar-actions">
          {/* use Link to avoid full reload */}
          <Link to="/sigin" className="btn-outline">Log In</Link>
          <Link to="/signup" className="btn-primary">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <h1>Kódikos</h1>
          <img src="logo-dark.png" alt="Kódikos Logo" className="hero-logo" />
          <p>
            The modern collaborative code editor where you can create, share, and
            build projects together in real-time.
          </p>
          <button
            className="btn-secondary"
            onClick={() => navigate("/home")}
          >
            Create Room
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section className="features" id="features">
        <h2>Why Kódikos?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <img src="/download.png" alt="Real-time" />
            <h3>Real-time Collaboration</h3>
            <p>
              Work with your team live — every keystroke is instantly visible to
              everyone in the room.
            </p>
          </div>
          <div className="feature-card">
            <img src="https://img.icons8.com/color/344/code-file.png" alt="Languages" />
            <h3>Multi-Language Support</h3>
            <p>
              From HTML, CSS, and JS to modern frameworks — code in your favorite stack.
            </p>
          </div>
          <div className="feature-card">
            <img src="https://img.icons8.com/fluency/344/shield.png" alt="Secure" />
            <h3>Secure & Private</h3>
            <p>
              Rooms are protected and temporary. Share the link only with people
              you trust.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <h2>About Kódikos</h2>
        <p>
          Kódikos was built with developers in mind. Inspired by platforms like
          CodePen and VSCode, it aims to bring the best real-time editing
          experience for students, teams, and professionals.
        </p>
        <p>
          With simplicity at its core, it helps you create rooms instantly and
          focus on what matters: <strong>writing great code</strong>.
        </p>
      </section>

      {/* Call To Action */}
      <section className="cta" id="create-room">
        <h2>Ready to Start?</h2>
        <p>Create your coding room and invite your team today.</p>
        <button
          className="btn-secondary"
          onClick={() => navigate("/home")}
        >
          Create Room
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Kódikos. Built with ❤️ for developers.</p>
        <p>
          <a href="https://github.com/">GitHub</a> |{" "}
          <a href="https://linkedin.com/">LinkedIn</a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
