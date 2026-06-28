import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DatabaseError } from 'pg';

interface ResolvedError {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const resolved = this.resolveException(exception);

    if (resolved.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(resolved.statusCode).send({
      statusCode: resolved.statusCode,
      message: resolved.message,
      error: resolved.error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveException(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    if (exception instanceof DatabaseError) {
      return this.resolveDatabaseError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        statusCode,
        message: exceptionResponse,
        error: HttpStatus[statusCode] ?? 'Error',
      };
    }

    const body = exceptionResponse as Record<string, unknown>;
    const message = body.message ?? exception.message;
    const error =
      typeof body.error === 'string'
        ? body.error
        : (HttpStatus[statusCode] ?? 'Error');

    return {
      statusCode,
      message: Array.isArray(message)
        ? message.map(String)
        : String(message),
      error,
    };
  }

  private resolveDatabaseError(exception: DatabaseError): ResolvedError {
    switch (exception.code) {
      case '23505':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with the provided unique value already exists',
          error: 'Conflict',
        };
      case '23503':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced resource does not exist',
          error: 'Bad Request',
        };
      case '23502':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'Bad Request',
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database constraint violation',
          error: 'Bad Request',
        };
    }
  }
}
