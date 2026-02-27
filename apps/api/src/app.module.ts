import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { TrpcModule } from "./trpc/trpc.module";
import { HealthController } from "./health.controller";
import { UploadController } from "./upload.controller";

@Module({
  imports: [PrismaModule, TrpcModule],
  controllers: [HealthController, UploadController],
})
export class AppModule {}
