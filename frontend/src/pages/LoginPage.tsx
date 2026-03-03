import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await api.login(email, password);
      setToken(result.access_token);
      navigate("/cases");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container narrow">
      <h2>Entrar</h2>
      <form onSubmit={onSubmit} className="card">
        <label>
          E-mail
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Acessar</button>
      </form>
    </main>
  );
}
