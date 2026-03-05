import { useEffect, useMemo, useRef, useState } from "react";
import { HierarchyPreview } from "../components/HierarchyPreview";
import { mockLayoutPreview } from "../mocks/mockLayoutPreview";
import { LayoutPerson } from "../types";
import { LAYOUT } from "../config/layout";
import { formatDate, NameDisplayMode } from "../utils/formatters";

type ZoomMode = "auto" | "manual";
type LegendLanguage = "pt" | "it";

const LEGEND_LABELS: Record<LegendLanguage, { lineage: string; spouse: string }> = {
  pt: { lineage: "Linha de descendência", spouse: "Cônjuge" },
  it: { lineage: "Linea di discendenza", spouse: "Coniugi" },
};

interface PersonRelations { spouses: number[]; parents: number[]; children: number[]; }

// --- Hooks ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);
  useEffect(() => {
    const cb = () => setIsMobile(window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  }, []);
  return isMobile;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handle = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, cb]);
}

// --- Logic ---
const relationsMap = (() => {
  const map = new Map<number, PersonRelations>();
  const get = (id: number) => {
    if (!map.has(id)) map.set(id, { spouses: [], parents: [], children: [] });
    return map.get(id)!;
  };

  mockLayoutPreview.unions.forEach((u) => {
    get(u.partner_a_person_id).spouses.push(u.partner_b_person_id);
    get(u.partner_b_person_id).spouses.push(u.partner_a_person_id);
  });

  mockLayoutPreview.edges.forEach((e) => {
    const to = get(e.to_id);
    if (e.via_union_id) {
      const u = mockLayoutPreview.unions.find((item) => item.id === e.via_union_id);
      if (u) {
        to.parents.push(u.partner_a_person_id, u.partner_b_person_id);
        get(u.partner_a_person_id).children.push(e.to_id);
        get(u.partner_b_person_id).children.push(e.to_id);
      }
    } else {
      to.parents.push(e.from_id);
      get(e.from_id).children.push(e.to_id);
    }
  });

  map.forEach((v) => {
    v.spouses = [...new Set(v.spouses)];
    v.parents = [...new Set(v.parents)];
    v.children = [...new Set(v.children)];
  });
  return map;
})();

function DetailsPanelContent({ person, byId }: { person: LayoutPerson | null; byId: Map<number, LayoutPerson> }) {
  if (!person) return <p className="mock-empty-state">Clique em uma pessoa para visualizar os detalhes.</p>;

  const rels = relationsMap.get(person.id);
  const fmt = (ids?: number[]) => (!ids?.length ? "Nenhum" : ids.map((id) => byId.get(id)?.name ?? `#${id}`).join(", "));

  const fields = [
    { label: "Nome", val: person.name },
    { label: "Nascimento", val: formatDate(person.birth_date) },
    { label: "Tipo", val: person.role === "spouse" ? "Cônjuge" : "Linha familiar" },
    { label: "Richiedente", val: person.is_richiedente ? "Sim" : "Não" },
    { label: "Cônjuge(s)", val: fmt(rels?.spouses) },
    { label: "Pai/Mãe", val: fmt(rels?.parents) },
    { label: "Filho(a)s", val: fmt(rels?.children) },
  ];

  return (
    <dl className="mock-details-grid">
      {fields.map((f) => (
        <div key={f.label}><dt>{f.label}</dt><dd>{f.val}</dd></div>
      ))}
    </dl>
  );
}

