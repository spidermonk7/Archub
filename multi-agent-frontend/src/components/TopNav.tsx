import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav: React.FC = () => {
  const { pathname } = useLocation();
  const isActive = (p: string) => (pathname === p ? 'active' : '');
  return (
    <header className="topnav">
      <div className="nav-gradient" />
      <div className="container-xl nav-inner">
        <Link to="/" className="brand">
          <span className="logo-dot" />
          <span className="logo-text">Archub</span>
          <span className="brand-tag">alpha</span>
        </Link>
        <nav className="nav-links">
          <Link className={`nav-link ${isActive('/')}`} to="/">Home</Link>
          <Link className={`nav-link ${isActive('/builder')}`} to="/builder">Builder</Link>
          <Link className={`nav-link ${isActive('/agent-pool')}`} to="/agent-pool">Agents</Link>
          <Link className={`nav-link ${isActive('/team-pool')}`} to="/team-pool">Teams</Link>
          <Link className={`nav-link ${isActive('/tool-pool')}`} to="/tool-pool">Tools</Link>
          <Link className={`nav-link ${isActive('/python-runner')}`} to="/python-runner">Python Runner</Link>
        </nav>
        <div className="nav-actions">
          <Link className="nav-cta" to="/run-team">
            Launch
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
