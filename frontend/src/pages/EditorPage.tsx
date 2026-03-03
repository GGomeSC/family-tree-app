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

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isRichiedente, setIsRichiedente] = useState(false);

  const [partnerA, setPartnerA] = useState(0);
  const [partnerB, setPartnerB] = useState(0);
  const [marriageDate, setMarriageDate] = useState("");

  const [parentId, setParentId] = useState(0);
  const [childId, setChildId] = useState(0);

  async function loadPreview() {
    try {
      setPreview(await api.preview(id));
    } catch {
      setPreview(null);
    }
  }

  async function loadExports() {
    try {
      setExports(await api.listExports(id));
    } catch {
      setExports([]);
    }
  }

  useEffect(() => {
    void loadPreview();
    void loadExports();
  }, [id]);

  useEffect(() => {
    if (!preview) return;
    const mapped = preview.persons.map((p) => ({
      id: p.id,
      case_id: id,
      full_name: p.name,
      birth_date: p.birth_date,
      is_richiedente: p.is_richiedente,
      notes: null,
    }));
    setPersons(mapped);
  }, [preview, id]);

  async function createPerson(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createPerson(id, { full_name: name, birth_date: birthDate, is_richiedente: isRichiedente });
      setName("");
      setBirthDate("");
      setIsRichiedente(false);
      await loadPreview();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createUnion(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createUnion(id, {
        partner_a_person_id: Number(partnerA),
        partner_b_person_id: Number(partnerB),
        marriage_date: marriageDate || undefined,
      });
      await loadPreview();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createParentChild(id, { parent_person_id: Number(parentId), child_person_id: Number(childId) });
      await loadPreview();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onExportPdf() {
    setError("");
    try {
      await api.exportPdf(id);
      await loadExports();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container">
      <h2>Editor do Caso #{id}</h2>
      {error && <p className="error">{error}</p>}

      <section className="grid-two">
        <form className="card" onSubmit={createPerson}>
          <h3>Pessoa</h3>
          <input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          <label>
            <input
              type="checkbox"
              checked={isRichiedente}
              onChange={(e) => setIsRichiedente(e.target.checked)}
            />
            Richiedente
          </label>
          <button type="submit">Adicionar pessoa</button>
        </form>

        <form className="card" onSubmit={createUnion}>
          <h3>União</h3>
          <select value={partnerA} onChange={(e) => setPartnerA(Number(e.target.value))} required>
            <option value={0}>Parceiro A</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <select value={partnerB} onChange={(e) => setPartnerB(Number(e.target.value))} required>
            <option value={0}>Parceiro B</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <input type="date" value={marriageDate} onChange={(e) => setMarriageDate(e.target.value)} />
          <button type="submit">Adicionar união</button>
        </form>

        <form className="card" onSubmit={createLink}>
          <h3>Vínculo pai/mãe-filho(a)</h3>
          <select value={parentId} onChange={(e) => setParentId(Number(e.target.value))} required>
            <option value={0}>Pessoa ascendente</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <select value={childId} onChange={(e) => setChildId(Number(e.target.value))} required>
            <option value={0}>Pessoa descendente</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <button type="submit">Adicionar vínculo</button>
        </form>

        <section className="card">
          <h3>Exportação</h3>
          <button type="button" onClick={onExportPdf}>Gerar PDF</button>
          <ul className="list">
            {exports.map((ex) => (
              <li key={ex.id}>
                <a href={api.downloadExportUrl(ex.id)} target="_blank" rel="noreferrer">
                  Export #{ex.id} - {new Date(ex.created_at).toLocaleString("pt-BR")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="card">
        <h3>Preview (layout automático)</h3>
        {!preview && <p>Adicione pessoas e vínculos para visualizar.</p>}
        {preview && <HierarchyPreview preview={preview} />}
      </section>
    </main>
  );
}
