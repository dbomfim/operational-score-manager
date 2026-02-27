import { z } from "zod";

export const historicoFilterSchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  modelo: z.string().optional(),
});

export const historicoListInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  filter: historicoFilterSchema.optional(),
});

export const historicoItemSchema = z.object({
  id: z.string(),
  modelo: z.string(),
  dataConsulta: z.string(),
  quantidadeConsultas: z.number(),
});

export const historicoGraficoItemSchema = z.object({
  data: z.string(),
  quantidadeConsultas: z.number(),
});
