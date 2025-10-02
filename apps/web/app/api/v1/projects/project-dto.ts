import type { ProjectResource } from "@/types/api";
import type { Tables } from "@/types/supabase";

type ProjectRow = Tables<"projects">;

export type ProjectDto = ProjectResource;

export const PROJECT_COLUMNS = "id, owner_id, name, description, created_at, updated_at" as const;

export function mapProject(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
