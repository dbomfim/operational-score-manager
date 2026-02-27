import { z } from "zod";

export const bucketSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Bucket = z.infer<typeof bucketSchema>;

export const bucketCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  isActive: z.boolean().default(true),
});

export type BucketCreate = z.infer<typeof bucketCreateSchema>;

export const bucketUpdateSchema = bucketCreateSchema.partial();

export type BucketUpdate = z.infer<typeof bucketUpdateSchema>;

export const bucketEditInfoSchema = bucketSchema.extend({
  category: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});

export type BucketEditInfo = z.infer<typeof bucketEditInfoSchema>;
