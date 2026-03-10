import { useEffect, useMemo, useRef, useState } from "react";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { MockDetailsPanel } from "../components/mock/MockDetailsPanel";
import { MockNameMenu } from "../components/mock/MockNameMenu";
import {
  buildPersonRelations,
  sortLayoutPersons,
  toggleTargetPerson,
} from "../components/mock/mockPreviewUtils";
import { useClickOutside } from "../hooks/useClickOutside";
import { LegendLanguage, useMockPreviewControls } from "../hooks/useMockPreviewControls";
import { useIsMobile } from "../hooks/useIsMobile";
import { mockLayoutPreview } from "../mocks/mockLayoutPreview";

const LEGEND_LABELS: Record<LegendLanguage, { lineage: string; spouse: string }> = {
  pt: { lineage: "Linha de descendência", spouse: "Cônjuge" },
  it: { lineage: "Linea di discendenza", spouse: "Coniugi" },
};

export function MockPreviewPage() {
  const isMobile = useIsMobile();
  const treeHostRef = useRef<HTMLDivElement>(null);
  const nameMenuRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(9);
  const [targetIds, setTargetIds] = useState(() => mockLayoutPreview.persons.map((p) => p.id));
  const { state, finalScale, actions } = useMockPreviewControls(mockLayoutPreview.persons);
  const byId = useMemo(() => new Map(mockLayoutPreview.persons.map((p) => [p.id, p])), []);
  const candidates = useMemo(() => sortLayoutPersons(mockLayoutPreview.persons), []);
  const relationsById = useMemo(() => buildPersonRelations(mockLayoutPreview), []);

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

  const selectedPerson = selectedId ? byId.get(selectedId) ?? null : null;

  function handlePersonSelect(personId: number) {
    setSelectedId(personId);
    if (isMobile) {
      actions.openMobileDetails();
      return;
    }
    actions.openDetails();
  }

  return (
    <main className="container mock-wide">
      <header className="mock-page-header">
        <h2>Preview da árvore genealógica</h2>
        <p>Visualização com dados fixos para demonstração.</p>
      </header>

      <section className={`mock-shell ${state.detailsOpen ? "details-open" : "details-collapsed"}`}>
        <section className="card mock-tree-card">
          <div className="mock-controls">
            <div>
              <strong>Controles</strong>{" "}
              <small>
                Zoom: {Math.round(finalScale * 100)}% ({state.zoomMode})
              </small>
            </div>
            <div className="mock-controls-buttons">
              <button onClick={actions.zoomOut}>-</button>
              <button onClick={actions.zoomIn}>+</button>
              <button onClick={actions.resetZoom}>Auto</button>
              {isMobile && selectedId && <button onClick={actions.toggleMobileDetails}>Detalhes</button>}
            </div>
            <MockNameMenu
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

          <div ref={treeHostRef} className="mock-tree-stage">
            <div className="mock-preview-legend">
              {Object.entries(LEGEND_LABELS[state.lang]).map(([key, label]) => (
                <div key={key} className="mock-preview-legend-item">
                  <span className={`mock-preview-legend-swatch ${key}`} />
                  <span className="mock-preview-legend-text">{label}</span>
                </div>
              ))}
            </div>
            <HierarchyPreview
              preview={mockLayoutPreview}
              selectedPersonId={selectedId}
              onSelectPerson={handlePersonSelect}
              scale={finalScale}
              overflowMode={state.zoomMode === "auto" ? "fit" : "scroll"}
              nameDisplayMode={state.nameMode}
              nameTargetPersonIds={targetIds}
            />
          </div>
        </section>
        {!isMobile && (
          <MockDetailsPanel
            isMobile={false}
            isOpen={state.detailsOpen}
            person={selectedPerson}
            byId={byId}
            relationsById={relationsById}
            onToggle={actions.toggleDetails}
            onCloseMobile={actions.closeMobileDetails}
          />
        )}
      </section>
      {isMobile && (
        <MockDetailsPanel
          isMobile
          isOpen={state.mobileDetailsOpen}
          person={selectedPerson}
          byId={byId}
          relationsById={relationsById}
          onToggle={actions.toggleDetails}
          onCloseMobile={actions.closeMobileDetails}
        />
      )}
    </main>
  );
}
