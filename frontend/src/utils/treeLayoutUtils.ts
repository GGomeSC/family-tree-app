import { LayoutPreview, LayoutPerson } from "../types";

export function sortLayoutPersons(persons: LayoutPerson[]) {
  return [...persons].sort((a, b) => a.name.localeCompare(b.name));
}

export function toggleTargetPerson(currentIds: number[], personId: number) {
  if (currentIds.includes(personId)) {
    return currentIds.filter((id) => id !== personId);
  }
  return [...currentIds, personId];
}

export function buildPersonRelations(preview: LayoutPreview) {
  const relations = new Map<
    number,
    {
      parents: number[];
      spouses: number[];
      children: number[];
    }
  >();

  preview.persons.forEach((p) => {
    relations.set(p.id, { parents: [], spouses: [], children: [] });
  });

  preview.unions.forEach((u) => {
    const a = relations.get(u.partner_a_person_id);
    const b = relations.get(u.partner_b_person_id);
    if (a) a.spouses.push(u.partner_b_person_id);
    if (b) b.spouses.push(u.partner_a_person_id);
  });

  preview.edges.forEach((e) => {
    const parent = relations.get(e.from_id);
    const child = relations.get(e.to_id);

    if (parent) parent.children.push(e.to_id);
    if (child) child.parents.push(e.from_id);

    if (e.via_union_id) {
      const union = preview.unions.find((u) => u.id === e.via_union_id);
      if (union) {
        const otherParentId =
          union.partner_a_person_id === e.from_id
            ? union.partner_b_person_id
            : union.partner_a_person_id;
        const otherParent = relations.get(otherParentId);
        if (otherParent && !otherParent.children.includes(e.to_id)) {
          otherParent.children.push(e.to_id);
        }
        if (child && !child.parents.includes(otherParentId)) {
          child.parents.push(otherParentId);
        }
      }
    }
  });

  return relations;
}
