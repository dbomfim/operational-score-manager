import { Module } from "@nestjs/common";
import { TRPCModule } from "nestjs-trpc";
import { TrpcContext } from "./trpc.context";
import { ProtectedMiddleware } from "./protected.middleware";
import { WithPermissionMiddleware } from "./with-permission.middleware";
import { AuthRouter } from "./routers/auth.router";
import { SecurityRouter } from "./routers/security.router";
import { ModelsRouter } from "./routers/models.router";
import { ClientsRouter } from "./routers/clients.router";
import { CategoriesRouter } from "./routers/categories.router";
import { BucketsRouter } from "./routers/buckets.router";
import { ShowroomRouter } from "./routers/showroom.router";
import { LookupRouter } from "./routers/lookup.router";

@Module({
  imports: [
    TRPCModule.forRoot({
      basePath: "/trpc",
      context: TrpcContext,
    }),
  ],
  providers: [
    TrpcContext,
    ProtectedMiddleware,
    WithPermissionMiddleware,
    AuthRouter,
    SecurityRouter,
    ModelsRouter,
    ClientsRouter,
    CategoriesRouter,
    BucketsRouter,
    ShowroomRouter,
    LookupRouter,
  ],
})
export class TrpcModule {}
