import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** All permissions used by the app (resource:action format) */
const CORE_PERMISSIONS = [
  { code: "admin:super", resource: "admin", action: "super", description: "All admin permissions", module: "admin" },
  { code: "admin:access", resource: "admin", action: "access", description: "Access admin section", module: "admin" },
  { code: "models:list", resource: "models", action: "list", description: "List models", module: "models" },
  { code: "models:read", resource: "models", action: "read", description: "Read model", module: "models" },
  { code: "models:create", resource: "models", action: "create", description: "Create model", module: "models" },
  { code: "models:update", resource: "models", action: "update", description: "Update model", module: "models" },
  { code: "models:delete", resource: "models", action: "delete", description: "Delete model", module: "models" },
  { code: "models:sync", resource: "models", action: "sync", description: "Sync models", module: "models" },
  { code: "clients:list", resource: "clients", action: "list", description: "List clients", module: "clients" },
  { code: "clients:read", resource: "clients", action: "read", description: "Read client", module: "clients" },
  { code: "categories:list", resource: "categories", action: "list", description: "List categories", module: "categories" },
  { code: "categories:read", resource: "categories", action: "read", description: "Read category", module: "categories" },
  { code: "categories:create", resource: "categories", action: "create", description: "Create category", module: "categories" },
  { code: "categories:update", resource: "categories", action: "update", description: "Update category", module: "categories" },
  { code: "buckets:list", resource: "buckets", action: "list", description: "List buckets", module: "buckets" },
  { code: "buckets:read", resource: "buckets", action: "read", description: "Read bucket", module: "buckets" },
  { code: "buckets:create", resource: "buckets", action: "create", description: "Create bucket", module: "buckets" },
  { code: "buckets:update", resource: "buckets", action: "update", description: "Update bucket", module: "buckets" },
  { code: "showroom:view", resource: "showroom", action: "view", description: "View showroom", module: "showroom" },
  { code: "showroom:reports", resource: "showroom", action: "reports", description: "Showroom reports", module: "showroom" },
  { code: "historico:list", resource: "historico", action: "list", description: "List query history", module: "historico" },
];

async function main() {
  const ts = new Date();

  // ModelStatus
  const modelStatusCount = await prisma.modelStatus.count();
  if (modelStatusCount === 0) {
    await prisma.$runCommandRaw({
      insert: "ModelStatus",
      documents: [
        { description: "Active", isActive: true, createdAt: ts, updatedAt: ts },
        { description: "Inactive", isActive: true, createdAt: ts, updatedAt: ts },
      ],
    });
    console.log("Created default ModelStatus records");
  }

  // Permissions — use update with upsert to avoid transactions; plain Date for DateTime
  for (const p of CORE_PERMISSIONS) {
    await prisma.$runCommandRaw({
      update: "Permission",
      updates: [
        {
          q: { code: p.code },
          u: { $setOnInsert: { ...p, isActive: true, isSensitive: false, createdAt: ts, updatedAt: ts } },
          upsert: true,
        },
      ],
    });
  }
  console.log(`Seeded ${CORE_PERMISSIONS.length} permissions`);

  // Super Admin role — use update with upsert
  await prisma.$runCommandRaw({
    update: "Role",
    updates: [
      {
        q: { name: "Super Admin" },
        u: {
          $setOnInsert: {
            name: "Super Admin",
            description: "Full access to all modules",
            isActive: true,
            createdAt: ts,
            updatedAt: ts,
          },
        },
        upsert: true,
      },
    ],
  });

  // Get Super Admin role and Permission IDs via raw find (avoid Prisma read of potentially bad DateTime)
  const roleResult = await prisma.$runCommandRaw({
    find: "Role",
    filter: { name: "Super Admin" },
    projection: { _id: 1 },
  }) as { cursor?: { firstBatch?: { _id: { $oid: string } }[] } };
  const roleId = roleResult?.cursor?.firstBatch?.[0]?._id?.$oid;
  if (!roleId) {
    throw new Error("Super Admin role not found after upsert");
  }

  const permResult = await prisma.$runCommandRaw({
    find: "Permission",
    filter: { code: { $in: CORE_PERMISSIONS.map((x) => x.code) } },
    projection: { _id: 1 },
  }) as { cursor?: { firstBatch?: { _id: { $oid: string } }[] } };
  const permIds = (permResult?.cursor?.firstBatch ?? []).map((x) => x._id.$oid);

  // Assign permissions to role — use update with upsert for each
  for (const permId of permIds) {
    await prisma.$runCommandRaw({
      update: "RolePermission",
      updates: [
        {
          q: { roleId: { $oid: roleId }, permissionId: { $oid: permId } },
          u: { $setOnInsert: { roleId: { $oid: roleId }, permissionId: { $oid: permId } } },
          upsert: true,
        },
      ],
    });
  }
  console.log(`Assigned ${permIds.length} permissions to Super Admin role`);

  // Sample QueryHistory (for Histórico page demo)
  const qhCount = await prisma.queryHistory.count();
  if (qhCount === 0) {
    const base = new Date();
    base.setDate(base.getDate() - 7);
    const docs = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + Math.floor(i / 3));
      docs.push({ modelName: ["Score A", "Score B", "Score C"][i % 3], queriedAt: d });
    }
    await prisma.$runCommandRaw({ insert: "QueryHistory", documents: docs });
    console.log("Created sample QueryHistory records");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
