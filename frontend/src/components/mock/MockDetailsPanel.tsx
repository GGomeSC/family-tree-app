import { LayoutPerson } from "../../types";
import { formatDate } from "../../utils/formatters";
import { PersonRelations } from "./mockPreviewUtils";

interface MockDetailsPanelProps {
  isMobile: boolean;
  isOpen: boolean;
  person: LayoutPerson | null;
  byId: Map<number, LayoutPerson>;
  relationsById: Map<number, PersonRelations>;
  onToggle: () => void;
  onCloseMobile: () => void;
}

function MockDetailsContent({
  person,
  byId,
  relationsById,
}: {
  person: LayoutPerson | null;
  byId: Map<number, LayoutPerson>;
  relationsById: Map<number, PersonRelations>;
}) {
  if (!person) {
    return <p className="mock-empty-state">Clique em uma pessoa para visualizar os detalhes.</p>;
  }

  const relations = relationsById.get(person.id);
  const formatNames = (ids?: number[]) =>
    !ids?.length ? "Nenhum" : ids.map((id) => byId.get(id)?.name ?? `#${id}`).join(", ");

  const fields = [
    { label: "Nome", value: person.name },
    { label: "Nascimento", value: formatDate(person.birth_date) },
    { label: "Tipo", value: person.role === "spouse" ? "Cônjuge" : "Linhagem" },
    { label: "Richiedente", value: person.is_richiedente ? "Sim" : "Não" },
    { label: "Cônjuge(s)", value: formatNames(relations?.spouses) },
    { label: "Pai/Mãe", value: formatNames(relations?.parents) },
    { label: "Filho(a)s", value: formatNames(relations?.children) },
  ];

  return (
    <dl className="mock-details-grid">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MockDetailsPanel({
  isMobile,
  isOpen,
  person,
  byId,
  relationsById,
  onToggle,
  onCloseMobile,
}: MockDetailsPanelProps) {
  if (isMobile) {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="mock-modal-backdrop" onClick={onCloseMobile}>
        <section className="card mock-details-modal" onClick={(event) => event.stopPropagation()}>
          <div className="mock-modal-header">
            <h3>Detalhes</h3>
            <button onClick={onCloseMobile}>Fechar</button>
          </div>
          <MockDetailsContent person={person} byId={byId} relationsById={relationsById} />
        </section>
      </div>
    );
  }

  return (
    <aside className={`card mock-details-panel ${isOpen ? "open" : "collapsed"}`}>
      <div className="mock-details-header">
        {isOpen && <h3>Detalhes</h3>}
        <button onClick={onToggle}>{isOpen ? "Ocultar" : "Abrir"}</button>
      </div>
      {isOpen && <MockDetailsContent person={person} byId={byId} relationsById={relationsById} />}
    </aside>
  );
}
