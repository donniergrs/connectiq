import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div className="layout">
      <Sidebar />

      <div className="content">
        <Navbar />

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}