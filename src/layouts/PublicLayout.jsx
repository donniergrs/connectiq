import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link to="/" className="public-logo">ConnectIQ</Link>
        <nav>
          <Link to="/availability">Check Availability</Link>
          <Link to="/business">Business Internet</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login" className="nav-login">Advisor Login</Link>
        </nav>
      </header>

      <Outlet />

      <footer className="public-footer">
        <strong>ConnectIQ</strong>
        <p>Helping customers find the right internet solution.</p>
        <small>© 2026 ConnectIQ. All rights reserved.</small>
      </footer>
    </div>
  );
}