import { z } from "zod";

export const paginationInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    content: z.array(itemSchema),
    totalElements: z.number(),
    totalPages: z.number(),
    last: z.boolean(),
    first: z.boolean(),
    size: z.number(),
    number: z.number(),
    numberOfElements: z.number(),
    empty: z.boolean(),
  });

export type PaginatedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
};
