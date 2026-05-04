// src/pages/LandingPage.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Terminal, Users, Shield, GitBranch, Link2, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

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
          <Link to="/signin" className="btn-outline">Log In</Link>
          <Link to="/signup" className="btn-primary">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.header 
        className="hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="hero-content">
          <h1>The Modern <span>Collaborative</span> Code Editor</h1>
          <p>
            The modern collaborative code editor where you can create, share, and
            build projects together in real-time.
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate("/home")}
          >
            Start Coding <ArrowRight size={20} />
          </button>
        </div>
      </motion.header>

      {/* Features Section */}
      <motion.section className="features" id="features" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <h2 className="section-title">Why Kódikos?</h2>
        <div className="features-grid">
          <motion.div className="feature-card" variants={itemVariants}>
            <div className="feature-icon"><Users size={32} /></div>
            <h3>Real-time Collaboration</h3>
            <p>
              Work with your team live — every keystroke is instantly visible to
              everyone in the room.
            </p>
          </motion.div>
          <motion.div className="feature-card" variants={itemVariants}>
            <div className="feature-icon"><Terminal size={32} /></div>
            <h3>Multi-Language Support</h3>
            <p>
              From HTML, CSS, and JS to modern frameworks — code in your favorite stack.
            </p>
          </motion.div>
          <motion.div className="feature-card" variants={itemVariants}>
            <div className="feature-icon"><Shield size={32} /></div>
            <h3>Secure & Private</h3>
            <p>
              Rooms are protected and temporary. Share the link only with people
              you trust.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Kódikos. Built with ❤️ for developers.</p>
        <p>
          <a href="https://github.com/"><GitBranch size={18} style={{marginRight: '8px'}} />GitHub</a> |{" "}
          <a href="https://linkedin.com/"><Link2 size={18} style={{marginRight: '8px'}} />LinkedIn</a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
