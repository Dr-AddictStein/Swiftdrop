import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-api-key'),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    guard = new ApiKeyGuard(
      configService as unknown as ConfigService,
      reflector as unknown as Reflector,
    );
  });

  const createContext = (headers: Record<string, string> = {}) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers }) as FastifyRequest,
      }),
    }) as Parameters<ApiKeyGuard['canActivate']>[0];

  it('allows public routes without an API key', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows requests with a valid API key', () => {
    expect(
      guard.canActivate(createContext({ 'x-api-key': 'test-api-key' })),
    ).toBe(true);
  });

  it('rejects requests with an invalid API key', () => {
    expect(() =>
      guard.canActivate(createContext({ 'x-api-key': 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });
});
