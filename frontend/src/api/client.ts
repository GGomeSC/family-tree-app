import { LayoutPreview } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

let token = localStorage.getItem("token") ?? "";

export function setToken(value: string) {
  token = value;
  localStorage.setItem("token", value);
}

export function clearToken() {
  token = "";
  localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? "Erro na API");
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const post = <T>(path: string, body?: any) => 
  request<T>(path, { method: "POST", ...(body && { body: JSON.stringify(body) }) });

export const api = {
  login: (email: string, password: string) => post<{ access_token: string }>("/auth/login", { email, password }),
  me: () => request<{ name: string; email: string }>("/auth/me"),
  listFamilies: () => request<any[]>("/families"),
  createFamily: (title: string, client_reference?: string) => post<any>("/families", { title, client_reference }),
  
  createPerson: (familyId: number, payload: { full_name: string; birth_date: string; is_richiedente: boolean }) =>
    post<any>(`/families/${familyId}/persons`, payload),
    
  createUnion: (familyId: number, payload: { partner_a_person_id: number; partner_b_person_id: number; marriage_date?: string }) =>
    post<any>(`/families/${familyId}/unions`, payload),
    
  createParentChild: (familyId: number, payload: { parent_person_id: number; child_person_id: number }) =>
    post<any>(`/families/${familyId}/parent-child-links`, payload),
    
  preview: (familyId: number) => request<LayoutPreview>(`/families/${familyId}/preview`),
  exportPdf: (familyId: number) => post<any>(`/families/${familyId}/export/pdf`),
  listExports: (familyId: number) => request<any[]>(`/families/${familyId}/exports`),
  downloadExportUrl: (exportId: number) => `${API_BASE}/exports/${exportId}/download`,
};
