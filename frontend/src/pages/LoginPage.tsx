import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type LoginPageProps = {
  onLoginSuccess?: () => void;
};

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.login(form.email, form.password);
      onLoginSuccess?.();
      navigate("/families");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="container narrow">
      <h2>Entrar</h2>
      <p>Use as credenciais configuradas para seu ambiente.</p>
      <form onSubmit={onSubmit} className="card">
        <label>
          E-mail
          <input
            type="email"
            placeholder="voce@empresa.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            placeholder="Sua senha"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Acessar</button>
      </form>
    </main>
  );
}
