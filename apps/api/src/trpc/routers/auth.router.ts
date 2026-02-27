import { Ctx, Mutation, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { TrpcContextUser } from "../trpc.context";

export type ProtectedContext = { auth: TrpcContextUser };
import {
  userInfoPayloadSchema,
  renewTokenOutputSchema,
} from "@osm/shared";
import { ProtectedMiddleware } from "../protected.middleware";

@Router({ alias: "auth" })
export class AuthRouter {
  @UseMiddlewares(ProtectedMiddleware)
  @Query({ output: userInfoPayloadSchema })
  async me(@Ctx() ctx: ProtectedContext) {
    const { auth } = ctx;
    return {
      id: auth.userId,
      oktaId: auth.oktaId ?? auth.userId,
      email: auth.userEmail,
      fullName: auth.userEmail.split("@")[0],
      username: auth.userEmail.split("@")[0],
      isActive: true,
    };
  }

  @UseMiddlewares(ProtectedMiddleware)
  @Mutation({ output: renewTokenOutputSchema })
  async renewToken(@Ctx() ctx: ProtectedContext) {
    // Phase 1: Return current token. Full Okta token renewal in later phase.
    const { auth } = ctx;
    return {
      accessToken: auth.accessToken ?? "renewed-token-placeholder",
    };
  }
}
