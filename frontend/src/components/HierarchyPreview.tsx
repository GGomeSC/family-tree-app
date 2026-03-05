import { LayoutEdge, LayoutPerson, LayoutPreview, LayoutUnion } from "../types";
import { LAYOUT } from "../config/layout";
import { formatDate, formatNodeName, NameDisplayMode } from "../utils/formatters";

const { NODE_WIDTH, NODE_HEIGHT, PAD_X, PAD_Y } = LAYOUT;

const nodeCenterTop = (node: LayoutPerson) => ({ x: node.x + NODE_WIDTH / 2 + PAD_X, y: node.y + PAD_Y });
const nodeCenterBottom = (node: LayoutPerson) => ({ x: node.x + NODE_WIDTH / 2 + PAD_X, y: node.y + NODE_HEIGHT + PAD_Y });
const edgeKey = (e: LayoutEdge) => `${e.from_id}-${e.to_id}-${e.via_union_id ?? "direct"}`;

interface HierarchyPreviewProps {
  preview: LayoutPreview;
  selectedPersonId?: number | null;
  onSelectPerson?: (personId: number) => void;
  scale?: number;
  overflowMode?: "scroll" | "fit";
  nameDisplayMode?: NameDisplayMode;
  nameTargetPersonIds?: number[];
}

export function HierarchyPreview({
  preview,
  selectedPersonId = null,
  onSelectPerson,
  scale = 1,
  overflowMode = "scroll",
  nameDisplayMode = "first-first",
  nameTargetPersonIds = [],
}: HierarchyPreviewProps) {
  const byId = new Map(preview.persons.map((p) => [p.id, p]));
  const unionsById = new Map(preview.unions.map((u) => [u.id, u]));
  const targetSet = new Set(nameTargetPersonIds);

  const maxX = preview.persons.reduce((acc, p) => Math.max(acc, p.x), 0);
  const maxY = preview.persons.reduce((acc, p) => Math.max(acc, p.y), 0);

  const width = Math.max(maxX + NODE_WIDTH + PAD_X * 2, LAYOUT.MIN_TREE_WIDTH);
  const height = Math.max(maxY + NODE_HEIGHT + PAD_Y * 2, 260);
  const s = Math.max(0.5, Math.min(2, scale));

  return (
    <div className={`hierarchy-scroll ${overflowMode === "fit" ? "hierarchy-scroll-fit" : ""}`}>
      <div className="hierarchy-scale-shell" style={{ width: `${Math.round(width * s)}px`, height: `${Math.round(height * s)}px` }}>
        <div
          className="hierarchy-canvas"
          style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${s})`, transformOrigin: "top left" }}
        >
          <svg className="hierarchy-lines" viewBox={`0 0 ${width} ${height}`}>
            {preview.unions.map((u) => {
              const [a, b] = [byId.get(u.partner_a_person_id), byId.get(u.partner_b_person_id)];
              if (!a || !b) return null;
              const [ac, bc] = [nodeCenterTop(a), nodeCenterTop(b)];
              return (
                <g key={`union-${u.id}`}>
                  <line x1={ac.x} y1={ac.y + 12} x2={bc.x} y2={bc.y + 12} className="line spouse" />
                  {u.marriage_date && (
                    <text x={(ac.x + bc.x) / 2} y={ac.y + 10} className="marriage-date" textAnchor="middle">
                      {formatDate(u.marriage_date)}
                    </text>
                  )}
                </g>
              );
            })}

            {preview.edges.map((e) => {
              const to = byId.get(e.to_id);
              if (!to) return null;
              const toTop = nodeCenterTop(to);

              if (e.via_union_id) {
                const u = unionsById.get(e.via_union_id);
                const [pA, pB] = [byId.get(u?.partner_a_person_id ?? -1), byId.get(u?.partner_b_person_id ?? -1)];
                if (!pA || !pB) return null;
                const midX = (nodeCenterTop(pA).x + nodeCenterTop(pB).x) / 2;
                const midY = nodeCenterTop(pA).y + 12;
                const bridgeY = toTop.y - 18;
                return (
                  <path
                    key={`edge-${edgeKey(e)}`}
                    d={`M ${midX} ${midY} V ${bridgeY} H ${toTop.x} V ${toTop.y}`}
                    className="line lineage"
                    fill="none"
                  />
                );
              }

              const from = byId.get(e.from_id);
              if (!from) return null;
              const fb = nodeCenterBottom(from);
              return <line key={`edge-${edgeKey(e)}`} x1={fb.x} y1={fb.y} x2={toTop.x} y2={toTop.y} className="line lineage" />;
            })}
          </svg>

          {preview.persons.map((p) => {
            const fmt = formatNodeName(p.name, targetSet.has(p.id) ? nameDisplayMode : "first-first");
            return (
              <article
                key={p.id}
                className={`hierarchy-node ${p.role} ${selectedPersonId === p.id ? "selected" : ""} ${onSelectPerson ? "clickable" : ""}`}
                style={{ left: `${p.x + PAD_X}px`, top: `${p.y + PAD_Y}px` }}
                onClick={onSelectPerson ? () => onSelectPerson(p.id) : undefined}
                role={onSelectPerson ? "button" : undefined}
                tabIndex={onSelectPerson ? 0 : undefined}
              >
                <div className="name">
                  <span className="name-first">{fmt.firstName}</span>
                  {fmt.restName && <span className="name-rest">{fmt.restName}</span>}
                </div>
                <div className="birth">{formatDate(p.birth_date)}</div>
                {p.is_richiedente && <div className="badge">Richiedente</div>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
