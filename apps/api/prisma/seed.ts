import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.modelStatus.count();
  if (count === 0) {
    await prisma.modelStatus.createMany({
      data: [
        { description: "Active", isActive: true },
        { description: "Inactive", isActive: true },
      ],
    });
    console.log("Created default ModelStatus records");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
