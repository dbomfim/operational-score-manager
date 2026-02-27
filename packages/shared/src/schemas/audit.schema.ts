import { z } from "zod";

export const auditLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  entityLabel: z.string(),
  changes: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.date(),
  metadata: z.unknown().nullable(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
