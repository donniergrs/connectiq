import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar sprint9-sidebar">
      <div className="logo sprint9-logo">
        <h1>ConnectIQ</h1>
        <span>Advisor Platform</span>
      </div>

      <nav>
        <NavLink to="/admin" end>Advisor Dashboard</NavLink>
        <NavLink to="/admin/leads">Leads</NavLink>
        <NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>
        <NavLink to="/admin/fcc-explorer">FCC Explorer</NavLink>
        <NavLink to="/admin/carriers">Carrier Intelligence</NavLink>
        <NavLink to="/availability">Public Lookup</NavLink>
      </nav>
    </aside>
  );
}
