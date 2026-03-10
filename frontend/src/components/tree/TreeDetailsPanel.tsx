import { useState, useEffect } from "react";
import { LayoutPerson, CreatePersonRequest } from "../../types";

interface TreeDetailsPanelProps {
  person: LayoutPerson | null;
  isOpen: boolean;
  isMobile: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  byId: Map<number, LayoutPerson>;
  relationsById: Map<
    number,
    {
      parents: number[];
      spouses: number[];
      children: number[];
    }
  >;
  onAddVirtual: (type: "parent" | "sibling" | "partner" | "child", targetId: number) => void;
  onSaveVirtual: (vId: number, data: CreatePersonRequest) => Promise<boolean>;
  onDelete: (personId: number) => Promise<boolean>;
}

export function TreeDetailsPanel({
  person,
  isOpen,
  isMobile,
  onToggle,
  onCloseMobile,
  byId,
  relationsById,
  onAddVirtual,
  onSaveVirtual,
  onDelete,
}: TreeDetailsPanelProps) {
  if (isMobile) {
    if (!isOpen || !person) return null;

    return (
      <div className="tree-modal-backdrop" onClick={onCloseMobile}>
        <section className="card tree-details-modal" onClick={(e) => e.stopPropagation()}>
          <header className="tree-modal-header">
            <h3>Detalhes da Pessoa</h3>
            <button onClick={onCloseMobile}>Fechar</button>
          </header>
          <DetailsContent
            person={person}
            byId={byId}
            relationsById={relationsById}
            onAddVirtual={onAddVirtual}
            onSaveVirtual={onSaveVirtual}
            onDelete={onDelete}
          />
        </section>
      </div>
    );
  }

  return (
    <section className={`card tree-details-panel ${isOpen ? "expanded" : "collapsed"}`}>
      <header className="tree-details-header">
        {isOpen && <h3>Detalhes</h3>}
        <button onClick={onToggle}>{isOpen ? "»" : "«"}</button>
      </header>
      {isOpen && (
        <>
          {!person ? (
            <p className="tree-empty-state">Selecione uma pessoa para ver detalhes.</p>
          ) : (
            <DetailsContent
              person={person}
              byId={byId}
              relationsById={relationsById}
              onAddVirtual={onAddVirtual}
              onSaveVirtual={onSaveVirtual}
              onDelete={onDelete}
            />
          )}
        </>
      )}
    </section>
  );
}

function DetailsContent({
  person,
  byId,
  relationsById,
  onAddVirtual,
  onSaveVirtual,
  onDelete,
}: {
  person: LayoutPerson;
  byId: Map<number, LayoutPerson>;
  relationsById: Map<number, { parents: number[]; spouses: number[]; children: number[] }>;
  onAddVirtual: (type: "parent" | "sibling" | "partner" | "child", targetId: number) => void;
  onSaveVirtual: (vId: number, data: CreatePersonRequest) => Promise<boolean>;
  onDelete: (personId: number) => Promise<boolean>;
}) {
  const relations = relationsById.get(person.id);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreatePersonRequest>({
    full_name: person.name,
    birth_date: person.birth_date || "",
    is_richiedente: person.is_richiedente,
  });

  useEffect(() => {
    setFormData({
      full_name: person.name,
      birth_date: person.birth_date || "",
      is_richiedente: person.is_richiedente,
    });
    setIsEditing(person.is_virtual || false);
  }, [person]);

  async function handleSave() {
    const success = await onSaveVirtual(person.id, formData);
    if (success) setIsEditing(false);
  }

  async function handleDelete() {
    if (!person.is_virtual) {
      if (!window.confirm(`Tem certeza que deseja excluir ${person.name}? Esta ação não pode ser desfeita.`)) {
        return;
      }
    }
    await onDelete(person.id);
  }

  return (
    <div className="tree-details-content">
      {isEditing ? (
        <div className="tree-details-form">
          <label>
            Nome Completo
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </label>
          <label>
            Data de Nascimento
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={formData.is_richiedente}
              onChange={(e) => setFormData({ ...formData, is_richiedente: e.target.checked })}
            />
            É o requerente?
          </label>
          <button className="primary" onClick={handleSave}>
            Salvar Pessoa
          </button>
          {!person.is_virtual && (
            <button onClick={() => setIsEditing(false)}>Cancelar</button>
          )}
          <button className="danger" onClick={handleDelete} style={{ marginTop: "12px", background: "#b50000" }}>Excluir Draft</button>
        </div>
      ) : (
        <dl className="tree-details-grid">
          <div>
            <dt>Nome</dt>
            <dd>{person.name}</dd>
          </div>
          <div>
            <dt>Nascimento</dt>
            <dd>{person.birth_date || "Não informada"}</dd>
          </div>
          {relations && (
            <>
              {relations.parents.length > 0 && (
                <div>
                  <dt>Pais</dt>
                  <dd>{relations.parents.map((id) => byId.get(id)?.name).join(", ")}</dd>
                </div>
              )}
              {relations.spouses.length > 0 && (
                <div>
                  <dt>Cônjuges</dt>
                  <dd>{relations.spouses.map((id) => byId.get(id)?.name).join(", ")}</dd>
                </div>
              )}
              {relations.children.length > 0 && (
                <div>
                  <dt>Filhos</dt>
                  <dd>{relations.children.map((id) => byId.get(id)?.name).join(", ")}</dd>
                </div>
              )}
            </>
          )}
          <div className="tree-details-actions">
            <button onClick={() => onAddVirtual("parent", person.id)}>Add Pais</button>
            <button onClick={() => onAddVirtual("sibling", person.id)}>Add Irmão</button>
            <button onClick={() => onAddVirtual("partner", person.id)}>Add Cônjuge</button>
            <button onClick={() => onAddVirtual("child", person.id)}>Add Filho</button>
            <button className="primary" onClick={() => setIsEditing(true)}>Editar Detalhes</button>
            <button className="danger" onClick={handleDelete} style={{ background: "#cf4b4b" }}>Excluir</button>
          </div>
        </dl>
      )}
    </div>
  );
}
