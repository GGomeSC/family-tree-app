import { useEffect, useMemo, useRef, useState } from "react";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { mockLayoutPreview } from "../mocks/mockLayoutPreview";

const NODE_WIDTH = 220;
const PAD_X = 64;
const MIN_TREE_WIDTH = 860;
const MOBILE_BREAKPOINT = 900;

type MockPerson = (typeof mockLayoutPreview.persons)[number];

type ZoomMode = "auto" | "manual";

interface PersonRelations {
  spouses: number[];
  parents: number[];
  children: number[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function buildRelations(personId: number): PersonRelations {
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

function formatNames(ids: number[], byId: Map<number, MockPerson>) {
  if (!ids.length) return "Nenhum";
  return ids.map((id) => byId.get(id)?.name ?? `Pessoa #${id}`).join(", ");
}

function DetailsPanelContent({
  selectedPerson,
  relations,
  byId,
}: {
  selectedPerson: MockPerson | null;
  relations: PersonRelations | null;
  byId: Map<number, MockPerson>;
}) {
  if (!selectedPerson || !relations) {
    return <p className="mock-empty-state">Clique em uma pessoa para visualizar os detalhes.</p>;
  }

  return (
    <dl className="mock-details-grid">
      <div>
        <dt>Nome</dt>
        <dd>{selectedPerson.name}</dd>
      </div>
      <div>
        <dt>Nascimento</dt>
        <dd>{formatDate(selectedPerson.birth_date)}</dd>
      </div>
      <div>
        <dt>Tipo</dt>
        <dd>{selectedPerson.role === "spouse" ? "Cônjuge" : "Linha familiar"}</dd>
      </div>
      <div>
        <dt>Richiedente</dt>
        <dd>{selectedPerson.is_richiedente ? "Sim" : "Não"}</dd>
      </div>
      <div>
        <dt>Cônjuge(s)</dt>
        <dd>{formatNames(relations.spouses, byId)}</dd>
      </div>
      <div>
        <dt>Pai/Mãe</dt>
        <dd>{formatNames(relations.parents, byId)}</dd>
      </div>
      <div>
        <dt>Filho(a)s</dt>
        <dd>{formatNames(relations.children, byId)}</dd>
      </div>
    </dl>
  );
}

export function MockPreviewPage() {
  const treeHostRef = useRef<HTMLDivElement | null>(null);
  const initialSelection = mockLayoutPreview.persons.find((person) => person.is_richiedente)?.id ?? null;

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(initialSelection);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("auto");
  const [userZoomFactor, setUserZoomFactor] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  const byId = useMemo(
    () => new Map<number, MockPerson>(mockLayoutPreview.persons.map((person) => [person.id, person])),
    []
  );

  const selectedPerson = selectedPersonId ? byId.get(selectedPersonId) ?? null : null;
  const relations = useMemo(
    () => (selectedPersonId ? buildRelations(selectedPersonId) : null),
    [selectedPersonId]
  );

  const treeNaturalWidth = useMemo(() => {
    const maxX = mockLayoutPreview.persons.reduce((acc, person) => Math.max(acc, person.x), 0);
    return Math.max(maxX + NODE_WIDTH + PAD_X * 2, MIN_TREE_WIDTH);
  }, []);

  const autoScale = useMemo(() => {
    if (!availableWidth) return 1;
    return Math.min(1, availableWidth / treeNaturalWidth);
  }, [availableWidth, treeNaturalWidth]);

  const finalScale = useMemo(() => {
    if (zoomMode === "auto") {
      return clamp(autoScale, 0.55, 1.8);
    }

    return clamp(autoScale * userZoomFactor, 0.55, 1.8);
  }, [autoScale, userZoomFactor, zoomMode]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileDetailsOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const target = treeHostRef.current;
    if (!target) return;

    const updateWidth = () => {
      setAvailableWidth(target.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });
      observer.observe(target);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function handleSelectPerson(personId: number) {
    setSelectedPersonId(personId);

    if (isMobile) {
      setIsMobileDetailsOpen(true);
      return;
    }

    if (!detailsOpen) {
      setDetailsOpen(true);
    }
  }

  function changeZoom(delta: number) {
    setZoomMode("manual");
    setUserZoomFactor((current) => clamp(Number((current + delta).toFixed(2)), 0.2, 3));
  }

  function switchToAutoZoom() {
    setZoomMode("auto");
    setUserZoomFactor(1);
  }

  function resetZoom() {
    setZoomMode("manual");
    const nextFactor = autoScale > 0 ? 1 / autoScale : 1;
    setUserZoomFactor(clamp(Number(nextFactor.toFixed(2)), 0.2, 3));
  }

  return (
    <main className="container mock-wide">
      <header className="mock-page-header">
        <h2>Preview estático da árvore familiar</h2>
        <p>Visualização com dados fixos para demonstração comercial em ambiente 100% estático.</p>
      </header>

      <section className={`mock-shell ${detailsOpen ? "details-open" : "details-collapsed"}`}>
        <section className="card mock-tree-card">
          <div className="mock-controls">
            <div>
              <strong>Controles de visualização</strong>
              <small>
                Zoom atual: {Math.round(finalScale * 100)}% ({zoomMode === "auto" ? "Auto" : "Manual"})
              </small>
            </div>
            <div className="mock-controls-buttons">
              <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Diminuir zoom">
                -
              </button>
              <button type="button" onClick={() => changeZoom(0.1)} aria-label="Aumentar zoom">
                +
              </button>
              <button type="button" onClick={switchToAutoZoom}>
                Auto
              </button>
              <button type="button" onClick={resetZoom}>
                Reset
              </button>
              {isMobile && selectedPerson && (
                <button type="button" onClick={() => setIsMobileDetailsOpen(true)}>
                  Detalhes
                </button>
              )}
            </div>
          </div>

          <div ref={treeHostRef} className="mock-tree-stage">
            <HierarchyPreview
              preview={mockLayoutPreview}
              selectedPersonId={selectedPersonId}
              onSelectPerson={handleSelectPerson}
              scale={finalScale}
              overflowMode={zoomMode === "auto" ? "fit" : "scroll"}
            />
          </div>
        </section>

        {!isMobile && (
          <aside className={`card mock-details-panel ${detailsOpen ? "open" : "collapsed"}`}>
            <div className="mock-details-header">
              {detailsOpen ? (
                <>
                  <h3>Detalhes da pessoa</h3>
                  <button type="button" onClick={() => setDetailsOpen(false)}>
                    Ocultar
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setDetailsOpen(true)}>
                  Abrir
                </button>
              )}
            </div>

            {detailsOpen && <DetailsPanelContent selectedPerson={selectedPerson} relations={relations} byId={byId} />}
          </aside>
        )}
      </section>

      {isMobile && isMobileDetailsOpen && (
        <div className="mock-modal-backdrop" onClick={() => setIsMobileDetailsOpen(false)}>
          <section
            className="card mock-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mock-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mock-modal-header">
              <h3 id="mock-details-title">Detalhes da pessoa</h3>
              <button type="button" onClick={() => setIsMobileDetailsOpen(false)}>
                Fechar
              </button>
            </div>
            <DetailsPanelContent selectedPerson={selectedPerson} relations={relations} byId={byId} />
          </section>
        </div>
      )}
    </main>
  );
}
