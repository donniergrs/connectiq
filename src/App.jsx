import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CustomerContextProvider } from "./context/CustomerContext";
import ProtectedRoute from "./components/ProtectedRoute";

import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";

import Home from "./pages/Home";
import AddressLookup from "./pages/AddressLookup";
import BusinessInternet from "./pages/BusinessInternet";
import About from "./pages/About";
import Contact from "./pages/Contact";

import Dashboard from "./pages/Dashboard";
import CarrierDatabase from "./pages/CarrierDatabase";
import FccLookup from "./pages/FccLookup";
import FccExplorer from "./pages/FccExplorer";
import LeadDetail from "./pages/LeadDetail";
import Leads from "./pages/Leads";
import LeadPipeline from "./pages/LeadPipeline";
import TeamDirectory from "./pages/TeamDirectory";
import DistributionRules from "./pages/DistributionRules";
import Login from "./pages/Login";

import InternetAdvisor from "./pages/InternetAdvisor";
export default function App() {
  return (
    <AuthProvider>
      <CustomerContextProvider>
      <Routes>
        <Route path="/internet" element={<InternetAdvisor />} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/availability" element={<AddressLookup />} />
          <Route path="/business" element={<BusinessInternet />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="carriers" element={<CarrierDatabase />} />
          <Route path="fcc-lookup" element={<FccLookup />} />
          <Route path="fcc-explorer" element={<FccExplorer />} />
          <Route path="pipeline" element={<LeadPipeline />} />
          <Route path="team" element={<TeamDirectory />} />
          <Route path="distribution-rules" element={<DistributionRules />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:leadId" element={<LeadDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </CustomerContextProvider>
    </AuthProvider>
  );
}