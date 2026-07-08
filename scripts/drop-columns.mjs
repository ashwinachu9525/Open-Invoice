import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FeatureRequest" DROP COLUMN IF EXISTS "category", DROP COLUMN IF EXISTS "imageUrl", DROP COLUMN IF EXISTS "mergedIntoId";`)
    console.log("Columns dropped successfully")
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
