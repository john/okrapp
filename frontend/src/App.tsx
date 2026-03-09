import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import { setAuthTokenInterceptor } from "./api/client";
import apiClient from "./api/client";
import { NavBar } from "./components/NavBar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import Admin from "./pages/admin/Admin";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminUsers from "./pages/admin/AdminUsers";
import GoalPage from "./pages/GoalPage";
import GoalForm from "./pages/GoalForm";

function AppContent() {
  const { isAuthenticated, getAccessTokenSilently, isLoading } = useAuth0();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Wire token injection into all API requests
    setAuthTokenInterceptor(() =>
      getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
    );

    // Upsert user row in the backend
    apiClient.post("/auth/callback").catch(console.error);
  }, [isAuthenticated, getAccessTokenSilently]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <Routes>
        <Route path="/callback" element={<div />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
        <Route path="/programs/:id" element={<ProtectedRoute><ProgramDetail /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/programs" element={<ProtectedRoute><AdminPrograms /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/goals/new" element={<ProtectedRoute><GoalForm /></ProtectedRoute>} />
        <Route path="/goals/:id" element={<ProtectedRoute><GoalPage /></ProtectedRoute>} />
        <Route path="/goals/:id/edit" element={<ProtectedRoute><GoalEditWrapper /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

function GoalEditWrapper() {
  const { id } = useParams<{ id: string }>();
  return <GoalForm editGoalId={id ? Number(id) : undefined} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
