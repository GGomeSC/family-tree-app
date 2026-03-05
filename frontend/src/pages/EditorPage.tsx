import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { ExportItem, LayoutPreview, Person } from "../types";

export function EditorPage() {
  const { caseId } = useParams();
  const id = Number(caseId);

  const [persons, setPersons] = useState<Person[]>([]);
  const [preview, setPreview] = useState<LayoutPreview | null>(null);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [error, setError] = useState("");

  const [personForm, setPersonForm] = useState({ name: "", birthDate: "", isRichiedente: false });
  const [unionForm, setUnionForm] = useState({ partnerA: 0, partnerB: 0, marriageDate: "" });
  const [linkForm, setLinkForm] = useState({ parentId: 0, childId: 0 });

  const loadData = async () => {
    try {
      const [prev, exps] = await Promise.all([api.preview(id).catch(() => null), api.listExports(id).catch(() => [])]);
      setPreview(prev);
      setExports(exps);
      if (prev) {
        setPersons(prev.persons.map((p) => ({
          id: p.id, case_id: id, full_name: p.name, birth_date: p.birth_date, is_richiedente: p.is_richiedente, notes: null
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { void loadData(); }, [id]);

  const withError = (fn: () => Promise<void>) => async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    try { await fn(); await loadData(); }
    catch (err) { setError((err as Error).message); }
  };

  const createPerson = withError(async () => {
    await api.createPerson(id, { full_name: personForm.name, birth_date: personForm.birthDate, is_richiedente: personForm.isRichiedente });
    setPersonForm({ name: "", birthDate: "", isRichiedente: false });
  });

  const createUnion = withError(async () => {
    await api.createUnion(id, { partner_a_person_id: unionForm.partnerA, partner_b_person_id: unionForm.partnerB, marriage_date: unionForm.marriageDate || undefined });
    setUnionForm({ partnerA: 0, partnerB: 0, marriageDate: "" });
  });

  const createLink = withError(async () => {
    await api.createParentChild(id, { parent_person_id: linkForm.parentId, child_person_id: linkForm.childId });
    setLinkForm({ parentId: 0, childId: 0 });
  });

  const onExportPdf = withError(() => api.exportPdf(id));

  const personOptions = persons.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>);

  return (
    <main className="container">
      <h2>Editor do Caso #{id}</h2>
      {error && <p className="error">{error}</p>}

      <section className="grid-two">
        <form className="card" onSubmit={createPerson}>
          <h3>Pessoa</h3>
          <input placeholder="Nome completo" value={personForm.name} onChange={(e) => setPersonForm((p) => ({ ...p, name: e.target.value }))} required />
          <input type="date" value={personForm.birthDate} onChange={(e) => setPersonForm((p) => ({ ...p, birthDate: e.target.value }))} required />
          <label>
            <input type="checkbox" checked={personForm.isRichiedente} onChange={(e) => setPersonForm((p) => ({ ...p, isRichiedente: e.target.checked }))} />
            Richiedente
          </label>
          <button type="submit">Adicionar pessoa</button>
        </form>

        <form className="card" onSubmit={createUnion}>
          <h3>União</h3>
          <select value={unionForm.partnerA} onChange={(e) => setUnionForm((p) => ({ ...p, partnerA: Number(e.target.value) }))} required>
            <option value={0}>Parceiro A</option>{personOptions}
          </select>
          <select value={unionForm.partnerB} onChange={(e) => setUnionForm((p) => ({ ...p, partnerB: Number(e.target.value) }))} required>
            <option value={0}>Parceiro B</option>{personOptions}
          </select>
          <input type="date" value={unionForm.marriageDate} onChange={(e) => setUnionForm((p) => ({ ...p, marriageDate: e.target.value }))} />
          <button type="submit">Adicionar união</button>
        </form>

        <form className="card" onSubmit={createLink}>
          <h3>Vínculo pai/mãe-filho(a)</h3>
          <select value={linkForm.parentId} onChange={(e) => setLinkForm((p) => ({ ...p, parentId: Number(e.target.value) }))} required>
            <option value={0}>Pessoa ascendente</option>{personOptions}
          </select>
          <select value={linkForm.childId} onChange={(e) => setLinkForm((p) => ({ ...p, childId: Number(e.target.value) }))} required>
            <option value={0}>Pessoa descendente</option>{personOptions}
          </select>
          <button type="submit">Adicionar vínculo</button>
        </form>

        <section className="card">
          <h3>Exportação</h3>
          <button type="button" onClick={onExportPdf}>Gerar PDF</button>
          <ul className="list">
            {exports.map((ex) => (
              <li key={ex.id}>
                <a href={api.downloadExportUrl(ex.id)} target="_blank" rel="noreferrer">Export #{ex.id} - {new Date(ex.created_at).toLocaleString("pt-BR")}</a>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="card">
        <h3>Preview (layout automático)</h3>
        {!preview ? <p>Adicione pessoas e vínculos para visualizar.</p> : <HierarchyPreview preview={preview} />}
      </section>
    </main>
  );
}