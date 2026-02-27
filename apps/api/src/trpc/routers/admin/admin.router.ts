import { Inject } from "@nestjs/common";
import { Ctx, Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  adminStatsSchema,
  userSummarySchema,
  userInvitationSchema,
  createInvitationSchema,
  adminUsersListInputSchema,
  adminInvitationsListInputSchema,
  invitationValidationSchema,
  paginatedResponseSchema,
  roleWithStatsSchema,
  roleCreateSchema,
  roleUpdateSchema,
  permissionWithStatsSchema,
  permissionCreateSchema,
  permissionUpdateSchema,
  ADMIN_ENTITY_TYPES,
  entityItemSchema,
  entityCreateSchema,
  entityUpdateSchema,
  auditLogListInputSchema,
  analyticsEventBatchSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../../protected.middleware";
import { WithPermissionMiddleware } from "../../with-permission.middleware";
import { TRPCError } from "@trpc/server";
import type { TrpcContextUser } from "../../trpc.context";

const paginatedUserSchema = paginatedResponseSchema(userSummarySchema);
const paginatedInvitationSchema = paginatedResponseSchema(userInvitationSchema);
const paginatedRoleSchema = paginatedResponseSchema(roleWithStatsSchema);
const paginatedPermissionSchema = paginatedResponseSchema(permissionWithStatsSchema);
const paginatedEntitySchema = paginatedResponseSchema(entityItemSchema);
const paginatedAuditSchema = paginatedResponseSchema(z.any());

@Router({ alias: "admin" })
export class AdminRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    output: adminStatsSchema,
    meta: { permission: "admin:access" },
  })
  async stats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [userCount, activeUserCount, recentLoginCount, pendingInvites, roleCount, rolesWithNoUsers, permissionCount, modelCount, activeModelCount, showroomPoolCount, featuredCount, auditToday, auditWeek, lastAudit] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
      this.prisma.userInvitation.count({ where: { status: "PENDING" } }),
      this.prisma.role.count(),
      this.prisma.role.count({ where: { users: { none: {} } } }),
      this.prisma.permission.count(),
      this.prisma.scoringModel.count(),
      this.prisma.scoringModel.count({ where: { endDate: null } }),
      this.prisma.scoringModel.count({ where: { isShowroomBizDev: true } }),
      this.prisma.showroomEntry.count({ where: { isFeatured: true } }),
      this.prisma.auditLog.count({ where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      this.prisma.auditLog.count({ where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.auditLog.findFirst({ orderBy: { timestamp: "desc" }, select: { timestamp: true } }),
    ]);

    return {
      users: {
        total: userCount,
        active: activeUserCount,
        inactive: userCount - activeUserCount,
        loggedInLast30Days: recentLoginCount,
        pendingInvitations: pendingInvites,
      },
      roles: {
        total: roleCount,
        totalWithNoUsers: rolesWithNoUsers,
      },
      resources: {
        total: permissionCount,
      },
      models: {
        total: modelCount,
        active: activeModelCount,
        inShowroomPool: showroomPoolCount,
        featured: featuredCount,
      },
      analytics: {
        pageViewsToday: 0,
        pageViewsLast7Days: 0,
        activeUsersToday: 0,
        mostVisitedPageToday: "",
      },
      auditLog: {
        actionsToday: auditToday,
        actionsLast7Days: auditWeek,
        lastActionAt: lastAudit?.timestamp?.toISOString() ?? null,
      },
    };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: adminUsersListInputSchema,
    output: paginatedUserSchema,
    meta: { permission: "admin:access" },
  })
  async usersList(@Input() input: z.infer<typeof adminUsersListInputSchema>) {
    const { page = 0, size = 20, search, isActive, roleId } = input;
    const where: Record<string, unknown> = {};
    if (typeof isActive === "boolean") where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }
    if (roleId) {
      where.roles = { some: { roleId } };
    }

    const [content, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { createdAt: "desc" },
        include: {
          roles: {
            include: { role: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = content.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      username: u.username,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      firstLoginAt: u.firstLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    }));

    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: userSummarySchema,
    meta: { permission: "admin:access" },
  })
  async usersGetById(@Input() input: { id: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      firstLoginAt: user.firstLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string(), isActive: z.boolean(), reason: z.string().optional() }),
    output: userSummarySchema,
    meta: { permission: "admin:access" },
  })
  async usersUpdateStatus(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string; isActive: boolean; reason?: string }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: input.id }, include: { roles: { include: { role: true } } } });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    const updated = await this.prisma.user.update({
      where: { id: input.id },
      data: { isActive: input.isActive },
      include: { roles: { include: { role: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "users.updateStatus",
        entityType: "User",
        entityId: user.id,
        entityLabel: user.email,
        changes: { isActive: input.isActive, reason: input.reason },
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      username: updated.username,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
      firstLoginAt: updated.firstLoginAt,
      createdAt: updated.createdAt,
      roles: updated.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string(), roleIds: z.array(z.string()) }),
    output: userSummarySchema,
    meta: { permission: "admin:access" },
  })
  async usersAssignRoles(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string; roleIds: string[] }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: input.id }, include: { roles: { include: { role: true } } } });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: input.id } });
      for (const roleId of input.roleIds) {
        await tx.userRole.create({ data: { userId: input.id, roleId } });
      }
    });
    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.id },
      include: { roles: { include: { role: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "users.assignRoles",
        entityType: "User",
        entityId: user.id,
        entityLabel: user.email,
        changes: { roleIds: input.roleIds },
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      username: updated.username,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
      firstLoginAt: updated.firstLoginAt,
      createdAt: updated.createdAt,
      roles: updated.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  // ─── Invitations ───────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: adminInvitationsListInputSchema,
    output: paginatedInvitationSchema,
    meta: { permission: "admin:access" },
  })
  async invitationsList(@Input() input: z.infer<typeof adminInvitationsListInputSchema>) {
    const { page = 0, size = 20, status, email } = input;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (email) where.email = { contains: email, mode: "insensitive" };

    const [content, total] = await Promise.all([
      this.prisma.userInvitation.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userInvitation.count({ where }),
    ]);

    const items = content.map((i) => ({
      id: i.id,
      email: i.email,
      invitedById: i.invitedById,
      roleIds: i.roleIds,
      status: i.status as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED",
      token: i.token,
      message: i.message,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      acceptedAt: i.acceptedAt,
    }));

    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: userInvitationSchema,
    meta: { permission: "admin:access" },
  })
  async invitationsGetById(@Input() input: { id: string }) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { id: input.id } });
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
    return {
      id: inv.id,
      email: inv.email,
      invitedById: inv.invitedById,
      roleIds: inv.roleIds,
      status: inv.status as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED",
      token: inv.token,
      message: inv.message,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: createInvitationSchema,
    output: userInvitationSchema,
    meta: { permission: "admin:access" },
  })
  async invitationsCreate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof createInvitationSchema>
  ) {
    const existing = await this.prisma.user.findFirst({ where: { email: input.email } });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists" });
    const pending = await this.prisma.userInvitation.findFirst({ where: { email: input.email, status: "PENDING" } });
    if (pending) throw new TRPCError({ code: "CONFLICT", message: "Pending invitation already exists for this email" });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expirationDays ?? 7));
    const token = randomBytes(32).toString("hex");

    const inv = await this.prisma.userInvitation.create({
      data: {
        email: input.email,
        invitedById: ctx.auth?.userId ?? "system",
        roleIds: input.roleIds,
        status: "PENDING",
        token,
        message: input.message ?? null,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "invitations.create",
        entityType: "UserInvitation",
        entityId: inv.id,
        entityLabel: inv.email,
        changes: { roleIds: input.roleIds },
      },
    });

    // TODO: Send email via Nodemailer/Resend placeholder
    return {
      id: inv.id,
      email: inv.email,
      invitedById: inv.invitedById,
      roleIds: inv.roleIds,
      status: inv.status as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED",
      token: inv.token,
      message: inv.message,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }),
    output: userInvitationSchema,
    meta: { permission: "admin:access" },
  })
  async invitationsCancel(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string }
  ) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { id: input.id } });
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
    if (inv.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending invitations can be cancelled" });
    const updated = await this.prisma.userInvitation.update({
      where: { id: input.id },
      data: { status: "CANCELLED" },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "invitations.cancel",
        entityType: "UserInvitation",
        entityId: inv.id,
        entityLabel: inv.email,
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      invitedById: updated.invitedById,
      roleIds: updated.roleIds,
      status: updated.status as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED",
      token: updated.token,
      message: updated.message,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      acceptedAt: updated.acceptedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }),
    output: userInvitationSchema,
    meta: { permission: "admin:access" },
  })
  async invitationsResend(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string }
  ) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { id: input.id } });
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
    if (inv.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending invitations can be resent" });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const token = inv.expiresAt > new Date() ? inv.token : randomBytes(32).toString("hex");
    const updated = await this.prisma.userInvitation.update({
      where: { id: input.id },
      data: { expiresAt, token },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "invitations.resend",
        entityType: "UserInvitation",
        entityId: inv.id,
        entityLabel: inv.email,
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      invitedById: updated.invitedById,
      roleIds: updated.roleIds,
      status: updated.status as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED",
      token: updated.token,
      message: updated.message,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      acceptedAt: updated.acceptedAt,
    };
  }

  /** Public: validate invitation token before Okta redirect */
  @Query({
    input: z.object({ token: z.string() }),
    output: invitationValidationSchema,
  })
  async invitationsValidate(@Input() input: { token: string }) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { token: input.token } });
    if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) {
      return { valid: false, email: null, fullName: null, expiresAt: null };
    }
    return {
      valid: true,
      email: inv.email,
      fullName: null,
      expiresAt: inv.expiresAt.toISOString(),
    };
  }

  /** Public: accept invitation after Okta login (callback creates User + assigns roles) */
  @Mutation({
    input: z.object({ token: z.string(), oktaUserId: z.string() }),
    output: userSummarySchema,
  })
  async invitationsAccept(@Input() input: { token: string; oktaUserId: string }) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { token: input.token } });
    if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired invitation" });
    }
    const existingUser = await this.prisma.user.findUnique({ where: { oktaId: input.oktaUserId } });
    let userWithRoles: { id: string; email: string; fullName: string; username: string; isActive: boolean; lastLoginAt: Date | null; firstLoginAt: Date | null; createdAt: Date; roles: { role: { id: string; name: string } }[] };
    if (!existingUser) {
      userWithRoles = await this.prisma.user.create({
        data: {
          oktaId: input.oktaUserId,
          email: inv.email,
          fullName: inv.email.split("@")[0],
          username: inv.email.split("@")[0],
          firstLoginAt: new Date(),
          lastLoginAt: new Date(),
          roles: { create: inv.roleIds.map((roleId) => ({ roleId })) },
        },
        include: { roles: { include: { role: true } } },
      });
    } else {
      await this.prisma.userRole.deleteMany({ where: { userId: existingUser.id } });
      for (const roleId of inv.roleIds) {
        await this.prisma.userRole.create({ data: { userId: existingUser.id, roleId } });
      }
      userWithRoles = await this.prisma.user.findUniqueOrThrow({
        where: { id: existingUser.id },
        include: { roles: { include: { role: true } } },
      });
    }
    await this.prisma.userInvitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return {
      id: userWithRoles.id,
      email: userWithRoles.email,
      fullName: userWithRoles.fullName,
      username: userWithRoles.username,
      isActive: userWithRoles.isActive,
      lastLoginAt: userWithRoles.lastLoginAt,
      firstLoginAt: userWithRoles.firstLoginAt,
      createdAt: userWithRoles.createdAt,
      roles: userWithRoles.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ page: z.number().int().min(0).default(0), size: z.number().int().min(1).max(100).default(20), search: z.string().optional() }),
    output: paginatedRoleSchema,
    meta: { permission: "admin:access" },
  })
  async rolesList(@Input() input: { page?: number; size?: number; search?: string }) {
    const { page = 0, size = 20, search } = input;
    const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};
    const [content, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { name: "asc" },
        include: {
          _count: { select: { users: true } },
          permissions: { include: { permission: true } },
        },
      }),
      this.prisma.role.count({ where }),
    ]);
    const items = content.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => ({ id: rp.permission.id, code: rp.permission.code })),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: roleWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async rolesGetById(@Input() input: { id: string }) {
    const r = await this.prisma.role.findUnique({
      where: { id: input.id },
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
    });
    if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => ({ id: rp.permission.id, code: rp.permission.code })),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: roleCreateSchema,
    output: roleWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async rolesCreate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof roleCreateSchema>
  ) {
    const existing = await this.prisma.role.findUnique({ where: { name: input.name } });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Role with this name already exists" });
    const r = await this.prisma.role.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissionIds?.length
          ? { create: input.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "roles.create",
        entityType: "Role",
        entityId: r.id,
        entityLabel: r.name,
        changes: { name: r.name },
      },
    });
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => ({ id: rp.permission.id, code: rp.permission.code })),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }).merge(roleUpdateSchema),
    output: roleWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async rolesUpdate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof roleUpdateSchema> & { id: string }
  ) {
    const r = await this.prisma.role.findUnique({ where: { id: input.id } });
    if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
    if (input.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: input.id } });
      for (const permissionId of input.permissionIds) {
        await this.prisma.rolePermission.create({ data: { roleId: input.id, permissionId } });
      }
    }
    const updated = await this.prisma.role.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "roles.update",
        entityType: "Role",
        entityId: r.id,
        entityLabel: r.name,
        changes: input,
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      userCount: updated._count.users,
      permissions: updated.permissions.map((rp) => ({ id: rp.permission.id, code: rp.permission.code })),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string(), name: z.string().min(2) }),
    output: roleWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async rolesClone(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string; name: string }
  ) {
    const source = await this.prisma.role.findUnique({
      where: { id: input.id },
      include: { permissions: true },
    });
    if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
    const existing = await this.prisma.role.findUnique({ where: { name: input.name } });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Role with this name already exists" });
    const r = await this.prisma.role.create({
      data: {
        name: input.name,
        description: source.description ? `${source.description} (cloned)` : null,
        permissions: { create: source.permissions.map((rp) => ({ permissionId: rp.permissionId })) },
      },
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "roles.clone",
        entityType: "Role",
        entityId: r.id,
        entityLabel: r.name,
        changes: { sourceRoleId: input.id },
      },
    });
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => ({ id: rp.permission.id, code: rp.permission.code })),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string(), page: z.number().int().min(0).default(0), size: z.number().int().min(1).max(100).default(20) }),
    output: paginatedUserSchema,
    meta: { permission: "admin:access" },
  })
  async rolesGetUsers(@Input() input: { id: string; page?: number; size?: number }) {
    const { id, page = 0, size = 20 } = input;
    const where = { roles: { some: { roleId: id } } };
    const [content, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { createdAt: "desc" },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    const items = content.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      username: u.username,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      firstLoginAt: u.firstLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    }));
    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ page: z.number().int().min(0).default(0), size: z.number().int().min(1).max(100).default(20), search: z.string().optional(), module: z.string().optional() }),
    output: paginatedPermissionSchema,
    meta: { permission: "admin:access" },
  })
  async permissionsList(@Input() input: { page?: number; size?: number; search?: string; module?: string }) {
    const { page = 0, size = 20, search, module } = input;
    const where: Record<string, unknown> = {};
    if (module) where.module = module;
    if (search) where.OR = [{ code: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];
    const [content, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { code: "asc" },
        include: { _count: { select: { roles: true } } },
      }),
      this.prisma.permission.count({ where }),
    ]);
    const items = content.map((p) => ({
      id: p.id,
      code: p.code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      module: p.module,
      isActive: p.isActive,
      roleCount: p._count.roles,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: permissionWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async permissionsGetById(@Input() input: { id: string }) {
    const p = await this.prisma.permission.findUnique({
      where: { id: input.id },
      include: { _count: { select: { roles: true } } },
    });
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Permission not found" });
    return {
      id: p.id,
      code: p.code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      module: p.module,
      isActive: p.isActive,
      roleCount: p._count.roles,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: permissionCreateSchema,
    output: permissionWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async permissionsCreate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof permissionCreateSchema>
  ) {
    const code = `${input.resource}:${input.action}`;
    const existing = await this.prisma.permission.findUnique({ where: { code } });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Permission with this code already exists" });
    const p = await this.prisma.permission.create({
      data: {
        code,
        resource: input.resource,
        action: input.action,
        description: input.description,
        module: input.module,
      },
      include: { _count: { select: { roles: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "permissions.create",
        entityType: "Permission",
        entityId: p.id,
        entityLabel: p.code,
      },
    });
    return {
      id: p.id,
      code: p.code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      module: p.module,
      isActive: p.isActive,
      roleCount: p._count.roles,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }).merge(permissionUpdateSchema),
    output: permissionWithStatsSchema,
    meta: { permission: "admin:access" },
  })
  async permissionsUpdate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof permissionUpdateSchema> & { id: string }
  ) {
    const p = await this.prisma.permission.findUnique({ where: { id: input.id } });
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Permission not found" });
    const updated = await this.prisma.permission.update({
      where: { id: input.id },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.module !== undefined && { module: input.module }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { _count: { select: { roles: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "permissions.update",
        entityType: "Permission",
        entityId: p.id,
        entityLabel: p.code,
        changes: input,
      },
    });
    return {
      id: updated.id,
      code: updated.code,
      resource: updated.resource,
      action: updated.action,
      description: updated.description,
      module: updated.module,
      isActive: updated.isActive,
      roleCount: updated._count.roles,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ─── Entities (generic CRUD for reference types) ────────────────────────────

  private async entitiesListOne(entity: (typeof ADMIN_ENTITY_TYPES)[number], page: number, size: number) {
    switch (entity) {
      case "ModelStatus": return this.prisma.modelStatus.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "ProductType": return this.prisma.productType.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "ChargeType": return this.prisma.chargeType.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "ExecutionType": return this.prisma.executionType.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "ExecutionFrequency": return this.prisma.executionFrequency.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "Bureau": return this.prisma.bureau.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "OwnerArea": return this.prisma.ownerArea.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "Audience": return this.prisma.audience.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "Purpose": return this.prisma.purpose.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "PublicProfile": return this.prisma.publicProfile.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "BusinessUnit": return this.prisma.businessUnit.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
      case "ProductManager": return this.prisma.productManager.findMany({ skip: page * size, take: size, orderBy: { description: "asc" } });
    }
  }

  private async entitiesCountOne(entity: (typeof ADMIN_ENTITY_TYPES)[number]) {
    switch (entity) {
      case "ModelStatus": return this.prisma.modelStatus.count();
      case "ProductType": return this.prisma.productType.count();
      case "ChargeType": return this.prisma.chargeType.count();
      case "ExecutionType": return this.prisma.executionType.count();
      case "ExecutionFrequency": return this.prisma.executionFrequency.count();
      case "Bureau": return this.prisma.bureau.count();
      case "OwnerArea": return this.prisma.ownerArea.count();
      case "Audience": return this.prisma.audience.count();
      case "Purpose": return this.prisma.purpose.count();
      case "PublicProfile": return this.prisma.publicProfile.count();
      case "BusinessUnit": return this.prisma.businessUnit.count();
      case "ProductManager": return this.prisma.productManager.count();
    }
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({
      entity: z.enum(ADMIN_ENTITY_TYPES as unknown as [string, ...string[]]),
      page: z.number().int().min(0).default(0),
      size: z.number().int().min(1).max(100).default(20),
    }),
    output: paginatedEntitySchema,
    meta: { permission: "admin:access" },
  })
  async entitiesList(@Input() input: { entity: (typeof ADMIN_ENTITY_TYPES)[number]; page?: number; size?: number }) {
    const { entity, page = 0, size = 20 } = input;
    const [content, total] = await Promise.all([
      this.entitiesListOne(entity, page, size),
      this.entitiesCountOne(entity),
    ]);
    const items = (content as { id: string; description: string; isActive: boolean; color?: string }[]).map((r) => ({
      id: r.id,
      description: r.description,
      isActive: r.isActive,
      color: r.color,
    }));
    return {
      content: items,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: items.length,
      empty: items.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ entity: z.enum(ADMIN_ENTITY_TYPES as unknown as [string, ...string[]]) }).merge(entityCreateSchema),
    output: entityItemSchema,
    meta: { permission: "admin:access" },
  })
  async entitiesCreate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof entityCreateSchema> & { entity: (typeof ADMIN_ENTITY_TYPES)[number] }
  ) {
    const { entity, ...data } = input;
    const baseData = { description: data.description, isActive: data.isActive ?? true };
    let created: { id: string; description: string; isActive: boolean; color?: string | null };
    switch (entity) {
      case "ModelStatus": created = await this.prisma.modelStatus.create({ data: baseData }); break;
      case "ProductType": created = await this.prisma.productType.create({ data: { ...baseData, color: data.color ?? null } }); break;
      case "ChargeType": created = await this.prisma.chargeType.create({ data: baseData }); break;
      case "ExecutionType": created = await this.prisma.executionType.create({ data: baseData }); break;
      case "ExecutionFrequency": created = await this.prisma.executionFrequency.create({ data: baseData }); break;
      case "Bureau": created = await this.prisma.bureau.create({ data: baseData }); break;
      case "OwnerArea": created = await this.prisma.ownerArea.create({ data: baseData }); break;
      case "Audience": created = await this.prisma.audience.create({ data: baseData }); break;
      case "Purpose": created = await this.prisma.purpose.create({ data: baseData }); break;
      case "PublicProfile": created = await this.prisma.publicProfile.create({ data: baseData }); break;
      case "BusinessUnit": created = await this.prisma.businessUnit.create({ data: baseData }); break;
      case "ProductManager": created = await this.prisma.productManager.create({ data: baseData }); break;
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "entities.create",
        entityType: entity,
        entityId: created.id,
        entityLabel: created.description,
      },
    });
    return { id: created.id, description: created.description, isActive: created.isActive, color: created.color ?? undefined };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ entity: z.enum(ADMIN_ENTITY_TYPES as unknown as [string, ...string[]]), id: z.string() }).merge(entityUpdateSchema),
    output: entityItemSchema,
    meta: { permission: "admin:access" },
  })
  async entitiesUpdate(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: z.infer<typeof entityUpdateSchema> & { entity: (typeof ADMIN_ENTITY_TYPES)[number]; id: string }
  ) {
    const { entity, id, ...data } = input;
    const updateData: { description?: string; isActive?: boolean; color?: string | null } = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (entity === "ProductType" && data.color !== undefined) updateData.color = data.color;
    let updated: { id: string; description: string; isActive: boolean; color?: string | null };
    switch (entity) {
      case "ModelStatus": updated = await this.prisma.modelStatus.update({ where: { id }, data: updateData }); break;
      case "ProductType": updated = await this.prisma.productType.update({ where: { id }, data: updateData }); break;
      case "ChargeType": updated = await this.prisma.chargeType.update({ where: { id }, data: updateData }); break;
      case "ExecutionType": updated = await this.prisma.executionType.update({ where: { id }, data: updateData }); break;
      case "ExecutionFrequency": updated = await this.prisma.executionFrequency.update({ where: { id }, data: updateData }); break;
      case "Bureau": updated = await this.prisma.bureau.update({ where: { id }, data: updateData }); break;
      case "OwnerArea": updated = await this.prisma.ownerArea.update({ where: { id }, data: updateData }); break;
      case "Audience": updated = await this.prisma.audience.update({ where: { id }, data: updateData }); break;
      case "Purpose": updated = await this.prisma.purpose.update({ where: { id }, data: updateData }); break;
      case "PublicProfile": updated = await this.prisma.publicProfile.update({ where: { id }, data: updateData }); break;
      case "BusinessUnit": updated = await this.prisma.businessUnit.update({ where: { id }, data: updateData }); break;
      case "ProductManager": updated = await this.prisma.productManager.update({ where: { id }, data: updateData }); break;
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "entities.update",
        entityType: entity,
        entityId: id,
        entityLabel: updated.description,
        changes: data,
      },
    });
    return { id: updated.id, description: updated.description, isActive: updated.isActive, color: updated.color ?? undefined };
  }

  // ─── Showroom (admin) ────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ page: z.number().int().min(0).default(0), size: z.number().int().min(1).max(100).default(20), modelName: z.string().optional() }),
    output: paginatedResponseSchema(z.any()),
    meta: { permission: "admin:access" },
  })
  async showroomPoolList(@Input() input: { page?: number; size?: number; modelName?: string }) {
    const { page = 0, size = 20, modelName } = input;
    const where = modelName ? { modelName: { contains: modelName, mode: "insensitive" as const } } : {};
    const [content, total] = await Promise.all([
      this.prisma.showroomEntry.findMany({ where, skip: page * size, take: size, orderBy: { addedAt: "desc" } }),
      this.prisma.showroomEntry.count({ where }),
    ]);
    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: content.length,
      empty: content.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ modelId: z.string() }),
    output: z.any(),
    meta: { permission: "admin:access" },
  })
  async showroomAdd(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { modelId: string }
  ) {
    const model = await this.prisma.scoringModel.findUnique({ where: { id: input.modelId }, include: { status: true } });
    if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });
    const existing = await this.prisma.showroomEntry.findUnique({ where: { modelId: input.modelId } });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Model already in showroom" });
    const entry = await this.prisma.showroomEntry.create({
      data: {
        modelId: input.modelId,
        modelName: model.name,
        modelStatus: model.status?.description ?? "Unknown",
        addedById: ctx.auth?.userId ?? "system",
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "showroom.add",
        entityType: "ShowroomEntry",
        entityId: entry.id,
        entityLabel: model.name,
      },
    });
    return entry;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.any(),
    meta: { permission: "admin:access" },
  })
  async showroomRemove(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { id: string }
  ) {
    const entry = await this.prisma.showroomEntry.findUnique({ where: { id: input.id } });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Showroom entry not found" });
    await this.prisma.showroomEntry.delete({ where: { id: input.id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.auth?.userId ?? "system",
        actorName: ctx.auth?.userEmail ?? "system",
        action: "showroom.remove",
        entityType: "ShowroomEntry",
        entityId: input.id,
        entityLabel: entry.modelName,
      },
    });
    return { success: true };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ ids: z.array(z.string()) }),
    output: z.any(),
    meta: { permission: "admin:access" },
  })
  async showroomReorderFeatured(
    @Ctx() ctx: { auth?: TrpcContextUser },
    @Input() input: { ids: string[] }
  ) {
    const config = await this.prisma.showroomConfig.findUnique({ where: { id: "singleton" } });
    const maxFeatured = config?.maxFeatured ?? 5;
    if (input.ids.length > maxFeatured) throw new TRPCError({ code: "BAD_REQUEST", message: `Max ${maxFeatured} featured models allowed` });
    for (let i = 0; i < input.ids.length; i++) {
      await this.prisma.showroomEntry.update({
        where: { id: input.ids[i] },
        data: { isFeatured: true, featuredPosition: i },
      });
    }
    await this.prisma.showroomEntry.updateMany({
      where: { id: { notIn: input.ids } },
      data: { isFeatured: false, featuredPosition: null },
    });
    return { success: true };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    output: z.any(),
    meta: { permission: "admin:access" },
  })
  async showroomConfig() {
    return this.prisma.showroomConfig.findUnique({ where: { id: "singleton" } }) ?? { maxFeatured: 5, autoSyncFromFlag: true, poolTitle: "Showroom Pool", featuredTitle: "Featured Models" };
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  @Mutation({
    input: analyticsEventBatchSchema,
    output: z.object({ accepted: z.number() }),
  })
  async analyticsIngest(@Input() input: z.infer<typeof analyticsEventBatchSchema>) {
    const toCreate = input.events.map((e) => ({
      sessionId: e.sessionId,
      userId: e.userId,
      eventType: e.eventType,
      page: e.page ?? null,
      referrer: e.referrer ?? null,
      entityType: e.entityType ?? null,
      entityId: e.entityId ?? null,
      featureName: e.featureName ?? null,
      actionLabel: e.actionLabel ?? null,
      duration: e.duration ?? null,
      loadTime: e.loadTime ?? null,
      metadata: (e.metadata ?? null) as object | null,
      timestamp: e.timestamp ?? new Date(),
    }));
    await this.prisma.analyticsEvent.createMany({ data: toCreate });
    return { accepted: toCreate.length };
  }

  // ─── Audit Log ──────────────────────────────────────────────────────────────

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: auditLogListInputSchema,
    output: paginatedAuditSchema,
    meta: { permission: "admin:access" },
  })
  async auditLogList(@Input() input: z.infer<typeof auditLogListInputSchema>) {
    const { page = 0, size = 20, entityType, actorId, action } = input;
    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;
    if (action) where.action = { contains: action, mode: "insensitive" };
    const [content, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { timestamp: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      last: page >= Math.ceil(total / size) - 1,
      first: page === 0,
      size,
      number: page,
      numberOfElements: content.length,
      empty: content.length === 0,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: z.any(),
    meta: { permission: "admin:access" },
  })
  async auditLogGetById(@Input() input: { id: string }) {
    const entry = await this.prisma.auditLog.findUnique({ where: { id: input.id } });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Audit log entry not found" });
    return entry;
  }
}
