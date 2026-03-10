import { useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStatus } from "./hooks/useAuthStatus";
import { LoginPage } from "./pages/LoginPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyEditorPage } from "./pages/FamilyEditorPage";

function AppHeader({
  isAuthenticated,
  onLogout,
  headerAction,
}: {
  isAuthenticated: boolean;
  onLogout: () => Promise<void>;
  headerAction?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>Árvore Genealógica</h1>
        <nav className="topbar-nav">
          <Link to="/families">Famílias</Link>
        </nav>
      </div>
      <div className="topbar-right">
        {headerAction}
        {isAuthenticated && (
          <button type="button" className="btn-logout" onClick={onLogout}>
            Sair
          </button>
        )}
      </div>
    </header>
  );
}

export function App() {
  const navigate = useNavigate();
  const { authState, isAuthenticated, setAuthState } = useAuthStatus();
  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null);

  async function handleLogout() {
    await api.logout().catch(() => undefined);
    setAuthState("anonymous");
    navigate("/login");
  }

  if (authState === "loading") {
    return (
      <div>
        <AppHeader isAuthenticated={false} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        headerAction={headerAction}
      />
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/families" replace />
            ) : (
              <LoginPage onLoginSuccess={() => setAuthState("authenticated")} />
            )
          }
        />
        <Route
          path="/families"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FamiliesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/families/:familyId"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FamilyEditorPage setHeaderAction={setHeaderAction} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/families" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
