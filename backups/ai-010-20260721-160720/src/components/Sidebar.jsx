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
        <NavLink to="/admin/lead-intake">Lead Intake Center</NavLink>
        <NavLink to="/admin/provider-diagnostics">Provider Intelligence</NavLink>
        <NavLink to="/admin/knowledge-engine">ProviderIQ Knowledge</NavLink>
        <NavLink to="/admin/orders">Order Workspace</NavLink>
        <NavLink to="/admin/commissions">Commission Intelligence</NavLink>
        <NavLink to="/admin/carriers">Carrier Intelligence</NavLink>
        <NavLink to="/availability">Public Lookup</NavLink>
      </nav>
    </aside>
  );
}
