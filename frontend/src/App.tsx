import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken } from "./api/client";
import { runtimeConfig } from "./config/runtime";
import { LoginPage } from "./pages/LoginPage";
import { CasesPage } from "./pages/CasesPage";
import { EditorPage } from "./pages/EditorPage";
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
        <h1>Árvore Familiar</h1>
        <nav>
          <Link to="/cases">Casos</Link>
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
        <Route path="/cases" element={hasToken ? <CasesPage /> : <Navigate to="/login" replace />} />
        <Route path="/cases/:caseId" element={hasToken ? <EditorPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={hasToken ? "/cases" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
