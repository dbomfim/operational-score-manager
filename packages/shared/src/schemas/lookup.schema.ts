import { z } from "zod";

export const lookupEntitySchema = z.object({
  id: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  name: z.string().optional(),
  color: z.string().optional(),
});

export type LookupEntity = z.infer<typeof lookupEntitySchema>;

export const lookupConfigsSchema = z.record(z.string(), z.array(lookupEntitySchema));

export type LookupConfigs = z.infer<typeof lookupConfigsSchema>;

export const LOOKUP_ENTITIES = [
  "ModelStatus",
  "ProductType",
  "ChargeType",
  "ExecutionType",
  "ExecutionFrequency",
  "Bureau",
  "OwnerArea",
  "Audience",
  "Purpose",
  "PublicProfile",
  "BusinessUnit",
  "ProductManager",
] as const;
