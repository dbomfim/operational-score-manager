import { Inject } from "@nestjs/common";
import { Ctx, Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import type { ProtectedContext } from "./auth.router";
import { PrismaService } from "../../prisma/prisma.service";
import {
  categorySchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  paginationInputSchema,
  paginatedResponseSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";
import { TRPCError } from "@trpc/server";

const paginatedCategorySchema = paginatedResponseSchema(categorySchema);

@Router({ alias: "categories" })
export class CategoriesRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: paginationInputSchema,
    output: paginatedCategorySchema,
    meta: { permission: "categories:list" },
  })
  async list(@Input() input: z.infer<typeof paginationInputSchema>) {
    const { page = 0, size = 20 } = input;
    const [content, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        skip: page * size,
        take: size,
        orderBy: { name: "asc" },
      }),
      this.prisma.category.count({ where: { isActive: true } }),
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
    output: z.array(categorySchema),
    meta: { permission: "categories:list" },
  })
  async listAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: categorySchema,
    meta: { permission: "categories:read" },
  })
  async getById(@Input("id") id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
    return category;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: categoryCreateSchema,
    output: categorySchema,
    meta: { permission: "categories:create" },
  })
  async create(@Input() input: z.infer<typeof categoryCreateSchema>) {
    return this.prisma.category.create({ data: input });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }).merge(categoryUpdateSchema),
    output: categorySchema,
    meta: { permission: "categories:update" },
  })
  async update(@Input() input: { id: string } & z.infer<typeof categoryUpdateSchema>) {
    const { id, ...data } = input;
    return this.prisma.category.update({ where: { id }, data });
  }
}
