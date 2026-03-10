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
}: {
  isAuthenticated: boolean;
  onLogout: () => Promise<void>;
}) {
  return (
    <header className="topbar">
      <h1>Árvore Genealógica</h1>
      <nav>
        <Link to="/families">Famílias</Link>
        {isAuthenticated && (
          <button type="button" onClick={onLogout}>
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}

export function App() {
  const navigate = useNavigate();
  const { authState, isAuthenticated, setAuthState } = useAuthStatus();

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
      <AppHeader isAuthenticated={isAuthenticated} onLogout={handleLogout} />
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
              <FamilyEditorPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/families" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
