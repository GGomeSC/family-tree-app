export type FamilyStatus = "Draft" | "Reviewed" | "Exported" | "Archived";

export interface FamilyItem {
  id: number;
  title: string;
  client_reference: string | null;
  status: FamilyStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Person {
  id: number;
  family_id: number;
  full_name: string;
  birth_date: string;
  is_richiedente: boolean;
  notes: string | null;
}

export interface UnionItem {
  id: number;
  family_id: number;
  partner_a_person_id: number;
  partner_b_person_id: number;
  marriage_date: string | null;
}

export interface LayoutPerson {
  id: number;
  name: string;
  birth_date: string;
  is_richiedente: boolean;
  x: number;
  y: number;
  role: "lineage" | "spouse";
  page: number;
}

export interface LayoutUnion {
  id: number;
  partner_a_person_id: number;
  partner_b_person_id: number;
  marriage_date: string | null;
}

export interface LayoutEdge {
  from_id: number;
  to_id: number;
  via_union_id: number | null;
  from_page: number;
  to_page: number;
}

export interface LayoutPreview {
  pages: number;
  persons: LayoutPerson[];
  unions: LayoutUnion[];
  edges: LayoutEdge[];
  continuation_edges: LayoutEdge[];
}

export interface ExportItem {
  id: number;
  family_id: number;
  exported_by: number;
  format: string;
  template_version: string;
  file_path: string;
  created_at: string;
}
