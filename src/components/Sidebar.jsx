import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Database, Info, LogOut, Home } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="asrf-sidebar" aria-label="Main Navigation">
      <div className="asrf-sidebar-header">
        <NavLink to="/" className="asrf-sidebar-brand" title="ASRF">
          <img src="/assets/asrf-logo.png" alt="ASRF" className="asrf-sidebar-logo" />
        </NavLink>
      </div>

      <nav className="asrf-sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `asrf-nav-item ${isActive ? 'active' : ''}`}
          end
        >
          <Home size={18} className="asrf-nav-icon" />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `asrf-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} className="asrf-nav-icon" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/system"
          className={({ isActive }) => `asrf-nav-item ${isActive ? 'active' : ''}`}
        >
          <Server size={18} className="asrf-nav-icon" />
          <span>System</span>
        </NavLink>

        <NavLink
          to="/records"
          className={({ isActive }) => `asrf-nav-item ${isActive ? 'active' : ''}`}
        >
          <Database size={18} className="asrf-nav-icon" />
          <span>Records</span>
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) => `asrf-nav-item ${isActive ? 'active' : ''}`}
        >
          <Info size={18} className="asrf-nav-icon" />
          <span>About</span>
        </NavLink>
      </nav>

      <div className="asrf-sidebar-footer">
        <button
          type="button"
          className="asrf-nav-item asrf-logout-btn"
          onClick={signOut}
          title="Sign out of ASRF"
        >
          <LogOut size={18} className="asrf-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
