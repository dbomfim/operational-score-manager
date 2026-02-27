import { Inject, Injectable } from "@nestjs/common";
import { ContextOptions, TRPCContext } from "nestjs-trpc";
import * as jose from "jose";
import { PrismaService } from "../prisma/prisma.service";

export interface TrpcContextUser {
  userId: string;
  userEmail: string;
  oktaId?: string;
  accessToken?: string;
  permissions: string[];
}

export interface TrpcContextShape {
  user: TrpcContextUser | null;
}

@Injectable()
export class TrpcContext implements TRPCContext {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async create(opts: ContextOptions): Promise<Record<string, unknown>> {
    const authHeader = opts.req?.headers?.authorization;
    let user: TrpcContextUser | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // Dev mock: accept "mock-token" in development for local testing
      if (
        token === "mock-token" &&
        process.env.NODE_ENV !== "production"
      ) {
        user = {
          userId: "mock-user-id",
          userEmail: "mock@localhost",
          oktaId: "mock-okta-id",
          accessToken: token,
          permissions: ["admin:super", "admin:access", "models:list", "clients:list", "categories:list", "categories:create", "categories:update", "buckets:list", "buckets:create", "buckets:update", "showroom:view", "historico:list"],
        };
      } else {
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

          const permissions = await this.loadPermissions(sub);
          user = {
            userId: sub,
            userEmail: email,
            oktaId: sub,
            accessToken: token,
            permissions,
          };
        } catch {
          user = null;
        }
      }
    }

    return { user } as Record<string, unknown>;
  }

  private async loadPermissions(oktaId: string): Promise<string[]> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ oktaId }, { id: oktaId }], isActive: true },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    const codes: string[] = [];
    if (user) {
      for (const ur of user.roles) {
        if (ur.role.isActive) {
          for (const rp of ur.role.permissions) {
            if (rp.permission.isActive && !rp.permission.deprecatedAt) {
              codes.push(rp.permission.code);
            }
          }
        }
      }
    }
    return [...new Set(codes)];
  }
}
