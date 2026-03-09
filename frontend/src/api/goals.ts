import apiClient from "./client";

export type GoalStatus = "draft" | "active" | "archived";
export type GoalType = "objective" | "key_result";

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: GoalStatus;
  goal_type: GoalType;
  organization_id: number;
  parent_goal_id: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: number;
}

export interface GoalCreate {
  title: string;
  description?: string;
  status: GoalStatus;
  goal_type: GoalType;
  organization_id: number;
  parent_goal_id?: number | null;
  start_date: string;
  end_date: string;
}

export const getOrgGoals = (orgId: number, type?: GoalType): Promise<Goal[]> =>
  apiClient
    .get(`/organizations/${orgId}/goals`, { params: type ? { type } : {} })
    .then((r) => r.data);

export const getGoal = (id: number): Promise<Goal> =>
  apiClient.get(`/goals/${id}`).then((r) => r.data);

export const getGoalChildren = (id: number): Promise<Goal[]> =>
  apiClient.get(`/goals/${id}/children`).then((r) => r.data);

export const createGoal = (data: GoalCreate): Promise<Goal> =>
  apiClient.post("/goals", data).then((r) => r.data);

export const updateGoal = (
  id: number,
  data: Partial<Pick<GoalCreate, "title" | "description" | "status" | "start_date" | "end_date">>
): Promise<Goal> => apiClient.patch(`/goals/${id}`, data).then((r) => r.data);

export const deleteGoal = (id: number): Promise<void> =>
  apiClient.delete(`/goals/${id}`).then(() => undefined);
