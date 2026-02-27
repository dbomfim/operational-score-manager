import { z } from "zod";

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  taxId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Client = z.infer<typeof clientSchema>;
