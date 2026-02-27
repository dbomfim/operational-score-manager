import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import { clientSchema } from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";
import { TRPCError } from "@trpc/server";

@Router({ alias: "clients" })
export class ClientsRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    output: z.array(clientSchema),
    meta: { permission: "clients:list" },
  })
  async list() {
    return this.prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: clientSchema,
    meta: { permission: "clients:read" },
  })
  async getById(@Input("id") id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    return client;
  }
}
