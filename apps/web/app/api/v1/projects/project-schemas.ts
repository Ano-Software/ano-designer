import { z } from "zod";

export const projectIdSchema = z.string().uuid({ message: "Invalid project id" });

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.union([z.string().trim().max(2048), z.literal(null)]).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.union([z.string().trim().max(2048), z.literal(null)]).optional(),
});

export const patchProjectSchema = z
  .object({
    name: z.union([z.string().trim().min(1).max(120), z.literal(null)]).optional(),
    description: z.union([z.string().trim().max(2048), z.literal(null)]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
