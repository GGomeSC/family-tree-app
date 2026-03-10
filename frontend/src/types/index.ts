export type FamilyStatus = "Draft" | "Reviewed" | "Exported" | "Archived";
export type AuthState = "loading" | "authenticated" | "anonymous";
export type LayoutPersonRole = "lineage" | "spouse";

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
  role: LayoutPersonRole;
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
  created_at: string;
}

export interface ApiMessageResponse {
  message: string;
}

export interface AuthUser {
  name: string;
  email: string;
}

export interface CreateFamilyRequest {
  title: string;
  client_reference?: string;
}

export interface CreatePersonRequest {
  full_name: string;
  birth_date: string;
  is_richiedente: boolean;
}

export interface CreateUnionRequest {
  partner_a_person_id: number;
  partner_b_person_id: number;
  marriage_date?: string;
}

export interface CreateParentChildRequest {
  parent_person_id: number;
  child_person_id: number;
}
