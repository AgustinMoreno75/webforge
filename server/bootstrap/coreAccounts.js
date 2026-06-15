import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { setMustChangePassword } from '../lib/securityStore.js'

// Cuenta interna que NO se crea por registro público (el registro siempre genera LEAD).
// Se siembra con `npm run db:seed`. Si no hay variables CORE_ACCOUNT_*, se usan
// las credenciales por defecto definidas debajo.
const CORE_ROLE_DEFS = [
  {
    role: 'CEO',
    nameEnv: 'CORE_ACCOUNT_CEO_FULL_NAME',
    emailEnv: 'CORE_ACCOUNT_CEO_EMAIL',
    passwordEnv: 'CORE_ACCOUNT_CEO_PASSWORD',
    passwordHashEnv: 'CORE_ACCOUNT_CEO_PASSWORD_HASH',
    defaults: { name: 'CEOWebForge', email: 'agustinezequielmoreno@gmail.com', password: 'gerrero.webforge' },
  },
]

const LEGACY_CORE_EMAILS = ['ceo@webforge.local', 'superadmin@webforge.local']

const coreAccountSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(['CEO']),
  password: z.string().min(10).optional(),
  passwordHash: z.string().trim().min(20).optional(),
  usingDefaults: z.boolean().default(false),
})

function getEnvValue(name) {
  const value = String(process.env[name] || '').trim()
  return value || undefined
}

function buildAccountFromEnv(definition) {
  const name = getEnvValue(definition.nameEnv) || definition.defaults.name
  const email = getEnvValue(definition.emailEnv) || definition.defaults.email
  const password = getEnvValue(definition.passwordEnv)
  const passwordHash = getEnvValue(definition.passwordHashEnv)
  const usingDefaults = !password && !passwordHash

  return coreAccountSchema.parse({
    role: definition.role,
    name,
    email,
    password: password || (usingDefaults ? definition.defaults.password : undefined),
    passwordHash,
    usingDefaults,
  })
}

export function loadCoreAccountsSeedFromEnv() {
  const accounts = CORE_ROLE_DEFS.map((definition) => buildAccountFromEnv(definition))

  const emails = new Set()
  for (const account of accounts) {
    const normalizedEmail = account.email.toLowerCase()
    if (emails.has(normalizedEmail)) {
      throw new Error(`Duplicate core account email configured for seed: ${account.email}`)
    }
    emails.add(normalizedEmail)
  }

  return accounts.map((account) => ({
    ...account,
    email: account.email.toLowerCase(),
  }))
}

export async function seedCoreAccounts(accounts) {
  for (const account of accounts) {
    const passwordHash = account.passwordHash || (await bcrypt.hash(account.password, 12))
    const existingAdmins = await prisma.user.findMany({
      where: {
        OR: [
          { email: account.email },
          { email: { in: LEGACY_CORE_EMAILS } },
          { accountType: { in: ['CEO', 'SUPER_ADMIN'] } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    })

    const primaryAdmin = existingAdmins.find((user) => user.email === account.email)
      || existingAdmins.find((user) => user.accountType === 'CEO')
      || existingAdmins[0]

    const duplicateAdmins = primaryAdmin
      ? existingAdmins.filter((user) => user.id !== primaryAdmin.id)
      : []

    if (primaryAdmin || duplicateAdmins.length > 0) {
      const authSecurityFilters = []
      const userIds = [primaryAdmin?.id, ...duplicateAdmins.map((user) => user.id)].filter(Boolean)
      const emails = [primaryAdmin?.email, ...duplicateAdmins.map((user) => user.email)].filter(Boolean)

      if (userIds.length > 0) {
        authSecurityFilters.push({ userId: { in: userIds } })
      }

      if (emails.length > 0) {
        authSecurityFilters.push({ email: { in: emails } })
      }

      if (authSecurityFilters.length > 0) {
        await prisma.authSecurity.deleteMany({ where: { OR: authSecurityFilters } })
      }
    }

    let user = primaryAdmin
    if (!primaryAdmin) {
      user = await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          emailVerifiedAt: new Date(),
          passwordHash,
          accountType: account.role,
          plan: 'NONE',
          status: 'ACTIVE',
          isActive: true,
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: primaryAdmin.id },
        data: {
          name: account.name,
          email: account.email,
          emailVerifiedAt: primaryAdmin.emailVerifiedAt || new Date(),
          passwordHash,
          accountType: account.role,
          status: 'ACTIVE',
          isActive: true,
        },
      })
    }

    if (duplicateAdmins.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: duplicateAdmins.map((admin) => admin.id) } },
      })
    }

    await setMustChangePassword(user.id, user.email, false)

    if (account.usingDefaults) {
      console.warn(
        `[seed] Cuenta ${account.role} sincronizada con credenciales por defecto: ${account.email} / ${account.password}.`,
      )
    }
  }
}

export async function seedCoreAccountsFromEnv() {
  const accounts = loadCoreAccountsSeedFromEnv()
  await seedCoreAccounts(accounts)
}
