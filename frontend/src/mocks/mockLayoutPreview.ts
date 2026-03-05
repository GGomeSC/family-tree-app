import { LayoutPreview, LayoutPerson } from "../types";

const p = (
  id: number,
  name: string,
  birth: string,
  x: number,
  y: number,
  role: "lineage" | "spouse" = "lineage",
  is_richiedente = false
): LayoutPerson => ({
  id,
  name,
  birth_date: birth,
  is_richiedente,
  x,
  y,
  role,
  page: 1,
});

export const mockLayoutPreview: LayoutPreview = {
  pages: 1,
  persons: [
    p(1, "Antonio Bianchi", "1958-04-17", 40, 20),
    p(2, "Maria Rossi", "1960-09-03", 340, 20, "spouse"),
    p(3, "Carlo Bianchi", "1985-02-11", 40, 200, "lineage", true),
    p(4, "Lucia Verdi", "1988-12-27", 340, 200, "spouse"),
    p(7, "Giulia Bianchi", "1990-06-09", 640, 200),
    p(8, "Riccardo Conti", "1989-11-30", 940, 200, "spouse"),
    p(5, "Sofia Bianchi", "2015-03-29", 40, 380),
    p(6, "Marco Bianchi", "2018-08-14", 340, 380),
    p(9, "Elena Conti", "2021-05-18", 790, 380),
    p(10, "Paolo Ferri", "2020-01-22", 1090, 380, "spouse"),
  ],
  unions: [
    { id: 100, partner_a_person_id: 1, partner_b_person_id: 2, marriage_date: "1983-05-21" },
    { id: 101, partner_a_person_id: 3, partner_b_person_id: 4, marriage_date: "2012-11-03" },
    { id: 102, partner_a_person_id: 7, partner_b_person_id: 8, marriage_date: "2020-02-14" },
    { id: 103, partner_a_person_id: 9, partner_b_person_id: 10, marriage_date: "2044-09-12" },
  ],
  edges: [
    { from_id: 1, to_id: 3, via_union_id: 100, from_page: 1, to_page: 1 },
    { from_id: 1, to_id: 7, via_union_id: 100, from_page: 1, to_page: 1 },
    { from_id: 3, to_id: 5, via_union_id: 101, from_page: 1, to_page: 1 },
    { from_id: 3, to_id: 6, via_union_id: 101, from_page: 1, to_page: 1 },
    { from_id: 7, to_id: 9, via_union_id: 102, from_page: 1, to_page: 1 },
  ],
  continuation_edges: [],
};