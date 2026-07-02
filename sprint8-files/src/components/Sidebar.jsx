import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar advisor-sidebar">
      <div className="logo">
        <h1>ConnectIQ</h1>
        <span>Advisor Portal</span>
      </div>

      <nav>
        <NavLink to="/admin">Dashboard</NavLink>
        <NavLink to="/admin/leads">Leads</NavLink>
        <NavLink to="/admin/carriers">Carrier Intelligence</NavLink>
        <NavLink to="/availability">Public Lookup</NavLink>
      </nav>
    </aside>
  );
}
