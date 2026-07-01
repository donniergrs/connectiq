import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <h1>ConnectIQ</h1>
      </div>

      <nav>

        <NavLink to="/">
          Dashboard
        </NavLink>

        <NavLink to="/lookup">
          Address Lookup
        </NavLink>

        <NavLink to="/carriers">
          Carrier Database
        </NavLink>

      </nav>
    </aside>
  );
}