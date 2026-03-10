import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { TreeDetailsPanel } from "../components/tree/TreeDetailsPanel";
import { TreeNameMenu } from "../components/tree/TreeNameMenu";
import { useFamilyEditorData } from "../hooks/useFamilyEditorData";
import { useTreeControls } from "../hooks/useTreeControls";
import { useIsMobile } from "../hooks/useIsMobile";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  buildPersonRelations,
  sortLayoutPersons,
  toggleTargetPerson,
} from "../utils/treeLayoutUtils";

const LEGEND_LABELS = {
  pt: { lineage: "Linha de descendência", spouse: "Cônjuge" },
  it: { lineage: "Linea di discendenza", spouse: "Coniugi" },
};

interface FamilyEditorPageProps {
  setHeaderAction: (action: React.ReactNode) => void;
}

export function FamilyEditorPage({ setHeaderAction }: FamilyEditorPageProps) {
  const { familyId } = useParams();
  const id = Number(familyId);
  const isMobile = useIsMobile();
  const treeHostRef = useRef<HTMLDivElement>(null);
  const nameMenuRef = useRef<HTMLDivElement>(null);

  const {
    error,
    exports,
    preview,
    exportPdf,
    addVirtualEntity,
    saveVirtualPerson,
    createPerson,
    deletePerson,
  } = useFamilyEditorData(id);

  const personsForControls = useMemo(() => preview?.persons ?? [], [preview?.persons]);
  const { state, finalScale, actions } = useTreeControls(personsForControls);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [targetIds, setTargetIds] = useState<number[]>([]);

  const byId = useMemo(
    () => new Map((preview?.persons ?? []).map((p) => [p.id, p])),
    [preview?.persons]
  );
  const candidates = useMemo(
    () => sortLayoutPersons(preview?.persons ?? []),
    [preview?.persons]
  );
  const relationsById = useMemo(
    () => (preview ? buildPersonRelations(preview) : new Map()),
    [preview]
  );

  useClickOutside(nameMenuRef, actions.closeNameMenu);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry) {
        actions.setWidth(firstEntry.contentRect.width);
      }
    });
    if (treeHostRef.current) {
      observer.observe(treeHostRef.current);
    }
    return () => observer.disconnect();
  }, [actions]);

  useEffect(() => {
    if (preview?.persons && targetIds.length === 0) {
      setTargetIds(preview.persons.map((p) => p.id));
    }
  }, [preview?.persons, targetIds.length]);

  useEffect(() => {
    setHeaderAction(
      <button type="button" className="btn-header-action" onClick={() => void exportPdf()}>
        Gerar PDF
      </button>
    );
    return () => setHeaderAction(null);
  }, [exportPdf, setHeaderAction]);

  const selectedPerson = selectedId ? byId.get(selectedId) ?? null : null;

  function handlePersonSelect(personId: number) {
    setSelectedId(personId);
    if (isMobile) {
      actions.openMobileDetails();
      return;
    }
    actions.openDetails();
  }

  function handleAddFirstPerson() {
    void createPerson({ full_name: "Nova Pessoa", birth_date: "", is_richiedente: true });
  }

  return (
    <main className="container tree-wide">
      <header className="tree-page-header">
        <h2>Editor da Família #{id}</h2>
        {error && <p className="error">{error}</p>}
      </header>

      {exports.length > 0 && (
        <section className="card exports-mini-card">
          <h4>Exportações Recentes</h4>
          <ul className="list-horizontal">
            {exports.slice(0, 5).map((item) => (
              <li key={item.id}>
                <a href={api.downloadExportUrl(item.id)} target="_blank" rel="noreferrer">
                  #{item.id} ({new Date(item.created_at).toLocaleDateString("pt-BR")})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`tree-shell ${state.detailsOpen ? "details-open" : "details-collapsed"}`}>
        <section className="card tree-card">
          <div className="tree-controls">
            <div>
              <strong>Preview (layout automático)</strong>{" "}
              <small>
                Zoom: {Math.round(finalScale * 100)}% ({state.zoomMode})
              </small>
            </div>
            <div className="tree-controls-buttons">
              <button onClick={actions.zoomOut}>-</button>
              <button onClick={actions.zoomIn}>+</button>
              <button onClick={actions.resetZoom}>Auto</button>
              {isMobile && selectedId && <button onClick={actions.toggleMobileDetails}>Detalhes</button>}
            </div>
            <TreeNameMenu
              menuRef={nameMenuRef}
              isOpen={state.isNameMenuOpen}
              isApplyToOpen={state.isApplyToOpen}
              nameMode={state.nameMode}
              lang={state.lang}
              candidates={candidates}
              targetIds={targetIds}
              onToggleMenu={actions.toggleNameMenu}
              onToggleApplyTo={actions.toggleApplyTo}
              onToggleNameMode={actions.toggleNameMode}
              onToggleLanguage={actions.toggleLanguage}
              onToggleTargetId={(personId) =>
                setTargetIds((currentIds) => toggleTargetPerson(currentIds, personId))
              }
            />
          </div>

          <div ref={treeHostRef} className="tree-stage">
            <div className="tree-legend">
              {Object.entries(LEGEND_LABELS[state.lang]).map(([key, label]) => (
                <div key={key} className="tree-legend-item">
                  <span className={`tree-legend-swatch ${key}`} />
                  <span className="tree-legend-text">{label}</span>
                </div>
              ))}
            </div>
            {!preview || preview.persons.length === 0 ? (
              <div className="tree-empty-state">
                <p>A família ainda não possui pessoas cadastradas.</p>
                <button style={{ width: "auto" }} onClick={handleAddFirstPerson}>Começar Árvore</button>
              </div>
            ) : (
              <HierarchyPreview
                preview={preview}
                selectedPersonId={selectedId}
                onSelectPerson={handlePersonSelect}
                scale={finalScale}
                overflowMode={state.zoomMode === "auto" ? "fit" : "scroll"}
                nameDisplayMode={state.nameMode}
                nameTargetPersonIds={targetIds}
              />
            )}
          </div>
        </section>

        {!isMobile && (
          <TreeDetailsPanel
            isMobile={false}
            isOpen={state.detailsOpen}
            person={selectedPerson}
            byId={byId}
            relationsById={relationsById}
            onToggle={actions.toggleDetails}
            onCloseMobile={actions.closeMobileDetails}
            onAddVirtual={addVirtualEntity}
            onSaveVirtual={saveVirtualPerson}
            onDelete={deletePerson}
          />
        )}
      </section>

      {isMobile && (
        <TreeDetailsPanel
          isMobile
          isOpen={state.mobileDetailsOpen}
          person={selectedPerson}
          byId={byId}
          relationsById={relationsById}
          onToggle={actions.toggleDetails}
          onCloseMobile={actions.closeMobileDetails}
          onAddVirtual={addVirtualEntity}
          onSaveVirtual={saveVirtualPerson}
          onDelete={deletePerson}
        />
      )}
    </main>
  );
}
