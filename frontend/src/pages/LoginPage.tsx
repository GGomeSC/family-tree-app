import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@example.com", password: "admin123" });
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { access_token } = await api.login(form.email, form.password);
      setToken(access_token);
      navigate("/cases");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="container narrow">
      <h2>Entrar</h2>
      <form onSubmit={onSubmit} className="card">
        <label>
          E-mail
          <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label>
          Senha
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Acessar</button>
      </form>
    </main>
  );
}