export function MockPreviewPage() {
  const isMobile = useIsMobile();
  const treeHostRef = useRef<HTMLDivElement>(null);
  const nameMenuRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<number | null>(9);
  const [ui, setUi] = useState({
    detailsOpen: true, mobileDetailsOpen: false, zoomMode: "auto" as ZoomMode,
    nameMode: "first-first" as NameDisplayMode, isNameMenuOpen: false,
    lang: "pt" as LegendLanguage, zoomFactor: 1, width: 0,
    isApplyToOpen: false,
  });

  const [targetIds, setTargetIds] = useState(() => mockLayoutPreview.persons.map((p) => p.id));
  useClickOutside(nameMenuRef, () => setUi((prev) => ({ ...prev, isNameMenuOpen: false })));

  const byId = useMemo(() => new Map(mockLayoutPreview.persons.map((p) => [p.id, p])), []);
  const candidates = useMemo(() => [...mockLayoutPreview.persons].sort((a, b) => a.y - b.y || a.x - b.x), []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => setUi((prev) => ({ ...prev, width: entries[0].contentRect.width })));
    if (treeHostRef.current) observer.observe(treeHostRef.current);
    return () => observer.disconnect();
  }, []);

  const finalScale = useMemo(() => {
    const maxX = mockLayoutPreview.persons.reduce((acc, p) => Math.max(acc, p.x), 0);
    const natural = Math.max(maxX + LAYOUT.NODE_WIDTH + LAYOUT.PAD_X * 2, LAYOUT.MIN_TREE_WIDTH);
    const auto = ui.width ? Math.min(1, ui.width / natural) : 1;
    const clamp = (v: number) => Math.min(1.8, Math.max(0.55, v));
    return clamp(ui.zoomMode === "auto" ? auto : auto * ui.zoomFactor);
  }, [ui.width, ui.zoomFactor, ui.zoomMode]);

  const toggle = (key: keyof typeof ui) => setUi((p) => ({ ...p, [key]: !p[key] }));

  return (
    <main className="container mock-wide">
      <header className="mock-page-header">
        <h2>Preview estático da árvore familiar</h2>
        <p>Visualização com dados fixos para demonstração comercial.</p>
      </header>

      <section className={`mock-shell ${ui.detailsOpen ? "details-open" : "details-collapsed"}`}>
        <section className="card mock-tree-card">
          <div className="mock-controls">
            <div><strong>Controles</strong> <small>Zoom: {Math.round(finalScale * 100)}% ({ui.zoomMode})</small></div>
            <div className="mock-controls-buttons">
              <button onClick={() => setUi((p) => ({ ...p, zoomMode: "manual", zoomFactor: Math.max(0.2, p.zoomFactor - 0.1) }))}>-</button>
              <button onClick={() => setUi((p) => ({ ...p, zoomMode: "manual", zoomFactor: Math.min(3, p.zoomFactor + 0.1) }))}>+</button>
              <button onClick={() => setUi((p) => ({ ...p, zoomMode: "auto", zoomFactor: 1 }))}>Auto</button>
              {isMobile && selectedId && <button onClick={() => toggle("mobileDetailsOpen")}>Detalhes</button>}
            </div>
            <div className="mock-name-menu" ref={nameMenuRef}>
              <button className="mock-name-menu-trigger" onClick={() => toggle("isNameMenuOpen")}>≡</button>
              {ui.isNameMenuOpen && (
                <div className="mock-name-menu-panel">
                  {/* Section: Format */}
                  <section className="mock-name-menu-section">
                    <span className="mock-name-menu-label">Formato</span>
                    <button
                      className={`mock-name-toggle-track ${ui.nameMode === "last-first" ? "is-last-first" : ""}`}
                      onClick={() => setUi((p) => ({ ...p, nameMode: p.nameMode === "last-first" ? "first-first" : "last-first" }))}
                    >
                      <span className="mock-name-toggle-thumb" />
                      <span className="mock-name-toggle-option">Nome</span>
                      <span className="mock-name-toggle-option">Sobrenome</span>
                    </button>
                  </section>

                  {/* Section: Apply To (Expandable) */}
                  <section className="mock-name-menu-section">
                    <button className="mock-name-menu-expandable-trigger" onClick={() => toggle("isApplyToOpen")}>
                      <span className="mock-name-menu-label">Aplicar em</span>
                      <span>{ui.isApplyToOpen ? "▲" : "▼"}</span>
                    </button>
                    {ui.isApplyToOpen && (
                      <div className="mock-name-node-list">
                        {candidates.map((p) => (
                          <label key={p.id} className="mock-name-node-item">
                            <input type="checkbox" checked={targetIds.includes(p.id)} onChange={() => setTargetIds((curr) => curr.includes(p.id) ? curr.filter((i) => i !== p.id) : [...curr, p.id])} />
                            <span>{p.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Section: Language */}
                  <section className="mock-name-menu-section">
                    <span className="mock-name-menu-label">Idioma</span>
                    <button
                      className={`mock-name-toggle-track ${ui.lang === "it" ? "is-it" : ""}`}
                      onClick={() => setUi((p) => ({ ...p, lang: p.lang === "it" ? "pt" : "it" }))}
                    >
                      <span className="mock-name-toggle-thumb" />
                      <span className="mock-name-toggle-option">PT</span>
                      <span className="mock-name-toggle-option">IT</span>
                    </button>
                  </section>
                </div>
              )}
            </div>
          </div>

          <div ref={treeHostRef} className="mock-tree-stage">
            <div className="mock-preview-legend">
              {Object.entries(LEGEND_LABELS[ui.lang]).map(([k, v]) => (
                <div key={k} className="mock-preview-legend-item"><span className={`mock-preview-legend-swatch ${k}`} /><span className="mock-preview-legend-text">{v}</span></div>
              ))}
            </div>
            <HierarchyPreview
              preview={mockLayoutPreview} selectedPersonId={selectedId}
              onSelectPerson={(id) => { setSelectedId(id); if (isMobile) toggle("mobileDetailsOpen"); else if (!ui.detailsOpen) toggle("detailsOpen"); }}
              scale={finalScale} overflowMode={ui.zoomMode === "auto" ? "fit" : "scroll"}
              nameDisplayMode={ui.nameMode} nameTargetPersonIds={targetIds}
            />
          </div>
        </section>

        {!isMobile && (
          <aside className={`card mock-details-panel ${ui.detailsOpen ? "open" : "collapsed"}`}>
            <div className="mock-details-header">
              {ui.detailsOpen && <h3>Detalhes</h3>}
              <button onClick={() => toggle("detailsOpen")}>{ui.detailsOpen ? "Ocultar" : "Abrir"}</button>
            </div>
            {ui.detailsOpen && <DetailsPanelContent person={selectedId ? byId.get(selectedId) ?? null : null} byId={byId} />}
          </aside>
        )}
      </section>

      {isMobile && ui.mobileDetailsOpen && (
        <div className="mock-modal-backdrop" onClick={() => toggle("mobileDetailsOpen")}>
          <section className="card mock-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mock-modal-header"><h3>Detalhes</h3><button onClick={() => toggle("mobileDetailsOpen")}>Fechar</button></div>
            <DetailsPanelContent person={selectedId ? byId.get(selectedId) ?? null : null} byId={byId} />
          </section>
        </div>
      )}
    </main>
  );
}
