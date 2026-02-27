import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  percentage: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  percentage: z.number().min(0).max(100),
  isActive: z.boolean().default(true),
});

export type CategoryCreate = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
