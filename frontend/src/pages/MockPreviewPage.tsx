import { useMemo, useState } from "react";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { mockLayoutPreview } from "../mocks/mockLayoutPreview";

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function buildRelations(personId: number) {
  const parents: number[] = [];
  const children: number[] = [];
  const spouses = mockLayoutPreview.unions
    .filter((union) => union.partner_a_person_id === personId || union.partner_b_person_id === personId)
    .map((union) =>
      union.partner_a_person_id === personId ? union.partner_b_person_id : union.partner_a_person_id
    );

  for (const edge of mockLayoutPreview.edges) {
    if (edge.to_id === personId) {
      if (edge.via_union_id) {
        const union = mockLayoutPreview.unions.find((item) => item.id === edge.via_union_id);
        if (union) {
          parents.push(union.partner_a_person_id, union.partner_b_person_id);
        }
      } else {
        parents.push(edge.from_id);
      }
    }

    if (edge.from_id === personId) {
      children.push(edge.to_id);
    }

    if (edge.via_union_id) {
      const union = mockLayoutPreview.unions.find((item) => item.id === edge.via_union_id);
      if (union && (union.partner_a_person_id === personId || union.partner_b_person_id === personId)) {
        children.push(edge.to_id);
      }
    }
  }

  return {
    spouses: uniqueNumbers(spouses),
    parents: uniqueNumbers(parents).filter((id) => id !== personId),
    children: uniqueNumbers(children).filter((id) => id !== personId),
  };
}

function formatNames(ids: number[], byId: Map<number, (typeof mockLayoutPreview.persons)[number]>) {
  if (!ids.length) return "Nenhum";
  return ids.map((id) => byId.get(id)?.name ?? `Pessoa #${id}`).join(", ");
}

export function MockPreviewPage() {
  const initialSelection = mockLayoutPreview.persons.find((person) => person.is_richiedente)?.id ?? null;
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(initialSelection);
  const [scale, setScale] = useState(1);

  const byId = useMemo(
    () => new Map<number, (typeof mockLayoutPreview.persons)[number]>(mockLayoutPreview.persons.map((p) => [p.id, p])),
    []
  );

  const selectedPerson = selectedPersonId ? byId.get(selectedPersonId) ?? null : null;
  const relations = selectedPersonId ? buildRelations(selectedPersonId) : null;

  function decreaseZoom() {
    setScale((current) => Math.max(0.7, Number((current - 0.1).toFixed(2))));
  }

  function increaseZoom() {
    setScale((current) => Math.min(1.6, Number((current + 0.1).toFixed(2))));
  }

  function resetZoom() {
    setScale(1);
  }

  return (
    <main className="container">
      <h2>Preview estático da árvore familiar</h2>
      <p>Visualização com dados fixos para demonstração comercial em ambiente 100% estático.</p>

      <section className="grid-two">
        <section className="card">
          <div className="mock-controls">
            <strong>Controles de visualização</strong>
            <div className="mock-controls-buttons">
              <button type="button" onClick={decreaseZoom} aria-label="Diminuir zoom">
                -
              </button>
              <button type="button" onClick={increaseZoom} aria-label="Aumentar zoom">
                +
              </button>
              <button type="button" onClick={resetZoom}>
                Reset
              </button>
            </div>
            <small>Zoom atual: {Math.round(scale * 100)}%</small>
          </div>

          <HierarchyPreview
            preview={mockLayoutPreview}
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
            scale={scale}
          />
        </section>

        <aside className="card">
          <h3>Detalhes da pessoa</h3>
          {!selectedPerson && <p>Clique em uma pessoa para visualizar os detalhes.</p>}
          {selectedPerson && relations && (
            <div className="mock-details">
              <p>
                <strong>Nome:</strong> {selectedPerson.name}
              </p>
              <p>
                <strong>Nascimento:</strong> {formatDate(selectedPerson.birth_date)}
              </p>
              <p>
                <strong>Tipo:</strong> {selectedPerson.role === "spouse" ? "Cônjuge" : "Linha familiar"}
              </p>
              <p>
                <strong>Richiedente:</strong> {selectedPerson.is_richiedente ? "Sim" : "Não"}
              </p>
              <p>
                <strong>Cônjuge(s):</strong> {formatNames(relations.spouses, byId)}
              </p>
              <p>
                <strong>Pai/Mãe:</strong> {formatNames(relations.parents, byId)}
              </p>
              <p>
                <strong>Filho(a)s:</strong> {formatNames(relations.children, byId)}
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
