import { z } from "zod";

export const userInfoPayloadSchema = z.object({
  id: z.string(),
  oktaId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  username: z.string(),
  isActive: z.boolean(),
});

export type UserInfoPayload = z.infer<typeof userInfoPayloadSchema>;

export const renewTokenOutputSchema = z.object({
  accessToken: z.string(),
});

export type RenewTokenOutput = z.infer<typeof renewTokenOutputSchema>;
