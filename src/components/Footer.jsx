import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <h3 className="footer-title">AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK</h3>
            <p className="footer-desc">
              Research demonstrator for autonomous fault-recovery systems in aerospace applications.
              All telemetry and data are simulated.
            </p>
          </div>
          
          <div className="footer-links">
            <h4 className="footer-heading">NAVIGATION</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/records">Records</Link></li>
              <li><Link to="/system">System</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>
          
          <div className="footer-info">
            <h4 className="footer-heading">SYSTEM INFO</h4>
            <div className="info-item">
              <span className="info-label">MODE:</span>
              <span className="info-value">STANDALONE SIMULATION</span>
            </div>
            <div className="info-item">
              <span className="info-label">VERSION:</span>
              <span className="info-value">v1.0.0-beta</span>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="copyright">&copy; {currentYear} AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK Project. Scientific Research Demonstrator.</p>
          <div className="footer-meta-links">
            <a href="/credits">Image Credits</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
