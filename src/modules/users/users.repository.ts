import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum';
import { DrizzleService } from '../../database/drizzle.service';
import { users } from '../../database/schema';

const userSelectFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isAvailable: users.isAvailable,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof users.$inferSelect)['role'];
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

  findAll(): Promise<SafeUser[]> {
    return this.drizzleService.db
      .select(userSelectFields)
      .from(users)
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

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isAvailable: boolean;
  }): Promise<SafeUser> {
    return this.drizzleService.db
      .insert(users)
      .values(data)
      .returning(userSelectFields)
      .then((rows) => rows[0]);
  }
}
