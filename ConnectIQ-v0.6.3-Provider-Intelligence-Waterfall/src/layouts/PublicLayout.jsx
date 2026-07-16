import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="site">
      <header className="site-nav">
        <Link to="/" className="brand">ConnectIQ</Link>

        <nav>
          <Link to="/availability">Check Availability</Link>
          <Link to="/business">Business</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login" className="advisor-link">Advisor Login</Link>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}
