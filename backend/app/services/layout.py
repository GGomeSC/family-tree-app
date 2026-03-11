from collections import defaultdict, deque
from dataclasses import dataclass

from app.models.person import ParentChildLink, Person, Union
from app.schemas.preview import LayoutEdge, LayoutPerson, LayoutPreview, LayoutUnion

BOX_W = 220
BOX_H = 96
X_GAP = 70
Y_GAP = 90
PAGE_HEIGHT = 1000
TOP_MARGIN = 40
LEFT_MARGIN = 40


@dataclass
class NodePosition:
    x: float
    y: float
    page: int


def _compute_generations(person_ids: list[int], links: list[ParentChildLink]) -> dict[int, int]:
    indegree = {pid: 0 for pid in person_ids}
    children = defaultdict(list)

    for link in links:
        children[link.parent_person_id].append(link.child_person_id)
        indegree[link.child_person_id] = indegree.get(link.child_person_id, 0) + 1

    queue = deque(sorted([pid for pid, deg in indegree.items() if deg == 0]))
    generation = {pid: 0 for pid in person_ids}

    while queue:
        current = queue.popleft()
        for child in children.get(current, []):
            generation[child] = max(generation.get(child, 0), generation[current] + 1)
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    return generation


def _lineage_set(persons: list[Person], links: list[ParentChildLink]) -> set[int]:
    richiedenti = {p.id for p in persons if p.is_richiedente}
    if not richiedenti:
        return {p.id for p in persons}

    parents_of = defaultdict(list)
    for link in links:
        parents_of[link.child_person_id].append(link.parent_person_id)

    lineage = set(richiedenti)
    queue = deque(richiedenti)

    while queue:
        node = queue.popleft()
        for parent in parents_of.get(node, []):
            if parent not in lineage:
                lineage.add(parent)
                queue.append(parent)

    return lineage


def build_layout(persons: list[Person], unions: list[Union], links: list[ParentChildLink]) -> LayoutPreview:
    person_ids = [p.id for p in persons]
    person_by_id = {p.id: p for p in persons}
    generation = _compute_generations(person_ids, links)
    lineage = _lineage_set(persons, links)

    changed = True
    while changed:
        changed = False
        for union in unions:
            a, b = union.partner_a_person_id, union.partner_b_person_id
            if a in lineage and b not in lineage:
                if generation.get(b) != generation.get(a):
                    generation[b] = generation.get(a, 0)
                    changed = True
            elif b in lineage and a not in lineage:
                if generation.get(a) != generation.get(b):
                    generation[a] = generation.get(b, 0)
                    changed = True
            elif a not in lineage and b not in lineage:
                if generation.get(a, 0) > generation.get(b, 0):
                    generation[b] = generation.get(a, 0)
                    changed = True
                elif generation.get(b, 0) > generation.get(a, 0):
                    generation[a] = generation.get(b, 0)
                    changed = True

    grouped = defaultdict(list)
    for person in persons:
        grouped[generation.get(person.id, 0)].append(person.id)

    positions: dict[int, NodePosition] = {}
    for gen in sorted(grouped.keys()):
        ids = sorted(grouped[gen])
        for idx, pid in enumerate(ids):
            x = LEFT_MARGIN + idx * (BOX_W + X_GAP)
            y = TOP_MARGIN + gen * (BOX_H + Y_GAP)
            page = int(y // PAGE_HEIGHT)
            positions[pid] = NodePosition(x=x, y=y, page=page)

    for union in sorted(unions, key=lambda u: u.id):
        a = union.partner_a_person_id
        b = union.partner_b_person_id
        if a not in positions or b not in positions:
            continue
        pa = positions[a]
        pb = positions[b]
        if abs(pa.y - pb.y) < 1e-6:
            if pa.x <= pb.x:
                left, right = a, b
            else:
                left, right = b, a
            positions[right] = NodePosition(
                x=positions[left].x + BOX_W + 120,
                y=positions[right].y,
                page=positions[right].page,
            )

    layout_persons: list[LayoutPerson] = []
    max_page = 0
    for person in sorted(persons, key=lambda p: p.id):
        pos = positions[person.id]
        role = "lineage" if person.id in lineage else "spouse"
        max_page = max(max_page, pos.page)
        layout_persons.append(
            LayoutPerson(
                id=person.id,
                name=person.full_name,
                birth_date=person.birth_date.isoformat(),
                is_richiedente=person.is_richiedente,
                x=pos.x,
                y=pos.y,
                role=role,
                page=pos.page,
            )
        )

    layout_unions = [
        LayoutUnion(
            id=u.id,
            partner_a_person_id=u.partner_a_person_id,
            partner_b_person_id=u.partner_b_person_id,
            marriage_date=u.marriage_date.isoformat() if u.marriage_date else None,
        )
        for u in sorted(unions, key=lambda u: u.id)
    ]

    union_pairs = {
        tuple(sorted((u.partner_a_person_id, u.partner_b_person_id))): u.id
        for u in unions
    }
    parents_by_child = defaultdict(list)
    for link in links:
        parents_by_child[link.child_person_id].append(link.parent_person_id)

    edges: list[LayoutEdge] = []
    continuation_edges: list[LayoutEdge] = []

    for link in sorted(links, key=lambda l: l.id):
        parents = sorted(parents_by_child.get(link.child_person_id, []))
        via_union_id = None
        if len(parents) >= 2:
            via_union_id = union_pairs.get((parents[0], parents[1]))

        from_page = positions[link.parent_person_id].page
        to_page = positions[link.child_person_id].page
        edge = LayoutEdge(
            from_id=link.parent_person_id,
            to_id=link.child_person_id,
            via_union_id=via_union_id,
            from_page=from_page,
            to_page=to_page,
        )
        edges.append(edge)
        if from_page != to_page:
            continuation_edges.append(edge)

    return LayoutPreview(
        pages=max_page + 1,
        persons=layout_persons,
        unions=layout_unions,
        edges=edges,
        continuation_edges=continuation_edges,
    )
