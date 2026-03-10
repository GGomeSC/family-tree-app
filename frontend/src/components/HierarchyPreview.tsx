import {
  clampScale,
  getNodeBottomCenter,
  getNodeTopCenter,
  getPreviewCanvasSize,
  getUnionConnectionY,
  getUnionToChildPath,
  LAYOUT,
} from "../config/layout";
import { LayoutEdge, LayoutPerson, LayoutPreview, LayoutUnion } from "../types";
import { formatDate, formatNodeName, NameDisplayMode } from "../utils/formatters";

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

function UnionLines({
  unions,
  peopleById,
}: {
  unions: LayoutUnion[];
  peopleById: Map<number, LayoutPerson>;
}) {
  return (
    <>
      {unions.map((union) => {
        const firstPartner = peopleById.get(union.partner_a_person_id);
        const secondPartner = peopleById.get(union.partner_b_person_id);

        if (!firstPartner || !secondPartner) {
          return null;
        }

        const firstCenter = getNodeTopCenter(firstPartner);
        const secondCenter = getNodeTopCenter(secondPartner);

        return (
          <g key={`union-${union.id}`}>
            <line
              x1={firstCenter.x}
              y1={getUnionConnectionY(firstPartner)}
              x2={secondCenter.x}
              y2={getUnionConnectionY(secondPartner)}
              className="line spouse"
            />
            {union.marriage_date && (
              <text
                x={(firstCenter.x + secondCenter.x) / 2}
                y={firstCenter.y + 10}
                className="marriage-date"
                textAnchor="middle"
              >
                {formatDate(union.marriage_date)}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function LineageEdges({
  edges,
  peopleById,
  unionsById,
}: {
  edges: LayoutEdge[];
  peopleById: Map<number, LayoutPerson>;
  unionsById: Map<number, LayoutUnion>;
}) {
  return (
    <>
      {edges.map((edge) => {
        const child = peopleById.get(edge.to_id);
        if (!child) {
          return null;
        }

        if (edge.via_union_id) {
          const union = unionsById.get(edge.via_union_id);
          const firstParent = peopleById.get(union?.partner_a_person_id ?? -1);
          const secondParent = peopleById.get(union?.partner_b_person_id ?? -1);

          if (!firstParent || !secondParent) {
            return null;
          }

          return (
            <path
              key={`edge-${edgeKey(edge)}`}
              d={getUnionToChildPath(firstParent, secondParent, child)}
              className="line lineage"
              fill="none"
            />
          );
        }

        const parent = peopleById.get(edge.from_id);
        if (!parent) {
          return null;
        }

        const fromBottomCenter = getNodeBottomCenter(parent);
        const childTopCenter = getNodeTopCenter(child);

        return (
          <line
            key={`edge-${edgeKey(edge)}`}
            x1={fromBottomCenter.x}
            y1={fromBottomCenter.y}
            x2={childTopCenter.x}
            y2={childTopCenter.y}
            className="line lineage"
          />
        );
      })}
    </>
  );
}

function PersonNodes({
  people,
  selectedPersonId,
  onSelectPerson,
  nameDisplayMode,
  nameTargetPersonIds,
}: {
  people: LayoutPerson[];
  selectedPersonId: number | null;
  onSelectPerson?: (personId: number) => void;
  nameDisplayMode: NameDisplayMode;
  nameTargetPersonIds: Set<number>;
}) {
  return (
    <>
      {people.map((person) => {
        const formattedName = formatNodeName(
          person.name,
          nameTargetPersonIds.has(person.id) ? nameDisplayMode : "first-first",
        );

        return (
          <article
            key={person.id}
            className={`hierarchy-node ${person.role} ${selectedPersonId === person.id ? "selected" : ""} ${onSelectPerson ? "clickable" : ""}`}
            style={{ left: `${person.x + LAYOUT.PAD_X}px`, top: `${person.y + LAYOUT.PAD_Y}px` }}
            onClick={onSelectPerson ? () => onSelectPerson(person.id) : undefined}
            role={onSelectPerson ? "button" : undefined}
            tabIndex={onSelectPerson ? 0 : undefined}
          >
            <div className="name">
              <span className="name-first">{formattedName.firstName}</span>
              {formattedName.restName && <span className="name-rest">{formattedName.restName}</span>}
            </div>
            <div className="birth">{formatDate(person.birth_date)}</div>
            {person.is_richiedente && <div className="badge">Richiedente</div>}
          </article>
        );
      })}
    </>
  );
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
  const peopleById = new Map(preview.persons.map((person) => [person.id, person]));
  const unionsById = new Map(preview.unions.map((union) => [union.id, union]));
  const targetIds = new Set(nameTargetPersonIds);
  const canvas = getPreviewCanvasSize(preview.persons);
  const previewScale = clampScale(scale);

  return (
    <div className={`hierarchy-scroll ${overflowMode === "fit" ? "hierarchy-scroll-fit" : ""}`}>
      <div
        className="hierarchy-scale-shell"
        style={{
          width: `${Math.round(canvas.width * previewScale)}px`,
          height: `${Math.round(canvas.height * previewScale)}px`,
        }}
      >
        <div
          className="hierarchy-canvas"
          style={{
            width: `${canvas.width}px`,
            height: `${canvas.height}px`,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
        >
          <svg className="hierarchy-lines" viewBox={`0 0 ${canvas.width} ${canvas.height}`}>
            <UnionLines unions={preview.unions} peopleById={peopleById} />
            <LineageEdges edges={preview.edges} peopleById={peopleById} unionsById={unionsById} />
          </svg>
          <PersonNodes
            people={preview.persons}
            selectedPersonId={selectedPersonId}
            onSelectPerson={onSelectPerson}
            nameDisplayMode={nameDisplayMode}
            nameTargetPersonIds={targetIds}
          />
        </div>
      </div>
    </div>
  );
}
