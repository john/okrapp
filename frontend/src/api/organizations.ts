import apiClient from "./client";

export interface Organization {
  id: number;
  name: string;
  org_type: "program" | "initiative";
  parent_id: number | null;
  created_at: string;
}

export interface CurrentUser {
  id: number;
  name: string | null;
  email: string | null;
  organizations: { id: number; name: string; org_type: string }[];
  is_admin: boolean;
}

export interface User {
  id: number;
  name: string | null;
  email: string | null;
  organizations: { id: number; name: string; org_type: string }[];
}

export const getMe = (): Promise<CurrentUser> =>
  apiClient.get("/users/me").then((r) => r.data);

export const getPrograms = (): Promise<Organization[]> =>
  apiClient.get("/organizations/programs").then((r) => r.data);

export const getAllOrgs = (): Promise<Organization[]> =>
  apiClient.get("/organizations").then((r) => r.data);

export const getOrg = (id: number): Promise<Organization> =>
  apiClient.get(`/organizations/${id}`).then((r) => r.data);

export const createOrg = (data: {
  name: string;
  org_type: "program" | "initiative";
  parent_id?: number | null;
}): Promise<Organization> =>
  apiClient.post("/organizations", data).then((r) => r.data);

export const updateOrg = (
  id: number,
  data: Partial<{ name: string; org_type: string; parent_id: number | null }>
): Promise<Organization> =>
  apiClient.patch(`/organizations/${id}`, data).then((r) => r.data);

export const listUsers = (): Promise<User[]> =>
  apiClient.get("/users").then((r) => r.data);

export const addUserToOrg = (userId: number, orgId: number): Promise<void> =>
  apiClient
    .post(`/users/${userId}/organizations`, { organization_id: orgId })
    .then(() => undefined);

export const removeUserFromOrg = (userId: number, orgId: number): Promise<void> =>
  apiClient.delete(`/users/${userId}/organizations/${orgId}`).then(() => undefined);
