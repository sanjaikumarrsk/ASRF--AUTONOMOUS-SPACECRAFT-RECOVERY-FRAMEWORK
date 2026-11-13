import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogIn, User } from 'lucide-react';
import './Navbar.css';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const { user, isAuthenticated, signOut } = useAuth();

  // In the design reference, the horizontal top navbar is used on the Home page.
  // Internal pages (Dashboard, System, Records, About) use the dedicated dark navy Sidebar!
  if (location.pathname !== '/') {
    return null;
  }

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'R';

  return (
    <header className="asrf-home-header">
      <div className="asrf-home-header-inner">
        {/* Brand with ASRF orbital logo ONLY - no full text */}
        <Link to="/" className="asrf-brand-logo" title="ASRF">
          <img src="/assets/asrf-logo.png" alt="ASRF" className="asrf-logo-img" />
        </Link>

        {/* Central Nav Links */}
        <nav className="asrf-home-nav">
          <NavLink to="/" className={({ isActive }) => `asrf-home-link ${isActive ? 'active' : ''}`} end>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `asrf-home-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/system" className={({ isActive }) => `asrf-home-link ${isActive ? 'active' : ''}`}>
            System
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => `asrf-home-link ${isActive ? 'active' : ''}`}>
            Records
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `asrf-home-link ${isActive ? 'active' : ''}`}>
            About
          </NavLink>
        </nav>

        {/* Auth / Profile initial */}
        <div className="asrf-home-auth">
          {isAuthenticated ? (
            <div className="asrf-profile-badge" title={`Signed in as ${user?.username || 'Researcher'}`}>
              <span className="asrf-profile-initial">{initial}</span>
            </div>
          ) : (
            <Link to="/login" className="asrf-login-btn">
              <LogIn size={15} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
