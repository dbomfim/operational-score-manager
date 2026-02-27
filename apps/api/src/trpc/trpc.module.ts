import { Module } from "@nestjs/common";
import { TRPCModule } from "nestjs-trpc";
import { TrpcContext } from "./trpc.context";
import { ProtectedMiddleware } from "./protected.middleware";
import { AuthRouter } from "./routers/auth.router";
import { SecurityRouter } from "./routers/security.router";

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
    AuthRouter,
    SecurityRouter,
  ],
})
export class TrpcModule {}
