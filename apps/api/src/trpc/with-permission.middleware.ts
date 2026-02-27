import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import type { TRPCMiddleware, MiddlewareOptions } from "nestjs-trpc";
import type { TrpcContextUser } from "./trpc.context";

export interface PermissionMeta {
  permission?: string;
}

function hasPermission(user: TrpcContextUser, required: string): boolean {
  if (user.permissions.includes("admin:super")) return true;
  if (user.permissions.includes(required)) return true;
  const [resource, action] = required.split(":");
  const wildcard = `${resource}:*`;
  return user.permissions.includes(wildcard);
}

@Injectable()
export class WithPermissionMiddleware implements TRPCMiddleware<PermissionMeta> {
  use(opts: MiddlewareOptions<object, object, PermissionMeta>): ReturnType<TRPCMiddleware["use"]> {
    const { ctx, meta, next } = opts;
    const auth = (ctx as { auth?: TrpcContextUser }).auth;
    const required = meta?.permission;

    if (!required) return next();
    if (!auth) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }
    if (!hasPermission(auth, required)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission required: ${required}`,
      });
    }
    return next();
  }
}
