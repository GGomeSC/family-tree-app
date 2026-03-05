import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { CaseItem } from "../types";

export function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [form, setForm] = useState({ title: "", clientRef: "" });
  const [error, setError] = useState("");

  const loadCases = () => api.listCases().then(setCases).catch((e) => setError(e.message));
  useEffect(() => { loadCases(); }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createCase(form.title, form.clientRef || undefined);
      setForm({ title: "", clientRef: "" });
      loadCases();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="container">
      <h2>Casos</h2>
      <form className="card row" onSubmit={onCreate}>
        <input placeholder="Título do caso" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        <input placeholder="Referência do cliente" value={form.clientRef} onChange={(e) => setForm((f) => ({ ...f, clientRef: e.target.value }))} />
        <button type="submit">Novo caso</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="card list">
        {cases.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.title}</strong>
              <small>{c.status}</small>
            </div>
            <Link to={`/cases/${c.id}`}>Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}