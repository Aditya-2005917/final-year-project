import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import Predict from "./pages/Predict";
import History from "./pages/History";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/AdminDashboard";
import ShareReport from "./pages/ShareReport";
import TopProperties from "./pages/TopProperties";

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  return token ? children : <Navigate to="/auth" />;
};

const AdminRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("userRole");
  if (!token) return <Navigate to="/auth" />;
  if (role !== "admin") return <Navigate to="/predict" />;
  return children;
};


function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/8 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,11,20,0.4)_70%)]" />
      {/* Skyline */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] opacity-[0.10]">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full text-blue-400" fill="currentColor">
          <rect x="40" y="140" width="70" height="180" rx="2" />
          <rect x="120" y="100" width="55" height="220" rx="2" />
          <rect x="185" y="160" width="90" height="160" rx="2" />
          <rect x="290" y="80" width="48" height="240" rx="2" />
          <rect x="350" y="120" width="75" height="200" rx="2" />
          <polygon points="450,180 490,120 530,180" />
          <rect x="455" y="180" width="70" height="140" rx="1" />
          <rect x="540" y="90" width="60" height="230" rx="2" />
          <rect x="620" y="150" width="85" height="170" rx="2" />
          <rect x="720" y="60" width="50" height="260" rx="2" />
          <rect x="780" y="110" width="95" height="210" rx="2" />
          <polygon points="900,170 945,105 990,170" />
          <rect x="910" y="170" width="70" height="150" rx="1" />
          <rect x="1000" y="95" width="55" height="225" rx="2" />
          <rect x="1070" y="130" width="80" height="190" rx="2" />
          <rect x="1160" y="70" width="45" height="250" rx="2" />
          <rect x="1220" y="145" width="70" height="175" rx="2" />
          <rect x="1310" y="100" width="90" height="220" rx="2" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#070b14] to-transparent" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative">
      <AmbientBackground />
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <div className="relative z-10">
        <Navbar />
        <main>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/predict"
              element={
                <ProtectedRoute>
                  <Predict />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/top-properties"
              element={
                <ProtectedRoute>
                  <TopProperties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            <Route path="/share/:token" element={<ShareReport />} />

            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        </main>
        </div>
      </Router>
    </div>
  );
}