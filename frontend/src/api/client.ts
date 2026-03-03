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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? "Erro na API");
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ name: string; email: string }>("/auth/me"),
  listCases: () => request<any[]>("/cases"),
  createCase: (title: string, client_reference?: string) =>
    request<any>("/cases", {
      method: "POST",
      body: JSON.stringify({ title, client_reference }),
    }),
  createPerson: (caseId: number, payload: { full_name: string; birth_date: string; is_richiedente: boolean }) =>
    request<any>(`/cases/${caseId}/persons`, { method: "POST", body: JSON.stringify(payload) }),
  createUnion: (caseId: number, payload: { partner_a_person_id: number; partner_b_person_id: number; marriage_date?: string }) =>
    request<any>(`/cases/${caseId}/unions`, { method: "POST", body: JSON.stringify(payload) }),
  createParentChild: (caseId: number, payload: { parent_person_id: number; child_person_id: number }) =>
    request<any>(`/cases/${caseId}/parent-child-links`, { method: "POST", body: JSON.stringify(payload) }),
  preview: (caseId: number) => request<LayoutPreview>(`/cases/${caseId}/preview`),
  exportPdf: (caseId: number) => request<any>(`/cases/${caseId}/export/pdf`, { method: "POST" }),
  listExports: (caseId: number) => request<any[]>(`/cases/${caseId}/exports`),
  downloadExportUrl: (exportId: number) => `${API_BASE}/exports/${exportId}/download`,
};
