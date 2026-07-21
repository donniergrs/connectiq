import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CustomerContextProvider } from "./context/CustomerContext";
import { ConversationProvider } from "./context/ConversationContext";
import ProtectedRoute from "./components/ProtectedRoute";

import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";

import Home from "./pages/Home";
import BusinessInternet from "./pages/BusinessInternet";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PublicQuote from "./pages/PublicQuote";

import Dashboard from "./pages/Dashboard";
import CarrierDatabase from "./pages/CarrierDatabase";
import LeadDetail from "./pages/LeadDetail";
import Leads from "./pages/Leads";
import LeadPipeline from "./pages/LeadPipeline";
import TeamDirectory from "./pages/TeamDirectory";
import DistributionRules from "./pages/DistributionRules";
import MyDay from "./pages/MyDay";
import ExecutiveCommandCenter from "./pages/ExecutiveCommandCenter";
import LeadIntakeCenter from "./pages/LeadIntakeCenter";
import ProviderDiagnostics from "./pages/ProviderDiagnostics";
import Orders from "./pages/Orders";
import Commissions from "./pages/Commissions";
import Login from "./pages/Login";

import InternetAdvisor from "./pages/InternetAdvisor";
// CONNECTIQ-AI-004C-IMPORTS
import AiSalesAdvisor from "./pages/AiSalesAdvisor";
import AiConversationMonitor from "./pages/AiConversationMonitor";
import UniversityConsole from "./pages/UniversityConsole";
import KnowledgeEngine from "./pages/KnowledgeEngine";
import CommandCenter from "./pages/CommandCenter";
import "./ai004c.css";
export default function App() {
  return (
    <AuthProvider>
      <CustomerContextProvider>
        <ConversationProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/availability" element={<InternetAdvisor embedded />} />
          <Route path="/advisor" element={<AiSalesAdvisor />} />
          <Route path="/internet" element={<Navigate to="/availability" replace />} />
          <Route path="/business" element={<BusinessInternet />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/quote/:quoteId" element={<PublicQuote />} />
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
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="my-day" element={<MyDay />} />
          <Route path="executive" element={<ExecutiveCommandCenter />} />
          <Route path="carriers" element={<CarrierDatabase />} />
          <Route path="pipeline" element={<LeadPipeline />} />
          <Route path="team" element={<TeamDirectory />} />
          <Route path="distribution-rules" element={<DistributionRules />} />
          <Route path="lead-intake" element={<LeadIntakeCenter />} />
          <Route path="provider-diagnostics" element={<ProviderDiagnostics />} />
          <Route path="conversation-monitor" element={<AiConversationMonitor />} />
          <Route path="university" element={<UniversityConsole />} />
          <Route path="knowledge-engine" element={<KnowledgeEngine />} />
          <Route path="orders" element={<Orders />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:leadId" element={<LeadDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </ConversationProvider>
      </CustomerContextProvider>
    </AuthProvider>
  );
}
