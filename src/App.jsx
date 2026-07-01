import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AppLayout from "./layouts/AppLayout";

import Dashboard from "./pages/Dashboard";
import AddressLookup from "./pages/AddressLookup";
import CarrierDatabase from "./pages/CarrierDatabase";
import Login from "./pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="lookup" element={<AddressLookup />} />
          <Route path="carriers" element={<CarrierDatabase />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}