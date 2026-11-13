import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import './Home.css';

export default function Home() {
  return (
    <div className="asrf-home-viewport">
      {/* Background Mars Rover image */}
      <div className="asrf-hero-bg-wrapper" aria-hidden="true">
        <img
          src="/assets/mars-rover-hero.jpg"
          alt="Mars Rover on Martian landscape"
          className="asrf-hero-bg-img"
        />
        <div className="asrf-hero-overlay" />
      </div>

      {/* Hero Content Section */}
      <section className="asrf-hero-main">
        <div className="asrf-hero-container">
          <div className="asrf-hero-card">
            <span className="asrf-hero-eyebrow">
              AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK
            </span>

            <h1 className="asrf-hero-headline">
              Resilient. Autonomous.<br />
              Self-Recovering.
            </h1>

            <p className="asrf-hero-description">
              AI-powered fault detection, prediction and recovery for spacecraft and planetary rovers.
            </p>

            <div className="asrf-hero-actions">
              <Link to="/system" className="asrf-btn asrf-btn--primary">
                <span>Explore System</span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/dashboard" className="asrf-btn asrf-btn--outline">
                <BarChart3 size={16} />
                <span>Live Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
