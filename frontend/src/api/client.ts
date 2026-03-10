import {
  ApiMessageResponse,
  AuthUser,
  CreateFamilyRequest,
  CreateParentChildRequest,
  CreatePersonRequest,
  CreateUnionRequest,
  ExportItem,
  FamilyItem,
  LayoutPreview,
  Person,
} from "../types";

const API_BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000/api/v1";

type JsonRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function toRequestInit(options: JsonRequestOptions = {}): RequestInit {
  const { body, headers, ...requestOptions } = options;
  const finalHeaders = new Headers(headers);
  const requestInit: RequestInit = {
    ...requestOptions,
    headers: finalHeaders,
    credentials: "include",
  };

  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(body);
  }

  return requestInit;
}

async function request<T>(path: string, options: JsonRequestOptions = {}, retryOnAuthFailure = true): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, toRequestInit(options));
  if (
    response.status === 401 &&
    retryOnAuthFailure &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, toRequestInit({ method: "POST" }));
    if (refreshResponse.ok) {
      return request<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(response.status, payload.detail ?? "Erro na API");
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body });
const familyPath = (familyId: number, suffix = "") => `/families/${familyId}${suffix}`;

export const api = {
  login: (email: string, password: string) =>
    post<ApiMessageResponse>("/auth/login", { email, password }),
  logout: () => post<ApiMessageResponse>("/auth/logout"),
  me: () => request<AuthUser>("/auth/me"),
  listFamilies: () => request<FamilyItem[]>("/families"),
  createFamily: (payload: CreateFamilyRequest) => post<FamilyItem>("/families", payload),
  listPersons: (familyId: number) => request<Person[]>(familyPath(familyId, "/persons")),
  createPerson: (familyId: number, payload: CreatePersonRequest) =>
    post<Person>(familyPath(familyId, "/persons"), payload),
  createUnion: (familyId: number, payload: CreateUnionRequest) =>
    post<ApiMessageResponse>(familyPath(familyId, "/unions"), payload),
  createParentChild: (familyId: number, payload: CreateParentChildRequest) =>
    post<ApiMessageResponse>(familyPath(familyId, "/parent-child-links"), payload),
  preview: (familyId: number) => request<LayoutPreview>(familyPath(familyId, "/preview")),
  deletePerson: (familyId: number, personId: number) =>
    request<ApiMessageResponse>(familyPath(familyId, `/persons/${personId}`), { method: "DELETE" }),
  exportPdf: (familyId: number) => post<ApiMessageResponse>(familyPath(familyId, "/export/pdf")),
  listExports: (familyId: number) => request<ExportItem[]>(familyPath(familyId, "/exports")),
  downloadExportUrl: (exportId: number) => `${API_BASE}/exports/${exportId}/download`,
};
