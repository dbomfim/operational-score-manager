import { Controller, Post, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("upload")
export class UploadController {
  @Post("template")
  @UseInterceptors(FileInterceptor("file"))
  uploadTemplate(@UploadedFile() file?: { originalname?: string }) {
    return { success: true, filename: file?.originalname ?? "unknown" };
  }

  @Post("validate-variables")
  @UseInterceptors(FileInterceptor("file"))
  validateVariables(@UploadedFile() file?: { originalname?: string }) {
    return { success: true, filename: file?.originalname ?? "unknown" };
  }
}
