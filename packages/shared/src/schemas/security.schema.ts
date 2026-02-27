import { z } from "zod";

export const securityMeOutputSchema = z.object({
  userId: z.string(),
  email: z.string(),
  fullName: z.string(),
  permissions: z.array(z.string()),
});

export type SecurityMeOutput = z.infer<typeof securityMeOutputSchema>;
