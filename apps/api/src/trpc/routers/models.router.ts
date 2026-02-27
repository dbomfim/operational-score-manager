import { Inject } from "@nestjs/common";
import { Ctx, Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import type { ProtectedContext } from "./auth.router";
import { PrismaService } from "../../prisma/prisma.service";
import {
  scoringModelSchema,
  scoringModelCreateSchema,
  scoringModelUpdateSchema,
  paginationInputSchema,
  paginatedResponseSchema,
  auditLogEntrySchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";
import { TRPCError } from "@trpc/server";

const paginatedModelSchema = paginatedResponseSchema(scoringModelSchema);
const modelListInputSchema = paginationInputSchema.extend({
  statusId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
});

@Router({ alias: "models" })
export class ModelsRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: modelListInputSchema,
    output: paginatedModelSchema,
    meta: { permission: "models:list" },
  })
  async list(@Input() input: z.infer<typeof modelListInputSchema>) {
    const { page = 0, size = 20, sort, statusId, clientId, search } = input;
    const where: Record<string, unknown> = {};
    if (statusId) where.statusId = statusId;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [sortField, sortDir] = (sort || "name,asc").split(",");
    const orderBy = { [sortField || "name"]: sortDir === "desc" ? "desc" as const : "asc" as const };

    const [content, total] = await Promise.all([
      this.prisma.scoringModel.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy,
        include: { client: true, status: true },
      }),
      this.prisma.scoringModel.count({ where }),
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
    output: scoringModelSchema,
    meta: { permission: "models:read" },
  })
  async getById(@Input("id") id: string) {
    const model = await this.prisma.scoringModel.findUnique({
      where: { id },
      include: { client: true, status: true },
    });
    if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });
    return model;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: z.array(auditLogEntrySchema),
    meta: { permission: "models:read" },
  })
  async getAudit(@Input("id") id: string) {
    const entries = await this.prisma.auditLog.findMany({
      where: { entityType: "ScoringModel", entityId: id },
      orderBy: { timestamp: "desc" },
    });
    return entries;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: scoringModelCreateSchema,
    output: scoringModelSchema,
    meta: { permission: "models:create" },
  })
  async create(
    @Ctx() ctx: ProtectedContext,
    @Input() input: z.infer<typeof scoringModelCreateSchema>
  ) {
    const data = scoringModelCreateSchema.parse(input);
    const model = await this.prisma.scoringModel.create({
      data: { ...data, createdBy: ctx.auth.userId, updatedBy: ctx.auth.userId },
      include: { client: true, status: true },
    });
    return model;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: scoringModelUpdateSchema.extend({ id: z.string() }),
    output: scoringModelSchema,
    meta: { permission: "models:update" },
  })
  async update(
    @Ctx() ctx: ProtectedContext,
    @Input() input: { id: string } & z.infer<typeof scoringModelUpdateSchema>
  ) {
    const { id, ...data } = input;
    const model = await this.prisma.scoringModel.update({
      where: { id },
      data: { ...data, updatedBy: ctx.auth.userId },
      include: { client: true, status: true },
    });
    return model;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ modelIds: z.array(z.string()) }),
    output: z.object({ synced: z.number() }),
    meta: { permission: "models:sync" },
  })
  async sync() {
    return { synced: 0 };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }),
    output: scoringModelSchema,
    meta: { permission: "models:sync" },
  })
  async syncOne(@Input("id") id: string) {
    const model = await this.prisma.scoringModel.findUnique({ where: { id } });
    if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });
    return model;
  }
}
