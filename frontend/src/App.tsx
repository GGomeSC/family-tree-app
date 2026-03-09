import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { runtimeConfig } from "./config/runtime";
import { LoginPage } from "./pages/LoginPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyEditorPage } from "./pages/FamilyEditorPage";
import { MockPreviewPage } from "./pages/MockPreviewPage";

export function App() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "anonymous">("loading");

  useEffect(() => {
    if (runtimeConfig.appMode === "mock") {
      return;
    }
    let isMounted = true;
    api
      .me()
      .then(() => {
        if (isMounted) setAuthState("authenticated");
      })
      .catch(() => {
        if (isMounted) setAuthState("anonymous");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (runtimeConfig.appMode === "mock") {
    return (
      <Routes>
        <Route path="*" element={<MockPreviewPage />} />
      </Routes>
    );
  }

  const isAuthenticated = authState === "authenticated";

  if (authState === "loading") {
    return (
      <div>
        <header className="topbar">
          <h1>Árvore Genealógica</h1>
        </header>
      </div>
    );
  }

  return (
    <div>
      <header className="topbar">
        <h1>Árvore Genealógica</h1>
        <nav>
          <Link to="/families">Famílias</Link>
          {isAuthenticated && (
            <button
              type="button"
              onClick={async () => {
                await api.logout().catch(() => undefined);
                setAuthState("anonymous");
                navigate("/login");
              }}
            >
              Sair
            </button>
          )}
        </nav>
      </header>
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
        <Route path="/families" element={isAuthenticated ? <FamiliesPage /> : <Navigate to="/login" replace />} />
        <Route path="/families/:familyId" element={isAuthenticated ? <FamilyEditorPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/families" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
