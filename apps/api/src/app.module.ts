import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { TrpcModule } from "./trpc/trpc.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PrismaModule, TrpcModule],
  controllers: [HealthController],
})
export class AppModule {}
