import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken } from "./api/client";
import { LoginPage } from "./pages/LoginPage";
import { CasesPage } from "./pages/CasesPage";
import { EditorPage } from "./pages/EditorPage";

export function App() {
  const hasToken = Boolean(localStorage.getItem("token"));
  const navigate = useNavigate();

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
