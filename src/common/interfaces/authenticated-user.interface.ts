import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}
