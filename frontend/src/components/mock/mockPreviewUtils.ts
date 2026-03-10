import { LayoutPerson, LayoutPreview } from "../../types";

export interface PersonRelations {
  spouses: number[];
  parents: number[];
  children: number[];
}

export function buildPersonRelations(preview: LayoutPreview) {
  const relationsById = new Map<number, PersonRelations>();

  function getRelations(personId: number) {
    if (!relationsById.has(personId)) {
      relationsById.set(personId, { spouses: [], parents: [], children: [] });
    }

    return relationsById.get(personId)!;
  }

  preview.unions.forEach((union) => {
    getRelations(union.partner_a_person_id).spouses.push(union.partner_b_person_id);
    getRelations(union.partner_b_person_id).spouses.push(union.partner_a_person_id);
  });

  preview.edges.forEach((edge) => {
    const childRelations = getRelations(edge.to_id);

    if (edge.via_union_id) {
      const union = preview.unions.find((item) => item.id === edge.via_union_id);
      if (!union) {
        return;
      }

      childRelations.parents.push(union.partner_a_person_id, union.partner_b_person_id);
      getRelations(union.partner_a_person_id).children.push(edge.to_id);
      getRelations(union.partner_b_person_id).children.push(edge.to_id);
      return;
    }

    childRelations.parents.push(edge.from_id);
    getRelations(edge.from_id).children.push(edge.to_id);
  });

  relationsById.forEach((relations) => {
    relations.spouses = [...new Set(relations.spouses)];
    relations.parents = [...new Set(relations.parents)];
    relations.children = [...new Set(relations.children)];
  });

  return relationsById;
}

export function sortLayoutPersons(persons: LayoutPerson[]) {
  return [...persons].sort((first, second) => first.y - second.y || first.x - second.x);
}

export function toggleTargetPerson(targetIds: number[], personId: number) {
  return targetIds.includes(personId)
    ? targetIds.filter((currentId) => currentId !== personId)
    : [...targetIds, personId];
}
