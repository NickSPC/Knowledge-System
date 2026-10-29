import type { Entity, EntityInput, HistoryEntry, ImportPayload, ImportResult, Relationship, Source, User } from "../types";

export const SESSION_EXPIRED_EVENT = "knowledge-system:session-expired";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intentá de nuevo.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(
      body?.error ?? "No se pudo completar la solicitud. Intentá de nuevo.",
      response.status,
    );
  }

  return response.status === 204 ? undefined as T : response.json();
}

export const getSources = () => request<Source[]>("/sources");
export const getEntities = () => request<Entity[]>("/entities");
export const getRelationships = () => request<Relationship[]>("/relationships");

export const createEntity = (input: EntityInput) => request<Entity>("/entities", {
  method: "POST",
  body: JSON.stringify({ type: input.type, name: input.name, data: input.data }),
});

export const createRelationship = (relationship: Relationship) =>
  request<Relationship>("/relationships", {
    method: "POST",
    body: JSON.stringify(relationship),
  });

export const updateEntity = (id: string, changes: Pick<EntityInput, "name" | "type" | "data">) =>
  request<Entity>(`/entities/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });

export const deleteEntity = (id: string) =>
  request<void>(`/entities/${encodeURIComponent(id)}`, { method: "DELETE" });

export const getHistory = (id: string) =>
  request<HistoryEntry[]>(`/entities/${encodeURIComponent(id)}/history`);

export const deleteSource = (id: number) => request<void>(`/sources/${id}`, { method: "DELETE" });

export const deleteRelationship = (relationship: Relationship) =>
  request<void>("/relationships", { method: "DELETE", body: JSON.stringify(relationship) });

export const importData = (payload: ImportPayload) => request<ImportResult>("/import", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const clearData = () => request<void>("/data", { method: "DELETE" });

export const login = (email: string, password: string) => request<User>("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

export const logout = () => request<void>("/auth/logout", { method: "POST" });

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await request<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
