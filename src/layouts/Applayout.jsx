import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-panel">
        <Navbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
