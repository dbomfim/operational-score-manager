import { z } from "zod";

export const scoringModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  clientId: z.string().nullable(),
  productManagerId: z.string().nullable(),
  strategicGroup: z.string().nullable(),
  ownerAreaId: z.string().nullable(),
  audienceId: z.string().nullable(),
  productTypeId: z.string().nullable(),
  chargeTypeId: z.string().nullable(),
  statusId: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  dragonizationDate: z.date().nullable(),
  modelAge: z.number().nullable(),
  executionFrequencyId: z.string().nullable(),
  executionTypeId: z.string().nullable(),
  bureauId: z.string().nullable(),
  rangeStart: z.number().nullable(),
  rangeEnd: z.number().nullable(),
  returnsFlag: z.boolean(),
  hasBacktest: z.boolean(),
  isShowroomBizDev: z.boolean(),
  autoExclusion: z.boolean(),
  availableForDelivery: z.boolean(),
  recalibration: z.boolean(),
  clientVariables: z.boolean(),
  highVolume: z.boolean(),
  recurringDeliveries: z.boolean(),
  purposeId: z.string().nullable(),
  publicProfileId: z.string().nullable(),
  businessUnitId: z.string().nullable(),
  appliedFilters: z.string().nullable(),
  specificRules: z.string().nullable(),
  notes: z.string().nullable(),
  text: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export type ScoringModel = z.infer<typeof scoringModelSchema>;

export const scoringModelCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().optional(),
  productManagerId: z.string().optional(),
  strategicGroup: z.string().optional(),
  ownerAreaId: z.string().optional(),
  audienceId: z.string().optional(),
  productTypeId: z.string().optional(),
  chargeTypeId: z.string().optional(),
  statusId: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  dragonizationDate: z.coerce.date().optional(),
  modelAge: z.number().optional(),
  executionFrequencyId: z.string().optional(),
  executionTypeId: z.string().optional(),
  bureauId: z.string().optional(),
  rangeStart: z.number().optional(),
  rangeEnd: z.number().optional(),
  returnsFlag: z.boolean().optional(),
  hasBacktest: z.boolean().optional(),
  isShowroomBizDev: z.boolean().optional(),
  autoExclusion: z.boolean().optional(),
  availableForDelivery: z.boolean().optional(),
  recalibration: z.boolean().optional(),
  clientVariables: z.boolean().optional(),
  highVolume: z.boolean().optional(),
  recurringDeliveries: z.boolean().optional(),
  purposeId: z.string().optional(),
  publicProfileId: z.string().optional(),
  businessUnitId: z.string().optional(),
  appliedFilters: z.string().optional(),
  specificRules: z.string().optional(),
  notes: z.string().optional(),
  text: z.string().optional(),
});

export type ScoringModelCreate = z.infer<typeof scoringModelCreateSchema>;

export const scoringModelUpdateSchema = scoringModelCreateSchema.partial();

export type ScoringModelUpdate = z.infer<typeof scoringModelUpdateSchema>;

export const modelListFilterSchema = z.object({
  statusId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
}).optional();

export type ModelListFilter = z.infer<typeof modelListFilterSchema>;
