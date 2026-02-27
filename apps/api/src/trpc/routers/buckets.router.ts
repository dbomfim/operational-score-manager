import { Inject } from "@nestjs/common";
import { Input, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  bucketSchema,
  bucketCreateSchema,
  bucketUpdateSchema,
  bucketEditInfoSchema,
  paginationInputSchema,
  paginatedResponseSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";
import { TRPCError } from "@trpc/server";

const paginatedBucketSchema = paginatedResponseSchema(bucketSchema);

@Router({ alias: "buckets" })
export class BucketsRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: paginationInputSchema,
    output: paginatedBucketSchema,
    meta: { permission: "buckets:list" },
  })
  async list(@Input() input: z.infer<typeof paginationInputSchema>) {
    const { page = 0, size = 20 } = input;
    const [content, total] = await Promise.all([
      this.prisma.bucket.findMany({
        where: { isActive: true },
        skip: page * size,
        take: size,
        orderBy: { name: "asc" },
        include: { category: true },
      }),
      this.prisma.bucket.count({ where: { isActive: true } }),
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
    output: z.array(bucketSchema),
    meta: { permission: "buckets:list" },
  })
  async listAll() {
    return this.prisma.bucket.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: bucketEditInfoSchema,
    meta: { permission: "buckets:read" },
  })
  async getEditInfo(@Input("id") id: string) {
    const bucket = await this.prisma.bucket.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!bucket) throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
    return {
      ...bucket,
      category: bucket.category ? { id: bucket.category.id, name: bucket.category.name } : undefined,
    };
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: bucketCreateSchema,
    output: bucketSchema,
    meta: { permission: "buckets:create" },
  })
  async create(@Input() input: z.infer<typeof bucketCreateSchema>) {
    return this.prisma.bucket.create({ data: input });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Mutation({
    input: z.object({ id: z.string() }).merge(bucketUpdateSchema),
    output: bucketSchema,
    meta: { permission: "buckets:update" },
  })
  async update(@Input() input: { id: string } & z.infer<typeof bucketUpdateSchema>) {
    const { id, ...data } = input;
    return this.prisma.bucket.update({ where: { id }, data });
  }
}
