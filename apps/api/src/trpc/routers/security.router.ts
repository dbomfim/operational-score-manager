import { Inject } from "@nestjs/common";
import { Ctx, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { ProtectedContext } from "./auth.router";
import { PrismaService } from "../../prisma/prisma.service";
import { securityMeOutputSchema } from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";

@Router({ alias: "security" })
export class SecurityRouter {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @UseMiddlewares(ProtectedMiddleware)
  @Query({ output: securityMeOutputSchema })
  async me(@Ctx() ctx: ProtectedContext) {
    const { auth } = ctx;

    // Find user by oktaId (or userId as fallback)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ oktaId: auth.userId }, { id: auth.userId }],
        isActive: true,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions: string[] = [];
    if (user) {
      for (const ur of user.roles) {
        if (ur.role.isActive) {
          for (const rp of ur.role.permissions) {
            if (rp.permission.isActive && !rp.permission.deprecatedAt) {
              permissions.push(rp.permission.code);
            }
          }
        }
      }
    }

    return {
      userId: auth.userId,
      email: auth.userEmail,
      fullName: user?.fullName ?? auth.userEmail.split("@")[0],
      permissions: [...new Set(permissions)],
    };
  }
}
