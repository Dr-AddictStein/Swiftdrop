import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { UserRole } from '../common/enums/user-role.enum';
import * as schema from './schema';
import { companies, users } from './schema';

interface SeedCompany {
  name: string;
  joinCode: string;
  admin: { name: string; email: string };
  agents: Array<{ name: string; email: string }>;
}

const SEED_COMPANIES: SeedCompany[] = [
  {
    name: 'Swiftdrop Logistics',
    joinCode: 'SWIFT1',
    admin: { name: 'Admin User', email: 'admin@swiftdrop.com' },
    agents: [
      { name: 'Delivery Agent', email: 'agent@swiftdrop.com' },
      { name: 'Second Agent', email: 'agent2@swiftdrop.com' },
    ],
  },
  {
    name: 'Metro Couriers',
    joinCode: 'METRO1',
    admin: { name: 'Metro Admin', email: 'admin@metro.com' },
    agents: [{ name: 'Metro Agent', email: 'agent@metro.com' }],
  },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the seed script');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const passwordHash = await bcrypt.hash('password123', 10);

  await db
    .insert(users)
    .values({
      name: 'Platform Super Admin',
      email: 'superadmin@swiftdrop.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      companyId: null,
      isAvailable: true,
    })
    .onConflictDoNothing({ target: users.email });

  for (const company of SEED_COMPANIES) {
    await db
      .insert(companies)
      .values({ name: company.name, joinCode: company.joinCode })
      .onConflictDoNothing({ target: companies.joinCode });

    const [companyRow] = await db
      .select()
      .from(companies)
      .where(eq(companies.joinCode, company.joinCode))
      .limit(1);

    if (!companyRow) {
      continue;
    }

    await db
      .insert(users)
      .values([
        {
          name: company.admin.name,
          email: company.admin.email,
          passwordHash,
          role: UserRole.ADMIN,
          companyId: companyRow.id,
          isAvailable: true,
        },
        ...company.agents.map((agent) => ({
          name: agent.name,
          email: agent.email,
          passwordHash,
          role: UserRole.DELIVERY_AGENT,
          companyId: companyRow.id,
          isAvailable: true,
        })),
      ])
      .onConflictDoNothing({ target: users.email });

    const [adminRow] = await db
      .select()
      .from(users)
      .where(eq(users.email, company.admin.email))
      .limit(1);

    if (adminRow) {
      await db
        .update(companies)
        .set({ ownerId: adminRow.id })
        .where(eq(companies.id, companyRow.id));
    }
  }

  await pool.end();

  console.log('Seed completed. Demo accounts (password: password123):');
  console.log('  Platform super admin: superadmin@swiftdrop.com');
  for (const company of SEED_COMPANIES) {
    console.log(
      `  ${company.name} [join code: ${company.joinCode}] — admin: ${company.admin.email}`,
    );
    for (const agent of company.agents) {
      console.log(`    agent: ${agent.email}`);
    }
  }
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
