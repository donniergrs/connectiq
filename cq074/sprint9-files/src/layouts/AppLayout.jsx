import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div className="app-shell sprint9-app-shell">
      <Sidebar />
      <div className="main-panel sprint9-main-panel">
        <Navbar />
        <main className="content sprint9-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
