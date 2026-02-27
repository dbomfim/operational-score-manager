import { Injectable } from "@nestjs/common";
import { ContextOptions, TRPCContext } from "nestjs-trpc";
import * as jose from "jose";

export interface TrpcContextUser {
  userId: string;
  userEmail: string;
  oktaId?: string;
  accessToken?: string;
}

export interface TrpcContextShape {
  user: TrpcContextUser | null;
}

@Injectable()
export class TrpcContext implements TRPCContext {
  async create(opts: ContextOptions): Promise<Record<string, unknown>> {
    const authHeader = opts.req?.headers?.authorization;
    let user: TrpcContextUser | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const secret =
          process.env.JWT_SECRET || "dev-secret-change-in-production";
        const { payload } = await jose.jwtVerify(
          token,
          new TextEncoder().encode(secret)
        );
        const sub = payload.sub as string;
        const email =
          (payload.email as string) ||
          (payload.preferred_username as string) ||
          sub;
        user = {
          userId: sub,
          userEmail: email,
          oktaId: sub,
          accessToken: token,
        };
      } catch {
        user = null;
      }
    }

    return { user } as Record<string, unknown>;
  }
}
