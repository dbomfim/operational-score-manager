import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import { lookupConfigsSchema, lookupEntitySchema, LOOKUP_ENTITIES } from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";

type LookupRow = { id: string; description: string; isActive: boolean; name?: string; color?: string };

@Router({ alias: "lookup" })
export class LookupRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  private async fetchEntity(entity: string): Promise<LookupRow[]> {
    const toRow = (r: { id: string; description: string; isActive: boolean } & Record<string, unknown>): LookupRow => ({
      id: r.id,
      description: r.description,
      isActive: r.isActive,
      name: r.name as string | undefined,
      color: r.color as string | undefined,
    });

    switch (entity) {
      case "ModelStatus":
        return (await this.prisma.modelStatus.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "ProductType":
        return (await this.prisma.productType.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "ChargeType":
        return (await this.prisma.chargeType.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "ExecutionType":
        return (await this.prisma.executionType.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "ExecutionFrequency":
        return (await this.prisma.executionFrequency.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "Bureau":
        return (await this.prisma.bureau.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "OwnerArea":
        return (await this.prisma.ownerArea.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "Audience":
        return (await this.prisma.audience.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "Purpose":
        return (await this.prisma.purpose.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "PublicProfile":
        return (await this.prisma.publicProfile.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "BusinessUnit":
        return (await this.prisma.businessUnit.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      case "ProductManager":
        return (await this.prisma.productManager.findMany({ where: { isActive: true }, orderBy: { description: "asc" } })).map(toRow);
      default:
        return [];
    }
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    output: lookupConfigsSchema,
    meta: { permission: "models:list" },
  })
  async all() {
    const configs: Record<string, LookupRow[]> = {};
    for (const entity of LOOKUP_ENTITIES) {
      configs[entity] = await this.fetchEntity(entity);
    }
    return configs;
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ entity: z.enum(["ModelStatus", "ProductType", "ChargeType", "ExecutionType", "ExecutionFrequency", "Bureau", "OwnerArea", "Audience", "Purpose", "PublicProfile", "BusinessUnit", "ProductManager"]) }),
    output: z.array(lookupEntitySchema),
    meta: { permission: "models:list" },
  })
  async byEntity(@Input("entity") entity: string) {
    return this.fetchEntity(entity);
  }
}
