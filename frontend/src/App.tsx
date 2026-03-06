import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken } from "./api/client";
import { runtimeConfig } from "./config/runtime";
import { LoginPage } from "./pages/LoginPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyEditorPage } from "./pages/FamilyEditorPage";
import { MockPreviewPage } from "./pages/MockPreviewPage";

export function App() {
  const navigate = useNavigate();

  if (runtimeConfig.appMode === "mock") {
    return (
      <Routes>
        <Route path="*" element={<MockPreviewPage />} />
      </Routes>
    );
  }

  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <div>
      <header className="topbar">
        <h1>Árvore Genealógica</h1>
        <nav>
          <Link to="/families">Famílias</Link>
          {hasToken && (
            <button
              type="button"
              onClick={() => {
                clearToken();
                navigate("/login");
              }}
            >
              Sair
            </button>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/families" element={hasToken ? <FamiliesPage /> : <Navigate to="/login" replace />} />
        <Route path="/families/:familyId" element={hasToken ? <FamilyEditorPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={hasToken ? "/families" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
