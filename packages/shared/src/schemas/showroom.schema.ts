import { z } from "zod";

export const showroomEntrySchema = z.object({
  id: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  modelStatus: z.string(),
  addedById: z.string(),
  isFeatured: z.boolean(),
  featuredPosition: z.number().nullable(),
  addedAt: z.date(),
});

export type ShowroomEntry = z.infer<typeof showroomEntrySchema>;

export const showroomReportSchema = z.object({
  period: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  queryCount: z.number(),
}).array();

export type ShowroomReport = z.infer<typeof showroomReportSchema>;
