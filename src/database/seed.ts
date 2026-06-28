import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { UserRole } from '../common/enums/user-role.enum';
import * as schema from './schema';
import { users } from './schema';

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
    .values([
      {
        name: 'Admin User',
        email: 'admin@swiftdrop.com',
        passwordHash,
        role: UserRole.ADMIN,
        isAvailable: true,
      },
      {
        name: 'Delivery Agent',
        email: 'agent@swiftdrop.com',
        passwordHash,
        role: UserRole.DELIVERY_AGENT,
        isAvailable: true,
      },
    ])
    .onConflictDoNothing({ target: users.email });

  await pool.end();
  console.log('Seed completed: admin@swiftdrop.com / agent@swiftdrop.com');
  console.log('Default password for both users: password123');
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
