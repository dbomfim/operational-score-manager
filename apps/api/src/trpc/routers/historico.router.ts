import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  historicoListInputSchema,
  historicoItemSchema,
  historicoGraficoItemSchema,
  historicoFilterSchema,
  paginatedResponseSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";
import { WithPermissionMiddleware } from "../with-permission.middleware";
import { TRPCError } from "@trpc/server";

const paginatedHistoricoSchema = paginatedResponseSchema(historicoItemSchema);

@Router({ alias: "historico" })
export class HistoricoRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: historicoListInputSchema,
    output: paginatedHistoricoSchema,
    meta: { permission: "historico:list" },
  })
  async list(
    @Input()
    input: z.infer<typeof historicoListInputSchema>
  ) {
    const { page = 0, size = 20, filter } = input;
    const where = this.buildWhere(filter);
    const all = await this.prisma.queryHistory.findMany({
      where,
      orderBy: { queriedAt: "desc" },
    });
    const grouped = this.aggregateByDateAndModel(all);
    const total = grouped.length;
    const start = page * size;
    const content = grouped.slice(start, start + size).map((g, i) => ({
      id: `${g.dataConsulta}|${g.modelo}`,
      modelo: g.modelo,
      dataConsulta: g.dataConsulta,
      quantidadeConsultas: g.quantidadeConsultas,
    }));
    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size) || 1,
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
    input: historicoFilterSchema,
    output: z.array(historicoGraficoItemSchema),
    meta: { permission: "historico:list" },
  })
  async grafico(@Input() filter: z.infer<typeof historicoFilterSchema>) {
    const where = this.buildWhere(filter);
    const all = await this.prisma.queryHistory.findMany({
      where,
      orderBy: { queriedAt: "asc" },
    });
    const byDate = new Map<string, number>();
    for (const r of all) {
      const d = r.queriedAt.toISOString().slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, quantidadeConsultas]) => ({ data, quantidadeConsultas }));
  }

  @UseMiddlewares(ProtectedMiddleware, WithPermissionMiddleware)
  @Query({
    input: z.object({ id: z.string() }),
    output: historicoItemSchema,
    meta: { permission: "historico:list" },
  })
  async getById(@Input("id") id: string) {
    const [dataConsulta, modelo] = id.split("|");
    if (!dataConsulta || !modelo) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
    }
    const start = new Date(dataConsulta);
    const end = new Date(dataConsulta);
    end.setDate(end.getDate() + 1);
    const count = await this.prisma.queryHistory.count({
      where: {
        modelName: modelo,
        queriedAt: { gte: start, lt: end },
      },
    });
    return {
      id,
      modelo,
      dataConsulta,
      quantidadeConsultas: count,
    };
  }

  private buildWhere(filter?: { dataInicio?: string; dataFim?: string; modelo?: string }) {
    const where: Record<string, unknown> = {};
    if (filter?.modelo) {
      where.modelName = { contains: filter.modelo, mode: "insensitive" as const };
    }
    if (filter?.dataInicio || filter?.dataFim) {
      where.queriedAt = {};
      if (filter.dataInicio) {
        (where.queriedAt as Record<string, Date>).gte = new Date(filter.dataInicio);
      }
      if (filter.dataFim) {
        const end = new Date(filter.dataFim);
        end.setDate(end.getDate() + 1);
        (where.queriedAt as Record<string, Date>).lt = end;
      }
    }
    return where;
  }

  private aggregateByDateAndModel(
    records: { modelName: string; queriedAt: Date }[]
  ): { dataConsulta: string; modelo: string; quantidadeConsultas: number }[] {
    const map = new Map<string, number>();
    for (const r of records) {
      const d = r.queriedAt.toISOString().slice(0, 10);
      const key = `${d}|${r.modelName}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, quantidadeConsultas]) => {
        const [dataConsulta, modelo] = key.split("|");
        return { dataConsulta, modelo, quantidadeConsultas };
      })
      .sort((a, b) => b.dataConsulta.localeCompare(a.dataConsulta) || a.modelo.localeCompare(b.modelo));
  }
}
