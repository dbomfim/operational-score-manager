import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  showroomEntrySchema,
  showroomReportSchema,
  paginationInputSchema,
  paginatedResponseSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";

const paginatedShowroomSchema = paginatedResponseSchema(showroomEntrySchema);

@Router({ alias: "showroom" })
export class ShowroomRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: paginationInputSchema.extend({
      modelName: z.string().optional(),
    }),
    output: paginatedShowroomSchema,
    meta: { permission: "showroom:view" },
  })
  async list(@Input() input: z.infer<typeof paginationInputSchema> & { modelName?: string }) {
    const { page = 0, size = 20, modelName } = input;
    const where = modelName ? { modelName: { contains: modelName, mode: "insensitive" as const } } : {};
    const [content, total] = await Promise.all([
      this.prisma.showroomEntry.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { addedAt: "desc" },
      }),
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
  @Query({
    output: z.array(showroomEntrySchema),
    meta: { permission: "showroom:view" },
  })
  async featured() {
    return this.prisma.showroomEntry.findMany({
      where: { isFeatured: true },
      orderBy: { featuredPosition: "asc" },
    });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({
      dataInicio: z.coerce.date(),
      dataFim: z.coerce.date(),
    }),
    output: showroomReportSchema,
    meta: { permission: "showroom:reports" },
  })
  async reports(@Input() input: { dataInicio: Date; dataFim: Date }) {
    return [];
  }
}
