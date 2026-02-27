import { z } from "zod";

export const adminStatsSchema = z.object({
  users: z.object({
    total: z.number(),
    active: z.number(),
    inactive: z.number(),
    loggedInLast30Days: z.number(),
    pendingInvitations: z.number(),
  }),
  roles: z.object({
    total: z.number(),
    totalWithNoUsers: z.number(),
  }),
  resources: z.object({
    total: z.number(),
  }),
  models: z.object({
    total: z.number(),
    active: z.number(),
    inShowroomPool: z.number(),
    featured: z.number(),
  }),
  analytics: z.object({
    pageViewsToday: z.number(),
    pageViewsLast7Days: z.number(),
    activeUsersToday: z.number(),
    mostVisitedPageToday: z.string(),
  }),
  auditLog: z.object({
    actionsToday: z.number(),
    actionsLast7Days: z.number(),
    lastActionAt: z.string().nullable(),
  }),
});

export type AdminStats = z.infer<typeof adminStatsSchema>;

export const userSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  username: z.string(),
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable(),
  firstLoginAt: z.date().nullable(),
  createdAt: z.date(),
  roles: z.array(z.object({ id: z.string(), name: z.string() })),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

export const adminUsersListInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().optional(),
});

export const adminInvitationsListInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"]).optional(),
  email: z.string().optional(),
});

export const invitationValidationSchema = z.object({
  valid: z.boolean(),
  email: z.string().nullable(),
  fullName: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const userInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  invitedById: z.string(),
  roleIds: z.array(z.string()),
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"]),
  token: z.string(),
  message: z.string().nullable(),
  expiresAt: z.date(),
  createdAt: z.date(),
  acceptedAt: z.date().nullable(),
});

export type UserInvitation = z.infer<typeof userInvitationSchema>;

export const createInvitationSchema = z.object({
  email: z.string().email(),
  roleIds: z.array(z.string()).min(1),
  message: z.string().optional(),
  expirationDays: z.number().min(1).max(30).default(7),
});

export type CreateInvitation = z.infer<typeof createInvitationSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  userCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Role = z.infer<typeof roleSchema>;

export const roleWithStatsSchema = roleSchema.extend({
  userCount: z.number(),
  permissions: z.array(z.object({ id: z.string(), code: z.string() })),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const permissionSchema = z.object({
  id: z.string(),
  code: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string(),
  module: z.string(),
  isActive: z.boolean(),
  roleCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Permission = z.infer<typeof permissionSchema>;

export const permissionWithStatsSchema = permissionSchema.extend({
  roleCount: z.number(),
});

export const permissionCreateSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
  description: z.string().min(4),
  module: z.string().min(2),
});

export const permissionUpdateSchema = z.object({
  description: z.string().min(4).optional(),
  module: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export const analyticsEventBatchSchema = z.object({
  events: z.array(z.object({
    sessionId: z.string(),
    userId: z.string(),
    eventType: z.string(),
    page: z.string().optional(),
    referrer: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    featureName: z.string().optional(),
    actionLabel: z.string().optional(),
    duration: z.number().optional(),
    loadTime: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.coerce.date().optional(),
  })).max(50),
});

export type AnalyticsEventBatch = z.infer<typeof analyticsEventBatchSchema>;

export const ADMIN_ENTITY_TYPES = [
  "ModelStatus", "ProductType", "ChargeType", "ExecutionType", "ExecutionFrequency",
  "Bureau", "OwnerArea", "Audience", "Purpose", "PublicProfile", "BusinessUnit", "ProductManager",
] as const;

export const entityItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  color: z.string().optional(),
});

export const entityCreateSchema = z.object({
  description: z.string().min(1),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const entityUpdateSchema = z.object({
  description: z.string().min(1).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const auditLogListInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
});
