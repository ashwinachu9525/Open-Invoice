import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error("❌ Please provide the email address of the user.")
    console.error("Usage: npx tsx scripts/make-super-admin.ts <user@email.com>")
    process.exit(1)
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' }
    })
    console.log(`✅ Success! User ${user.email} has been promoted to SUPER_ADMIN.`)
    console.log(`They can now access the centralized dashboard at /admin`)
  } catch (error) {
    console.error(`❌ Failed to update user. Are you sure a user with email "${email}" exists?`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
