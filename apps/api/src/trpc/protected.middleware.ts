import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import type { TRPCMiddleware, MiddlewareOptions } from "nestjs-trpc";
import type { TrpcContextShape, TrpcContextUser } from "./trpc.context";

@Injectable()
export class ProtectedMiddleware implements TRPCMiddleware {
  use(opts: MiddlewareOptions): ReturnType<TRPCMiddleware["use"]> {
    const { ctx, next } = opts;
    const trpcCtx = ctx as TrpcContextShape;
    if (!trpcCtx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return next({ ctx: { auth: trpcCtx.user } });
  }
}
