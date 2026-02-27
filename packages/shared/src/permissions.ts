/**
 * Permission codes for RBAC.
 * Format: resource:action or resource.fields.group:action
 */
export const PERMISSIONS = {
  MODELS: {
    LIST: "models:list",
    READ: "models:read",
    CREATE: "models:create",
    UPDATE: "models:update",
    DELETE: "models:delete",
    SYNC: "models:sync",
  },
  ADMIN: {
    ACCESS: "admin:access",
    SUPER: "admin:super",
  },
} as const;
