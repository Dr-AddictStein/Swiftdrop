import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const mockUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@swiftdrop.com',
    passwordHash: '',
    role: UserRole.ADMIN,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);

    usersRepository = {
      findByEmail: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('returns an access token for valid credentials', async () => {
    usersRepository.findByEmail.mockResolvedValue(mockUser);

    const result = await authService.login({
      email: 'admin@swiftdrop.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect(result.user).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role,
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });
  });

  it('throws when the user is not found', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@swiftdrop.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when the password is invalid', async () => {
    usersRepository.findByEmail.mockResolvedValue(mockUser);

    await expect(
      authService.login({
        email: 'admin@swiftdrop.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
