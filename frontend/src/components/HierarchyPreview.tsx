import { LayoutEdge, LayoutPerson, LayoutPreview, LayoutUnion } from "../types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const PAD_X = 64;
const PAD_Y = 44;

function nodeCenterTop(node: LayoutPerson) {
  return { x: node.x + NODE_WIDTH / 2 + PAD_X, y: node.y + PAD_Y };
}

function nodeCenterBottom(node: LayoutPerson) {
  return { x: node.x + NODE_WIDTH / 2 + PAD_X, y: node.y + NODE_HEIGHT + PAD_Y };
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function edgeKey(edge: LayoutEdge) {
  return `${edge.from_id}-${edge.to_id}-${edge.via_union_id ?? "direct"}`;
}

interface HierarchyPreviewProps {
  preview: LayoutPreview;
  selectedPersonId?: number | null;
  onSelectPerson?: (personId: number) => void;
  scale?: number;
  overflowMode?: "scroll" | "fit";
}

export function HierarchyPreview({
  preview,
  selectedPersonId = null,
  onSelectPerson,
  scale = 1,
  overflowMode = "scroll",
}: HierarchyPreviewProps) {
  const byId = new Map<number, LayoutPerson>(preview.persons.map((p) => [p.id, p]));
  const unionsById = new Map<number, LayoutUnion>(preview.unions.map((u) => [u.id, u]));

  const maxX = preview.persons.reduce((acc, person) => Math.max(acc, person.x), 0);
  const maxY = preview.persons.reduce((acc, person) => Math.max(acc, person.y), 0);

  const width = Math.max(maxX + NODE_WIDTH + PAD_X * 2, 860);
  const height = Math.max(maxY + NODE_HEIGHT + PAD_Y * 2, 260);
  const normalizedScale = Math.max(0.5, Math.min(2, scale));
  const scaledWidth = Math.round(width * normalizedScale);
  const scaledHeight = Math.round(height * normalizedScale);

  return (
    <div className={`hierarchy-scroll ${overflowMode === "fit" ? "hierarchy-scroll-fit" : ""}`}>
      <div className="hierarchy-scale-shell" style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
        <div
          className="hierarchy-canvas"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${normalizedScale})`,
            transformOrigin: "top left",
          }}
        >
          <svg className="hierarchy-lines" viewBox={`0 0 ${width} ${height}`}>
            {preview.unions.map((union) => {
              const a = byId.get(union.partner_a_person_id);
              const b = byId.get(union.partner_b_person_id);
              if (!a || !b) return null;

              const aCenter = nodeCenterTop(a);
              const bCenter = nodeCenterTop(b);
              const midX = (aCenter.x + bCenter.x) / 2;
              const midY = aCenter.y + 16;

              return (
                <g key={`union-${union.id}`}>
                  <line
                    x1={aCenter.x}
                    y1={aCenter.y + 12}
                    x2={bCenter.x}
                    y2={bCenter.y + 12}
                    className="line spouse"
                  />
                  {union.marriage_date && (
                    <text x={midX} y={midY - 6} className="marriage-date" textAnchor="middle">
                      {formatDate(union.marriage_date)}
                    </text>
                  )}
                </g>
              );
            })}

            {preview.edges.map((edge) => {
              const from = byId.get(edge.from_id);
              const to = byId.get(edge.to_id);
              if (!from || !to) return null;

              const toTop = nodeCenterTop(to);

              if (edge.via_union_id) {
                const union = unionsById.get(edge.via_union_id);
                if (!union) return null;
                const partnerA = byId.get(union.partner_a_person_id);
                const partnerB = byId.get(union.partner_b_person_id);
                if (!partnerA || !partnerB) return null;

                const aCenter = nodeCenterTop(partnerA);
                const bCenter = nodeCenterTop(partnerB);
                const midX = (aCenter.x + bCenter.x) / 2;
                const startY = aCenter.y + 12;
                const bridgeY = toTop.y - 18;

                return (
                  <g key={`edge-${edgeKey(edge)}`}>
                    <line x1={midX} y1={startY} x2={midX} y2={bridgeY} className="line lineage" />
                    <line x1={midX} y1={bridgeY} x2={toTop.x} y2={bridgeY} className="line lineage" />
                    <line x1={toTop.x} y1={bridgeY} x2={toTop.x} y2={toTop.y} className="line lineage" />
                  </g>
                );
              }

              const fromBottom = nodeCenterBottom(from);
              return (
                <line
                  key={`edge-${edgeKey(edge)}`}
                  x1={fromBottom.x}
                  y1={fromBottom.y}
                  x2={toTop.x}
                  y2={toTop.y}
                  className="line lineage"
                />
              );
            })}
          </svg>

          {preview.persons.map((person) => (
            <article
              key={person.id}
              className={`hierarchy-node ${person.role} ${
                selectedPersonId === person.id ? "selected" : ""
              } ${onSelectPerson ? "clickable" : ""}`}
              style={{ left: `${person.x + PAD_X}px`, top: `${person.y + PAD_Y}px` }}
              onClick={onSelectPerson ? () => onSelectPerson(person.id) : undefined}
              onKeyDown={
                onSelectPerson
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectPerson(person.id);
                      }
                    }
                  : undefined
              }
              role={onSelectPerson ? "button" : undefined}
              tabIndex={onSelectPerson ? 0 : undefined}
              aria-pressed={onSelectPerson ? selectedPersonId === person.id : undefined}
            >
              <div className="name">{person.name}</div>
              <div className="birth">{formatDate(person.birth_date)}</div>
              {person.is_richiedente && <div className="badge">Richiedente</div>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
