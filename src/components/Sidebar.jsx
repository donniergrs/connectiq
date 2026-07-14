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
        <NavLink to="/admin/my-day">My Day</NavLink>
        <NavLink to="/admin/executive">Executive Command Center</NavLink>
        <NavLink to="/admin/pipeline">Lead Pipeline</NavLink>
        <NavLink to="/admin/leads">Lead List</NavLink>
        <NavLink to="/admin/team">Sales Team</NavLink>
        <NavLink to="/admin/distribution-rules">Distribution Rules</NavLink>
        <NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>
        <NavLink to="/admin/fcc-explorer">FCC Explorer</NavLink>
        <NavLink to="/admin/carriers">Carrier Intelligence</NavLink>
        <NavLink to="/availability">Public Lookup</NavLink>
      </nav>
    </aside>
  );
}
