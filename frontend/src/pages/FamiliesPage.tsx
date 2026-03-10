import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { FamilyItem } from "../types";

export function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyItem[]>([]);
  const [form, setForm] = useState({ title: "", clientRef: "" });
  const [error, setError] = useState("");

  const loadFamilies = () => api.listFamilies().then(setFamilies).catch((e) => setError(e.message));
  useEffect(() => { loadFamilies(); }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { title: form.title } as const;
      await api.createFamily(
        form.clientRef ? { ...payload, client_reference: form.clientRef } : payload,
      );
      setForm({ title: "", clientRef: "" });
      loadFamilies();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="container">
      <h2>Famílias</h2>
      <form className="card row" onSubmit={onCreate}>
        <input placeholder="Título da família" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        <input placeholder="Referência do cliente" value={form.clientRef} onChange={(e) => setForm((f) => ({ ...f, clientRef: e.target.value }))} />
        <button type="submit">Nova família</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="card list">
        {families.map((family) => (
          <li key={family.id}>
            <div>
              <strong>{family.title}</strong>
              <small>{family.status}</small>
            </div>
            <Link to={`/families/${family.id}`}>Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
