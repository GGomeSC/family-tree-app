import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { CaseItem } from "../types";

export function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [title, setTitle] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [error, setError] = useState("");

  async function loadCases() {
    try {
      setCases(await api.listCases());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void loadCases();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api.createCase(title, clientReference || undefined);
    setTitle("");
    setClientReference("");
    await loadCases();
  }

  return (
    <main className="container">
      <h2>Casos</h2>
      <form className="card row" onSubmit={onCreate}>
        <input placeholder="Título do caso" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input
          placeholder="Referência do cliente"
          value={clientReference}
          onChange={(e) => setClientReference(e.target.value)}
        />
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
