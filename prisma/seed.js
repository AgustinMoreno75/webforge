import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../server/lib/prisma.js'
import { loadCoreAccountsSeedFromEnv, seedCoreAccounts } from '../server/bootstrap/coreAccounts.js'

export async function runSeed() {
  const coreAccounts = loadCoreAccountsSeedFromEnv()
  await seedCoreAccounts(coreAccounts)
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isDirectExecution) {
  runSeed()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}