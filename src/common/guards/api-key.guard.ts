import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../constants/metadata-keys';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.getOrThrow<string>('apiKey');

    if (typeof apiKey !== 'string' || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
