import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum';
import { DrizzleService } from '../../database/drizzle.service';
import { users } from '../../database/schema';

const userSelectFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  companyId: users.companyId,
  isAvailable: users.isAvailable,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof users.$inferSelect)['role'];
  companyId: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  findByEmail(email: string) {
    return this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findAll(companyId?: string): Promise<SafeUser[]> {
    const query = this.drizzleService.db.select(userSelectFields).from(users);

    if (companyId) {
      return query
        .where(eq(users.companyId, companyId))
        .orderBy(users.createdAt);
    }

    return query.orderBy(users.createdAt);
  }

  findAgentsByCompany(companyId: string): Promise<SafeUser[]> {
    return this.drizzleService.db
      .select(userSelectFields)
      .from(users)
      .where(
        and(
          eq(users.companyId, companyId),
          eq(users.role, UserRole.DELIVERY_AGENT),
        ),
      )
      .orderBy(users.createdAt);
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.drizzleService.db
      .select(userSelectFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  updateAvailability(
    id: string,
    isAvailable: boolean,
  ): Promise<SafeUser | null> {
    return this.drizzleService.db
      .update(users)
      .set({ isAvailable })
      .where(eq(users.id, id))
      .returning(userSelectFields)
      .then((rows) => rows[0] ?? null);
  }

  updateCompany(
    id: string,
    companyId: string,
    isAvailable: boolean,
  ): Promise<SafeUser | null> {
    return this.drizzleService.db
      .update(users)
      .set({ companyId, isAvailable })
      .where(eq(users.id, id))
      .returning(userSelectFields)
      .then((rows) => rows[0] ?? null);
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    companyId: string;
    isAvailable: boolean;
  }): Promise<SafeUser> {
    return this.drizzleService.db
      .insert(users)
      .values(data)
      .returning(userSelectFields)
      .then((rows) => rows[0]);
  }
}
